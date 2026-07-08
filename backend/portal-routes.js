const express = require('express');
const router = express.Router();
const db = require('./db');

// Helper to compute portal invoice total (only counting approved parts + services)
function computePortalJobInvoiceTotalCents(jobId, userId) {
  const parts = db.prepare('SELECT id, quantity, unit_cost FROM job_parts WHERE job_id = ?').all(jobId);
  const partApprovals = db.prepare(`SELECT line_item_id, status FROM line_item_approvals WHERE job_id = ? AND line_item_type = 'part'`).all(jobId);
  const partApprovalsMap = new Map(partApprovals.map(a => [a.line_item_id, a.status]));

  const approvedPartsCost = parts.reduce((sum, item) => {
    const status = partApprovalsMap.get(item.id) || 'pending';
    if (status !== 'approved') return sum;
    const qty = Math.max(0, parseInt(item.quantity, 10) || 0);
    const cost = Math.max(0, parseFloat(item.unit_cost) || 0);
    return sum + (qty * cost);
  }, 0);

  const services = db.prepare('SELECT id, base_price_charged, additional_hours_cost FROM job_services WHERE job_id = ?').all(jobId);
  const serviceApprovals = db.prepare(`SELECT line_item_id, status FROM line_item_approvals WHERE job_id = ? AND line_item_type = 'service'`).all(jobId);
  const serviceApprovalsMap = new Map(serviceApprovals.map(a => [a.line_item_id, a.status]));

  const approvedServicesCost = services.reduce((sum, item) => {
    const status = serviceApprovalsMap.get(item.id) || 'pending';
    if (status !== 'approved') return sum;
    return sum + (parseFloat(item.base_price_charged) || 0) + (parseFloat(item.additional_hours_cost) || 0);
  }, 0);

  const job = db.prepare('SELECT labor_cost FROM jobs WHERE id = ?').get(jobId);
  const laborCost = job && !isNaN(parseFloat(job.labor_cost)) ? parseFloat(job.labor_cost) : 0;

  const shopSettings = db.prepare('SELECT tax_rate FROM shop_settings WHERE user_id = ?').get(userId);
  const taxRatePercent = shopSettings && !isNaN(parseFloat(shopSettings.tax_rate)) ? parseFloat(shopSettings.tax_rate) : 0;
  
  const taxAmount = (approvedPartsCost + laborCost) * (taxRatePercent / 100);
  const grandTotal = approvedPartsCost + approvedServicesCost + laborCost + taxAmount;
  return Math.round(grandTotal * 100);
}

// GET /api/portal/:token
router.get('/:token', (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(404).json({ error: 'Job not found' });

    // Look up job by token
    const job = db.prepare(`
      SELECT j.*, 
             c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address,
             cv.year as vehicle_year, cv.make as vehicle_make, cv.model as vehicle_model, cv.engine as vehicle_engine, cv.vin as vehicle_vin
      FROM jobs j
      LEFT JOIN customers c ON j.customer_id = c.id
      LEFT JOIN customer_vehicles cv ON j.vehicle_id = cv.id
      WHERE j.portal_token = ?
    `).get(token);

    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Fetch line items
    const parts = db.prepare('SELECT * FROM job_parts WHERE job_id = ?').all(job.id);
    const services = db.prepare('SELECT * FROM job_services WHERE job_id = ?').all(job.id);

    // Fetch approvals
    const approvals = db.prepare('SELECT * FROM line_item_approvals WHERE job_id = ?').all(job.id);
    const approvalsMap = {};
    approvals.forEach(app => {
      approvalsMap[`${app.line_item_type}_${app.line_item_id}`] = app.status;
    });

    // Attach approval status to each part & service
    const partsWithStatus = parts.map(p => ({
      ...p,
      approval_status: approvalsMap[`part_${p.id}`] || 'pending'
    }));

    const servicesWithStatus = services.map(s => ({
      ...s,
      approval_status: approvalsMap[`service_${s.id}`] || 'pending'
    }));

    // Fetch job photos
    const photos = db.prepare('SELECT id, photo_data, caption, photo_type, uploaded_at FROM job_photos WHERE job_id = ?').all(job.id);

    // Fetch shop settings for the owner
    const shopSettings = db.prepare('SELECT * FROM shop_settings WHERE user_id = ?').get(job.user_id) || {};

    res.json({
      job,
      parts: partsWithStatus,
      services: servicesWithStatus,
      photos,
      shopSettings
    });
  } catch (error) {
    console.error('Error in public portal endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/portal/:token/approve
router.post('/:token/approve', (req, res) => {
  try {
    const { token } = req.params;
    const { line_item_type, line_item_id, status } = req.body;

    if (!token) return res.status(404).json({ error: 'Job not found' });
    if (!['part', 'service'].includes(line_item_type)) {
      return res.status(400).json({ error: 'Invalid line_item_type' });
    }
    if (!['approved', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const job = db.prepare('SELECT id FROM jobs WHERE portal_token = ?').get(token);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Insert or replace line item approval
    const stmt = db.prepare(`
      INSERT INTO line_item_approvals (job_id, line_item_type, line_item_id, status, responded_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(job_id, line_item_type, line_item_id) DO UPDATE SET
        status = excluded.status,
        responded_at = excluded.responded_at
    `);
    stmt.run(job.id, line_item_type, line_item_id, status);

    res.json({ success: true, line_item_type, line_item_id, status });
  } catch (error) {
    console.error('Error recording approval:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/portal/:token/create-checkout-session
router.post('/:token/create-checkout-session', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(404).json({ error: 'Job not found' });

    const job = db.prepare(`
      SELECT j.*, c.name as customer_name, c.email as customer_email,
        cv.year as vehicle_year, cv.make as vehicle_make, cv.model as vehicle_model
      FROM jobs j
      LEFT JOIN customers c ON j.customer_id = c.id
      LEFT JOIN customer_vehicles cv ON j.vehicle_id = cv.id
      WHERE j.portal_token = ?
    `).get(token);

    if (!job) return res.status(404).json({ error: 'Job not found' });

    const amountCents = computePortalJobInvoiceTotalCents(job.id, job.user_id);
    if (amountCents <= 0) {
      return res.status(400).json({ error: 'Invoice total must be greater than zero to create a checkout session.' });
    }

    const vehicleDesc = [job.vehicle_year, job.vehicle_make, job.vehicle_model].filter(Boolean).join(' ');
    const description = `${vehicleDesc}${vehicleDesc && job.description ? ' — ' : ''}${job.description || ''}`.trim() || `Ticket #${job.id}`;

    const appBaseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const { createCheckoutSession } = require('./stripe');
    const session = await createCheckoutSession({
      jobId: job.id,
      customerEmail: job.customer_email,
      description,
      amountCents,
      appBaseUrl,
      portalToken: token,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating Stripe checkout session via portal:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
});

module.exports = router;
