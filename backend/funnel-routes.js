const express = require('express');
const router = express.Router();
const db = require('./db');
const { sendEmail } = require('./email');
const { sendSms } = require('./sms');

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

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// Look up an existing customer for this shop by email or phone (normalized), so
// repeat funnel submissions from the same person attach to their existing CRM
// record instead of spawning duplicate customers. A new vehicle/job is still
// created every time — only the customer record itself is deduplicated.
function findExistingCustomer(userId, email, phone) {
  const targetEmail = normalizeEmail(email);
  const targetPhone = normalizePhone(phone);
  if (!targetEmail && !targetPhone) return null;

  const candidates = db.prepare('SELECT id, phone, email FROM customers WHERE user_id = ?').all(userId);
  return candidates.find(c => {
    const cEmail = normalizeEmail(c.email);
    const cPhone = normalizePhone(c.phone);
    return (targetEmail && cEmail === targetEmail) || (targetPhone && cPhone === targetPhone);
  }) || null;
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
    headline_bg_image_url: funnel.headline_bg_image_url,
    headline_bg_video_url: funnel.headline_bg_video_url,
    headline_bg_video_url_2: funnel.headline_bg_video_url_2,
    secondary_video_url: funnel.secondary_video_url,
    secondary_video_url_2: funnel.secondary_video_url_2,
    hero_video_url: funnel.hero_video_url,
    video_form_bg_image_url: funnel.video_form_bg_image_url,
    media_opacity: funnel.media_opacity,
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

    // --- Find existing customer by email/phone, or create a new one ---
    // Prevents duplicate customer records when the same person submits a funnel
    // more than once; a fresh vehicle + job is still created every submission.
    const existingCustomer = findExistingCustomer(funnel.user_id, email, phone);
    let customerId;
    let isNewCustomer;
    if (existingCustomer) {
      customerId = existingCustomer.id;
      isNewCustomer = false;
    } else {
      const customerInfo = db.prepare(`
        INSERT INTO customers (name, phone, email, address, notes, user_id)
        VALUES (?, ?, ?, NULL, ?, ?)
      `).run(name, phone, email, `Auto-created from "${funnel.headline}" funnel (slug: ${funnel.slug})`, funnel.user_id);
      customerId = customerInfo.lastInsertRowid;
      isNewCustomer = true;
    }

    // --- Find existing vehicle for this customer (same year/make/model), or create one ---
    // Duplicate work orders for the same vehicle are expected (every submission gets
    // its own fresh job) — but the vehicle record itself shouldn't be duplicated if
    // this customer already has that exact vehicle on file.
    let vehicleId = null;
    if (vehicle_year || vehicle_make || vehicle_model) {
      const normalize = (v) => String(v || '').trim().toLowerCase();
      const existingVehicle = db.prepare('SELECT id, year, make, model FROM customer_vehicles WHERE customer_id = ?')
        .all(customerId)
        .find(v =>
          normalize(v.year) === normalize(vehicle_year) &&
          normalize(v.make) === normalize(vehicle_make) &&
          normalize(v.model) === normalize(vehicle_model)
        );

      if (existingVehicle) {
        vehicleId = existingVehicle.id;
      } else {
        const vehicleInfo = db.prepare(`
          INSERT INTO customer_vehicles (customer_id, year, make, model, notes, user_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(customerId, vehicle_year || null, vehicle_make || null, vehicle_model || null, 'Auto-created from funnel lead', funnel.user_id);
        vehicleId = vehicleInfo.lastInsertRowid;
      }
    }

    // --- Auto-create pending Job ---
    // Kept short and clean on purpose: just a fixed "submitted via funnel" line
    // followed by exactly what the customer typed, nothing else folded in.
    const jobDescription = `Service requested: Submitted via funnel\n${message}`;

    const jobInfo = db.prepare(`
      INSERT INTO jobs (customer_id, vehicle_id, description, status, priority, user_id)
      VALUES (?, ?, ?, 'Pending', 'Standard', ?)
    `).run(customerId, vehicleId, jobDescription, funnel.user_id);
    const jobId = jobInfo.lastInsertRowid;

    // --- Link the lead to what it produced ---
    db.prepare(`
      UPDATE funnel_leads SET status = 'converted', customer_id = ?, job_id = ? WHERE id = ?
    `).run(customerId, jobId, leadId);

    // --- Confirmation email (best-effort; a Resend failure shouldn't fail the submission) ---
    const shopSettings = db.prepare('SELECT * FROM shop_settings WHERE user_id = ?').get(funnel.user_id) || {};
    const shopName = shopSettings.shop_name || 'Workshop: Ragnarök';

    try {
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

    // --- Confirmation text (best-effort; no-ops quietly until Twilio env vars are
    // set on the server — see backend/sms.js) ---
    try {
      await sendSms({
        to: phone,
        body: `${shopName}: thanks, ${name.split(' ')[0]}! We got your request${funnel.service_type ? ` for ${funnel.service_type}` : ''} and will follow up shortly.${shopSettings.shop_phone ? ` Questions? Call ${shopSettings.shop_phone}.` : ''}`,
      }, {
        userId: funnel.user_id,
        customerId,
        triggerType: 'funnel_confirmation',
        jobId,
        funnelId: funnel.id,
      });
    } catch (smsErr) {
      console.error('[Funnel] Confirmation SMS failed to send (lead was still captured):', smsErr);
    }

    // --- Internal admin notification (best-effort; separate try/catch so a failure
    // here never blocks the customer's own confirmation email or the response) ---
    if (shopSettings.admin_notification_email) {
      try {
        const vehicleLine = (vehicle_year || vehicle_make || vehicle_model)
          ? `${vehicle_year || ''} ${vehicle_make || ''} ${vehicle_model || ''}`.trim()
          : 'Not provided';
        await sendEmail({
          to: shopSettings.admin_notification_email,
          subject: `New lead: ${name} — ${funnel.headline}`,
          html: `
            <p>New lead came in from your <strong>${funnel.headline}</strong> funnel (${funnel.slug}).</p>
            <p><strong>${isNewCustomer ? 'New customer' : 'Existing customer'}:</strong> ${name}</p>
            <p><strong>Phone:</strong> ${phone}<br/><strong>Email:</strong> ${email}</p>
            <p><strong>Vehicle:</strong> ${vehicleLine}</p>
            <p><strong>What they said:</strong><br/>${message}</p>
            <p>A pending job has already been created for this lead — check the Jobs page.</p>
          `,
        });
      } catch (adminEmailErr) {
        console.error('[Funnel] Admin notification email failed to send (lead was still captured):', adminEmailErr);
      }
    }

    // --- Admin notification text, sent to the shop's own phone number (best-effort;
    // no-ops quietly until Twilio env vars are set — see backend/sms.js) ---
    if (shopSettings.shop_phone) {
      try {
        const vehicleLine = (vehicle_year || vehicle_make || vehicle_model)
          ? `${vehicle_year || ''} ${vehicle_make || ''} ${vehicle_model || ''}`.trim()
          : 'no vehicle info';
        await sendSms({
          to: shopSettings.shop_phone,
          body: `New lead from your "${funnel.headline}" funnel: ${name} (${phone}) — ${vehicleLine}. "${message}"`,
        }, {
          userId: funnel.user_id,
          customerId,
          triggerType: 'funnel_admin_alert',
          jobId,
          funnelId: funnel.id,
        });
      } catch (adminSmsErr) {
        console.error('[Funnel] Admin notification SMS failed to send (lead was still captured):', adminSmsErr);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing funnel submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Compute availability for a date
function getAvailability(funnel, dateStr) {
  const userId = funnel.user_id;

  // 1. Get shop settings
  const shopSettings = db.prepare('SELECT * FROM shop_settings WHERE user_id = ?').get(userId) || {};
  const openTime = shopSettings.booking_open_time || '08:00';
  const closeTime = shopSettings.booking_close_time || '17:00';
  const slotMinutes = shopSettings.booking_slot_minutes || 60;
  const minNoticeHours = shopSettings.booking_min_notice_hours !== undefined ? shopSettings.booking_min_notice_hours : 2;
  const maxConcurrent = shopSettings.booking_max_concurrent !== undefined ? shopSettings.booking_max_concurrent : 1;

  let closedDays = [0]; // Sunday default
  try {
    if (shopSettings.booking_days_closed) {
      closedDays = JSON.parse(shopSettings.booking_days_closed);
    }
  } catch (err) {
    console.error('Error parsing booking_days_closed:', err);
  }

  // 2. Check if date is in closed days or past
  const parts = dateStr.split('-');
  if (parts.length !== 3) return [];
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-based
  const day = parseInt(parts[2], 10);
  const dateObj = new Date(year, month, day);
  const weekday = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.

  if (closedDays.includes(weekday)) {
    return [];
  }

  // 3. Parse open/close times to minutes
  const parseTimeToMin = (tStr) => {
    const [h, m] = (tStr || '00:00').split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const openMin = parseTimeToMin(openTime);
  const closeMin = parseTimeToMin(closeTime);

  if (openMin >= closeMin || slotMinutes <= 0) return [];

  // 4. Generate potential slots
  const potentialSlots = [];
  for (let min = openMin; min + slotMinutes <= closeMin; min += slotMinutes) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    potentialSlots.push({ startMin: min, endMin: min + slotMinutes, time: timeStr });
  }

  // 5. Get existing appointments for this date & user
  const appointments = db.prepare('SELECT time, duration_minutes FROM appointments WHERE user_id = ? AND date = ?').all(userId, dateStr);

  const parsedApps = appointments.map(app => {
    const startMin = parseTimeToMin(app.time);
    const dur = app.duration_minutes || 60;
    return { startMin, endMin: startMin + dur };
  });

  // 6. Filter slots by overlap and notice period
  const now = Date.now();
  const noticeMs = minNoticeHours * 60 * 60 * 1000;

  const availableSlots = potentialSlots.filter(slot => {
    // Check notice period
    const slotDate = new Date(year, month, day, Math.floor(slot.startMin / 60), slot.startMin % 60);
    if (slotDate.getTime() < now + noticeMs) {
      return false;
    }

    // Count overlaps
    let overlapCount = 0;
    for (const app of parsedApps) {
      // Overlap condition: app.start < slot.end && slot.start < app.end
      if (app.startMin < slot.endMin && slot.startMin < app.endMin) {
        overlapCount++;
      }
    }

    return overlapCount < maxConcurrent;
  });

  return availableSlots.map(s => s.time);
}

// GET /api/funnels/:slug/availability - public check of available time slots for a date
router.get('/:slug/availability', (req, res) => {
  try {
    const { slug } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'date query parameter (YYYY-MM-DD) is required' });
    }

    const funnel = db.prepare('SELECT * FROM funnels WHERE slug = ? AND active = 1').get(slug);
    if (!funnel) {
      return res.status(404).json({ error: 'Funnel not found' });
    }

    const slots = getAvailability(funnel, date);
    res.json({ slots });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/funnels/:slug/book - public appointment booking
router.post('/:slug/book', async (req, res) => {
  try {
    const { slug } = req.params;
    const funnel = db.prepare('SELECT * FROM funnels WHERE slug = ? AND active = 1').get(slug);
    if (!funnel) return res.status(404).json({ error: 'Funnel not found' });

    const {
      name, phone, email, vehicle_year, vehicle_make, vehicle_model,
      date, time, notes,
      company_website, // Honeypot
    } = req.body || {};

    const ip = getClientIp(req);

    // Silently swallow bot submissions
    if (company_website && String(company_website).trim() !== '') {
      db.prepare(`
        INSERT INTO funnel_leads (funnel_id, name, phone, email, vehicle_year, vehicle_make, vehicle_model, message, status, ip_address, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'spam', ?, ?)
      `).run(funnel.id, name || null, phone || null, email || null, vehicle_year || null, vehicle_make || null, vehicle_model || null, notes || null, ip, funnel.user_id);
      return res.json({ success: true });
    }

    if (isRateLimited(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    // Validate inputs
    if (!name || !phone || !email || !date || !time) {
      return res.status(400).json({ error: 'name, phone, email, date, and time are required' });
    }
    if (!vehicle_year || !vehicle_make || !vehicle_model) {
      return res.status(400).json({ error: 'vehicle_year, vehicle_make, and vehicle_model are required' });
    }

    // Re-check the requested slot is still available (race-condition guard)
    const availableSlots = getAvailability(funnel, date);
    if (!availableSlots.includes(time)) {
      return res.status(409).json({ error: 'The requested time slot is no longer available. Please select another time.' });
    }

    // Find or create customer
    const existingCustomer = findExistingCustomer(funnel.user_id, email, phone);
    let customerId;
    let isNewCustomer;
    if (existingCustomer) {
      customerId = existingCustomer.id;
      isNewCustomer = false;
    } else {
      const customerInfo = db.prepare(`
        INSERT INTO customers (name, phone, email, address, notes, user_id)
        VALUES (?, ?, ?, NULL, ?, ?)
      `).run(name, phone, email, `Auto-created from "${funnel.headline}" booking funnel`, funnel.user_id);
      customerId = customerInfo.lastInsertRowid;
      isNewCustomer = true;
    }

    // Find or create vehicle
    let vehicleId = null;
    if (vehicle_year || vehicle_make || vehicle_model) {
      const normalize = (v) => String(v || '').trim().toLowerCase();
      const existingVehicle = db.prepare('SELECT id, year, make, model FROM customer_vehicles WHERE customer_id = ?')
        .all(customerId)
        .find(v =>
          normalize(v.year) === normalize(vehicle_year) &&
          normalize(v.make) === normalize(vehicle_make) &&
          normalize(v.model) === normalize(vehicle_model)
        );

      if (existingVehicle) {
        vehicleId = existingVehicle.id;
      } else {
        const vehicleInfo = db.prepare(`
          INSERT INTO customer_vehicles (customer_id, year, make, model, notes, user_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(customerId, vehicle_year, vehicle_make, vehicle_model, 'Auto-created from booking funnel', funnel.user_id);
        vehicleId = vehicleInfo.lastInsertRowid;
      }
    }

    const shopSettings = db.prepare('SELECT * FROM shop_settings WHERE user_id = ?').get(funnel.user_id) || {};
    const bookingSlotMinutes = shopSettings.booking_slot_minutes || 60;

    // Create appointment
    const appInfo = db.prepare(`
      INSERT INTO appointments (title, customer_id, vehicle_id, appointment_type, date, time, duration_minutes, notes, user_id)
      VALUES (?, ?, ?, 'booking', ?, ?, ?, ?, ?)
    `).run(
      `Booking: ${funnel.service_type || funnel.headline}`,
      customerId,
      vehicleId,
      date,
      time,
      bookingSlotMinutes,
      notes || null,
      funnel.user_id
    );
    const appointmentId = appInfo.lastInsertRowid;

    // Record in funnel_leads for analytics and lead list
    const leadMessage = `Booked appointment for ${date} at ${time}. ${notes ? `Notes: ${notes}` : ''}`;
    db.prepare(`
      INSERT INTO funnel_leads (funnel_id, name, phone, email, vehicle_year, vehicle_make, vehicle_model, message, status, ip_address, user_id, customer_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'converted', ?, ?, ?)
    `).run(
      funnel.id, name, phone, email,
      vehicle_year, vehicle_make, vehicle_model,
      leadMessage, ip, funnel.user_id, customerId
    );

    // Confirmation Email/SMS (best-effort)
    const shopName = shopSettings.shop_name || 'Workshop: Ragnarök';

    try {
      const shopPhone = shopSettings.shop_phone ? `<p>You can also reach us at ${shopSettings.shop_phone}.</p>` : '';
      await sendEmail({
        to: email,
        subject: `Your Appointment is Confirmed — ${shopName}`,
        html: `
          <p>Hi ${name},</p>
          <p>Your appointment has been successfully booked at <strong>${shopName}</strong>!</p>
          <p><strong>Appointment Details:</strong><br/>
          📅 <strong>Date:</strong> ${date}<br/>
          ⏰ <strong>Time:</strong> ${time}<br/>
          🚗 <strong>Vehicle:</strong> ${vehicle_year} ${vehicle_make} ${vehicle_model}</p>
          ${notes ? `<p><strong>Notes:</strong><br/>${notes}</p>` : ''}
          ${shopPhone}
          <p>We look forward to seeing you!</p>
          <p>— ${shopName}</p>
        `,
      });
    } catch (emailErr) {
      console.error('[Booking] Confirmation email failed to send:', emailErr);
    }

    try {
      await sendSms({
        to: phone,
        body: `${shopName}: Your appointment is confirmed for ${date} at ${time}. We look forward to seeing you!`,
      }, {
        userId: funnel.user_id,
        customerId,
        triggerType: 'booking_confirmation',
        appointmentId,
        funnelId: funnel.id,
      });
    } catch (smsErr) {
      console.error('[Booking] Confirmation SMS failed to send:', smsErr);
    }

    // Admin Notification (best-effort)
    if (shopSettings.admin_notification_email) {
      try {
        const vehicleLine = `${vehicle_year} ${vehicle_make} ${vehicle_model}`.trim();
        await sendEmail({
          to: shopSettings.admin_notification_email,
          subject: `New Booking: ${name} — ${funnel.headline}`,
          html: `
            <p>A new booking has been confirmed via your <strong>${funnel.headline}</strong> funnel (${funnel.slug}).</p>
            <p><strong>Customer:</strong> ${name}</p>
            <p><strong>Phone:</strong> ${phone}<br/><strong>Email:</strong> ${email}</p>
            <p><strong>Vehicle:</strong> ${vehicleLine}</p>
            <p><strong>Appointment Details:</strong><br/>
            📅 <strong>Date:</strong> ${date}<br/>
            ⏰ <strong>Time:</strong> ${time}</p>
            ${notes ? `<p><strong>Notes:</strong><br/>${notes}</p>` : ''}
            <p>This appointment is now visible on your calendar.</p>
          `,
        });
      } catch (adminEmailErr) {
        console.error('[Booking] Admin email failed to send:', adminEmailErr);
      }
    }

    if (shopSettings.shop_phone) {
      try {
        const vehicleLine = `${vehicle_year} ${vehicle_make} ${vehicle_model}`.trim();
        await sendSms({
          to: shopSettings.shop_phone,
          body: `New Booking! ${name} booked on ${date} at ${time} for ${vehicleLine}.${notes ? ` Notes: ${notes}` : ''}`,
        }, {
          userId: funnel.user_id,
          customerId,
          triggerType: 'funnel_admin_alert',
          appointmentId,
          funnelId: funnel.id,
        });
      } catch (adminSmsErr) {
        console.error('[Booking] Admin SMS failed to send:', adminSmsErr);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
