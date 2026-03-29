const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  featured: process.env.STRIPE_FEATURED_PRICE_ID,
  premium:  process.env.STRIPE_PREMIUM_PRICE_ID,
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { plan, userId, email, name } = req.body;

  if (!PRICE_IDS[plan]) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      metadata: { userId, plan },
      success_url: 'https://carevacancy.vercel.app/pages/billing-success.html?plan=' + plan,
      cancel_url:  'https://carevacancy.vercel.app/pages/upgrade.html',
    });

    return res.status(200).json({ sessionId: session.id });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

