const express = require('express');
const router = express.Router();
const db = require('./db');

// Public, unauthenticated routes for the Sites website builder — mounted at
// /api/public-sites, deliberately a different base path than the authenticated
// /api/sites CRUD routes in server.js so there's zero risk of an Express route
// ever ambiguously matching both (unlike the funnels router's shared-path trick,
// this is simpler to reason about and just as effective).
//
// Two ways a visitor's browser ends up here:
//   1. Real subdomain (e.g. myportfolio.sites.homeslab.uk) once the one-time
//      wildcard Cloudflare Tunnel route is set up — the frontend reads
//      window.location.hostname and calls resolveBySubdomain().
//   2. Local preview path (/site/:subdomain) for testing a site before DNS/tunnel
//      config is even touched — same resolve endpoint, just reached a different way.

// Small in-memory rate limiter for the public contact-form endpoint, same
// approach as the funnels lead-capture limiter (home-server scale, single
// process, no need for a new dependency).
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_SUBMISSIONS = 5;
const submissionLog = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (submissionLog.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  const limited = timestamps.length >= RATE_LIMIT_MAX_SUBMISSIONS;
  timestamps.push(now);
  submissionLog.set(ip, timestamps);
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

function publicSiteFields(site) {
  return {
    name: site.name,
    subdomain: site.subdomain,
    title: site.title,
    theme: site.theme || 'dark',
    theme_config: site.theme_config || '{}',
    meta_description: site.meta_description || null,
    favicon_url: site.favicon_url || null,
  };
}

function publicBlockFields(block) {
  return {
    id: block.id,
    block_type: block.block_type,
    position: block.position,
    content: block.content,
    media_opacity: block.media_opacity,
    media_transform: block.media_transform || '{}',
    style: block.style || '{}',
  };
}

// Resolves a site + its ordered, published blocks by subdomain. Inactive sites
// 404 exactly like an inactive funnel would — so pausing a site takes it fully
// offline without needing to delete anything.
router.get('/by-subdomain/:subdomain', (req, res) => {
  try {
    const subdomain = String(req.params.subdomain || '').trim().toLowerCase();
    const site = db.prepare('SELECT * FROM sites WHERE subdomain = ? AND active = 1').get(subdomain);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const blocks = db.prepare('SELECT * FROM site_blocks WHERE site_id = ? ORDER BY position ASC, id ASC').all(site.id);

    res.json({
      site: publicSiteFields(site),
      blocks: blocks.map(publicBlockFields),
    });
  } catch (error) {
    console.error('Error resolving public site:', error);
    res.status(500).json({ error: 'Database error resolving site' });
  }
});

// Contact-form submission from a site's public page.
router.post('/:subdomain/message', (req, res) => {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: 'Too many submissions — please try again later.' });
    }

    const subdomain = String(req.params.subdomain || '').trim().toLowerCase();
    const site = db.prepare('SELECT * FROM sites WHERE subdomain = ? AND active = 1').get(subdomain);
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const { name, email, message, company_website, extra_fields } = req.body || {};
    // Honeypot: a real visitor never sees/fills this field. A bot filling every
    // input trips it and gets silently dropped — same pattern as the funnels form.
    if (company_website) {
      return res.json({ success: true });
    }

    const hasExtraFields = extra_fields && typeof extra_fields === 'object' && Object.keys(extra_fields).length > 0;
    if (!hasExtraFields && (!message || !String(message).trim())) {
      return res.status(400).json({ error: 'A message is required.' });
    }

    db.prepare(`
      INSERT INTO site_messages (site_id, name, email, message, extra_fields, ip_address, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(site.id, name || null, email || null, message ? String(message).trim() : null, hasExtraFields ? JSON.stringify(extra_fields) : null, ip, site.user_id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error submitting site message:', error);
    res.status(500).json({ error: 'Database error submitting message' });
  }
});

module.exports = router;
