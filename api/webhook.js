const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    let rawBody = '';
    await new Promise((resolve, reject) => {
      req.on('data', chunk => { rawBody += chunk; });
      req.on('end', resolve);
      req.on('error', reject);
    });

    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).json({ error: err.message });
  }

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, plan } = session.metadata || {};
      if (!userId || !plan) { console.error('Missing metadata'); break; }

      const { error } = await supabase
        .from('profiles')
        .update({
          tier: plan,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          tier_updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) console.error('Supabase error:', error);
      else console.log('Upgraded', userId, 'to', plan);
      break;
    }

    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const customerId = event.data.object.customer;
      const { data: profile } = await supabase
        .from('profiles').select('id')
        .eq('stripe_customer_id', customerId).single();

      if (profile) {
        await supabase.from('profiles').update({
          tier: 'basic',
          stripe_subscription_id: null,
          tier_updated_at: new Date().toISOString(),
        }).eq('id', profile.id);
        console.log('Reverted', profile.id, 'to basic');
      }
      break;
    }
  }

  return res.status(200).json({ received: true });
};