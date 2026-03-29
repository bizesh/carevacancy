// api/create-portal.js
// Vercel serverless function — creates a Stripe customer portal session
// Called when provider clicks "Manage billing" in their dashboard

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://carevacancy.vercel.app';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    // Get Stripe customer ID from Supabase
    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, role')
      .eq('id', userId)
      .single();

    if (dbError || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!profile.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Map role to their dashboard for return URL
    const dashMap = {
      org:     '/dashboards/dashboard-org.html',
      sc:      '/dashboards/dashboard-sc.html',
      pm:      '/dashboards/dashboard-pm.html',
      allied:  '/dashboards/dashboard-allied.html',
    };
    const returnPath = dashMap[profile.role] || '/index.html';

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${BASE_URL}${returnPath}`,
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Portal session error:', err);
    return res.status(500).json({ error: err.message });
  }
};
