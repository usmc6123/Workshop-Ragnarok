// --- SMS via Twilio's raw REST API ---
// Deliberately NOT using the official `twilio` npm package here: adding a new
// dependency would touch package-lock.json, which is on the protected files list
// (mirror-first push required, see CLAUDE.md). Twilio's send-message endpoint is a
// plain HTTP POST with Basic Auth, so a bare fetch() call does the exact same job
// with zero new dependencies — matching the same "avoid new deps where possible"
// choice already made for the funnel rate limiter.
//
// Scaffolded ahead of actually having a Twilio account: until TWILIO_ACCOUNT_SID,
// TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are set as environment variables,
// sendSms() just logs (to sms_messages, status='not_configured') and no-ops
// instead of throwing, so nothing else in the app has to change or break while
// SMS is "not set up yet." Once those three env vars are added (after signing up
// for Twilio), every call site that already calls sendSms() starts actually
// sending texts with no further code changes — the Texts page in the UI reads
// from the same sms_messages log this file writes to.

const db = require('./db');

function isSmsConfigured() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

function logSmsAttempt({ to, body, status, errorMessage, meta }) {
  try {
    db.prepare(`
      INSERT INTO sms_messages (customer_id, phone, body, direction, status, error_message, trigger_type, related_job_id, related_appointment_id, related_funnel_id, user_id)
      VALUES (?, ?, ?, 'outbound', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      meta.customerId || null,
      to || '',
      body || '',
      status,
      errorMessage || null,
      meta.triggerType || 'manual',
      meta.jobId || null,
      meta.appointmentId || null,
      meta.funnelId || null,
      meta.userId || null
    );
  } catch (logErr) {
    console.error('[SMS] Failed to log message attempt:', logErr);
  }
}

/**
 * Sends an SMS via Twilio's REST API. Always logs the attempt to sms_messages —
 * including when Twilio isn't configured yet — so the Texts page has real data
 * to show before a Twilio account exists.
 *
 * @param {Object} params
 * @param {string} params.to - Recipient phone number (E.164 format preferred, e.g. +15551234567)
 * @param {string} params.body - Message text
 * @param {Object} [meta] - logging metadata, all optional
 * @param {number} [meta.userId]
 * @param {number} [meta.customerId]
 * @param {'manual'|'appointment_reminder'|'job_complete'|'funnel_confirmation'|'funnel_admin_alert'} [meta.triggerType]
 * @param {number} [meta.jobId]
 * @param {number} [meta.appointmentId]
 * @param {number} [meta.funnelId]
 * @returns {Promise<object|null>} Twilio's response payload, or null if SMS isn't configured/sent.
 */
async function sendSms({ to, body }, meta = {}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log('[SMS] Twilio not configured yet (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER not set) — skipping SMS send.');
    logSmsAttempt({ to, body, status: 'not_configured', errorMessage: 'Twilio credentials are not configured on the server yet.', meta });
    return null;
  }

  if (!to) {
    console.warn('[SMS] No destination phone number provided — skipping SMS send.');
    logSmsAttempt({ to: '', body, status: 'failed', errorMessage: 'No destination phone number provided.', meta });
    return null;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: fromNumber, Body: body });
  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  console.log(`[SMS] Attempting to send SMS to ${to}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg = data.message || `Twilio SMS send failed with status ${response.status}`;
      console.error('[SMS] Twilio send error:', data);
      logSmsAttempt({ to, body, status: 'failed', errorMessage: errMsg, meta });
      const httpError = new Error(errMsg);
      httpError.__smsAlreadyLogged = true;
      throw httpError;
    }

    console.log('[SMS] Twilio sent successfully:', data.sid);
    logSmsAttempt({ to, body, status: 'sent', errorMessage: null, meta });
    return data;
  } catch (err) {
    // Network-level failures (DNS, timeout, etc.) land here too — the branch above
    // already logged HTTP-level failures, so only log here if we haven't yet.
    if (!(err && err.__smsAlreadyLogged)) {
      logSmsAttempt({ to, body, status: 'failed', errorMessage: err.message || 'Unknown SMS send error', meta });
    }
    throw err;
  }
}

module.exports = {
  sendSms,
  isSmsConfigured,
};
