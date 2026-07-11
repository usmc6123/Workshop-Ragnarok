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
// sendSms() just logs and no-ops instead of throwing, so nothing else in the app
// has to change or break while SMS is "not set up yet." Once those three env vars
// are added (after signing up for Twilio), every call site that already calls
// sendSms() starts actually sending texts with no further code changes.

function isSmsConfigured() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

/**
 * Sends an SMS via Twilio's REST API.
 * @param {Object} params
 * @param {string} params.to - Recipient phone number (E.164 format preferred, e.g. +15551234567)
 * @param {string} params.body - Message text
 * @returns {Promise<object|null>} Twilio's response payload, or null if SMS isn't configured yet.
 */
async function sendSms({ to, body }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log('[SMS] Twilio not configured yet (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER not set) — skipping SMS send.');
    return null;
  }

  if (!to) {
    console.warn('[SMS] No destination phone number provided — skipping SMS send.');
    return null;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: fromNumber, Body: body });
  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  console.log(`[SMS] Attempting to send SMS to ${to}`);

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
    console.error('[SMS] Twilio send error:', data);
    throw new Error(data.message || `Twilio SMS send failed with status ${response.status}`);
  }

  console.log('[SMS] Twilio sent successfully:', data.sid);
  return data;
}

module.exports = {
  sendSms,
  isSmsConfigured,
};
