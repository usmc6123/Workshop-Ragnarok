const { Resend } = require('resend');

let resendInstance = null;

function getResend() {
  if (!resendInstance) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.warn("[WARN] RESEND_API_KEY environment variable is not defined. Emails will fail to send physically.");
    }
    // Lazy initialization of Resend client
    resendInstance = new Resend(key || 'placeholder_key');
  }
  return resendInstance;
}

/**
 * Sends an email using Resend
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Subject of the email
 * @param {string} params.html - HTML body
 */
async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('RESEND_API_KEY environment variable is not configured on the server.');
  }

  const client = getResend();
  const fromEmail = 'mail@homeslab.uk';

  console.log(`[EMAIL] Attempting to send email to ${to} with subject "${subject}"`);
  
  const { data, error } = await client.emails.send({
    from: `Workshop Auto Shop <${fromEmail}>`,
    to: [to],
    subject: subject,
    html: html
  });

  if (error) {
    console.error("[EMAIL] Resend send error:", error);
    throw error;
  }

  console.log("[EMAIL] Resend sent successfully:", data);
  return data;
}

module.exports = {
  sendEmail
};
