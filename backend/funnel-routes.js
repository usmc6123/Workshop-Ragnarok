const express = require('express');
const router = express.Router();
const db = require('./db');
const { sendEmail } = require('./email');

// --- Very small in-memory rate limiter for the public lead-capture endpoint ---
// Home-server scale, single process: no need for a Redis-backed limiter or an
// extra npm dependency (which would touch the protected package-lock.json files).
// Keyed by IP address, sliding window.
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_SUBMISSIONS = 5;
const submissionLog = new Map(); // ip -> array of timestamps (ms)

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (submissionLog.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  const limited = timestamps.length >= RATE_LIMIT_MAX_SUBMISSIONS;
  timestamps.push(now);
  submissionLog.set(ip, timestamps);
  // Opportunistic cleanup so this Map doesn't grow forever on a long-running process
  if (submissionLog.size > 5000) {
    for (const [key, arr] of submissionLog.entries()) {
      if (arr.every(t => now - t >= RATE_LIMIT_WINDOW_MS)) submissionLog.delete(key);
    }
  }
  return limited;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// Fields a funnel page is allowed to expose publicly. Deliberately excludes
// internal bookkeeping columns like user_id.
function publicFunnelFields(funnel) {
  return {
    slug: funnel.slug,
    headline: funnel.headline,
    subheadline: funnel.subheadline,
    body: funnel.body,
    image_url: funnel.image_url,
    video_url: funnel.video_url,
    card_video_url: funnel.card_video_url,
    service_type: funnel.service_type,
    cta_text: funnel.cta_text,
    layout: funnel.layout || 'classic',
  };
}

// GET /api/funnels/:slug - public render of an active funnel's content
router.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const funnel = db.prepare('SELECT * FROM funnels WHERE slug = ? AND active = 1').get(slug);
    if (!funnel) return res.status(404).json({ error: 'Funnel not found' });
    res.json(publicFunnelFields(funnel));
  } catch (error) {
    console.error('Error rendering public funnel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/funnels/:slug/submit - public lead capture, auto-creates Customer + Job
router.post('/:slug/submit', async (req, res) => {
  try {
    const { slug } = req.params;
    const funnel = db.prepare('SELECT * FROM funnels WHERE slug = ? AND active = 1').get(slug);
    if (!funnel) return res.status(404).json({ error: 'Funnel not found' });

    const {
      name, phone, email, message,
      vehicle_year, vehicle_make, vehicle_model,
      // Honeypot: real visitors never see or fill this field (hidden via CSS on the form).
      company_website,
    } = req.body || {};

    const ip = getClientIp(req);

    // Silently swallow bot submissions: record for visibility, but don't create
    // a Customer/Job and don't tip off the bot that anything was rejected.
    if (company_website && String(company_website).trim() !== '') {
      db.prepare(`
        INSERT INTO funnel_leads (funnel_id, name, phone, email, vehicle_year, vehicle_make, vehicle_model, message, status, ip_address, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'spam', ?, ?)
      `).run(funnel.id, name || null, phone || null, email || null, vehicle_year || null, vehicle_make || null, vehicle_model || null, message || null, ip, funnel.user_id);
      return res.json({ success: true });
    }

    if (isRateLimited(ip)) {
      return res.status(429).json({ error: 'Too many submissions. Please try again later.' });
    }

    if (!name || !phone || !email || !message) {
      return res.status(400).json({ error: 'name, phone, email, and message are required' });
    }
    if (!vehicle_year || !vehicle_make || !vehicle_model) {
      return res.status(400).json({ error: 'vehicle_year, vehicle_make, and vehicle_model are required' });
    }

    const leadInsert = db.prepare(`
      INSERT INTO funnel_leads (funnel_id, name, phone, email, vehicle_year, vehicle_make, vehicle_model, message, status, ip_address, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
    `);
    const leadInfo = leadInsert.run(
      funnel.id, name, phone, email,
      vehicle_year || null, vehicle_make || null, vehicle_model || null,
      message, ip, funnel.user_id
    );
    const leadId = leadInfo.lastInsertRowid;

    // --- Auto-create Customer ---
    const customerInfo = db.prepare(`
      INSERT INTO customers (name, phone, email, address, notes, user_id)
      VALUES (?, ?, ?, NULL, ?, ?)
    `).run(name, phone, email, `Auto-created from "${funnel.headline}" funnel (slug: ${funnel.slug})`, funnel.user_id);
    const customerId = customerInfo.lastInsertRowid;

    // --- Auto-create Vehicle, if any vehicle info was submitted ---
    let vehicleId = null;
    if (vehicle_year || vehicle_make || vehicle_model) {
      const vehicleInfo = db.prepare(`
        INSERT INTO customer_vehicles (customer_id, year, make, model, notes, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(customerId, vehicle_year || null, vehicle_make || null, vehicle_model || null, 'Auto-created from funnel lead', funnel.user_id);
      vehicleId = vehicleInfo.lastInsertRowid;
    }

    // --- Auto-create pending Job ---
    const jobDescriptionParts = [];
    if (funnel.service_type) jobDescriptionParts.push(`Service requested: ${funnel.service_type}`);
    jobDescriptionParts.push(`Customer's description: ${message}`);
    jobDescriptionParts.push(`Submitted via funnel "${funnel.headline}" (${funnel.slug}).`);

    const jobInfo = db.prepare(`
      INSERT INTO jobs (customer_id, vehicle_id, description, status, priority, user_id)
      VALUES (?, ?, ?, 'Pending', 'Standard', ?)
    `).run(customerId, vehicleId, jobDescriptionParts.join('\n'), funnel.user_id);
    const jobId = jobInfo.lastInsertRowid;

    // --- Link the lead to what it produced ---
    db.prepare(`
      UPDATE funnel_leads SET status = 'converted', customer_id = ?, job_id = ? WHERE id = ?
    `).run(customerId, jobId, leadId);

    // --- Confirmation email (best-effort; a Resend failure shouldn't fail the submission) ---
    try {
      const shopSettings = db.prepare('SELECT * FROM shop_settings WHERE user_id = ?').get(funnel.user_id) || {};
      const shopName = shopSettings.shop_name || 'Workshop: Ragnarök';
      const shopPhone = shopSettings.shop_phone ? `<p>You can also reach us at ${shopSettings.shop_phone}.</p>` : '';
      await sendEmail({
        to: email,
        subject: `We got your request — ${shopName}`,
        html: `
          <p>Hi ${name},</p>
          <p>Thanks for reaching out to ${shopName}! We received your request${funnel.service_type ? ` for <strong>${funnel.service_type}</strong>` : ''} and a member of our team will follow up with you shortly at ${phone}.</p>
          <p><strong>What you told us:</strong><br/>${message}</p>
          ${shopPhone}
          <p>— ${shopName}</p>
        `,
      });
    } catch (emailErr) {
      console.error('[Funnel] Confirmation email failed to send (lead was still captured):', emailErr);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing funnel submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
