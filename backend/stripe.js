const Stripe = require('stripe');

let stripeInstance = null;

function getStripe() {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      console.warn('[WARN] STRIPE_SECRET_KEY environment variable is not defined. Stripe requests will fail.');
    }
    stripeInstance = new Stripe(key || 'placeholder_key');
  }
  return stripeInstance;
}

/**
 * Creates a Stripe Checkout session for a job's invoice total.
 * @param {Object} params
 * @param {number} params.jobId - The job's id, used to build the success/cancel redirect URLs.
 * @param {string} params.customerEmail - The customer's email, pre-fills the Checkout email field.
 * @param {string} params.description - Line item description (vehicle + brief service description).
 * @param {number} params.amountCents - Total invoice amount, in cents.
 * @param {string} params.appBaseUrl - Base URL of the app, used to build redirect URLs back to the job detail page.
 */
async function createCheckoutSession({ jobId, customerEmail, description, amountCents, appBaseUrl }) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not configured on the server.');
  }
  if (!amountCents || amountCents <= 0) {
    throw new Error('Invoice total must be greater than zero to create a checkout session.');
  }

  const stripe = getStripe();
  const jobUrl = `${appBaseUrl.replace(/\/$/, '')}/?view=jobs&jobId=${jobId}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: customerEmail || undefined,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Invoice — ${description}`,
          },
          unit_amount: Math.round(amountCents),
        },
        quantity: 1,
      },
    ],
    success_url: `${jobUrl}&payment=success`,
    cancel_url: `${jobUrl}&payment=cancelled`,
    metadata: {
      job_id: String(jobId),
    },
  });

  return session;
}

module.exports = {
  getStripe,
  createCheckoutSession,
};
