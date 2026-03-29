// api/webhook.js
// Vercel serverless function — listens for Stripe events
// Updates user tier in Supabase on subscription changes

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Use service role key here — bypasses RLS so we can update any user
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Disable body parsing so we can verify Stripe signature
export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(Buffer.from(data)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  // Handle the events we care about
  switch (event.type) {

    // Payment succeeded — upgrade the user
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, plan } = session.metadata;

      if (!userId || !plan) {
        console.error('Missing metadata in checkout session');
        break;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          tier: plan,                          // 'featured' or 'premium'
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          tier_updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Supabase update failed (checkout):', error);
        return res.status(500).json({ error: 'Database update failed' });
      }

      console.log(`✅ Upgraded user ${userId} to ${plan}`);
      break;
    }

    // Subscription cancelled or payment failed — revert to basic
    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const obj = event.data.object;
      const customerId = obj.customer;

      // Find the user by their Stripe customer ID
      const { data: profile, error: findError } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (findError || !profile) {
        console.error('Could not find user for customer:', customerId);
        break;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          tier: 'basic',
          stripe_subscription_id: null,
          tier_updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) {
        console.error('Supabase update failed (cancel):', error);
        return res.status(500).json({ error: 'Database update failed' });
      }

      console.log(`⬇️ Reverted user ${profile.id} to basic`);
      break;
    }

    // Subscription renewed successfully — keep tier, log it
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      if (invoice.billing_reason === 'subscription_create') break; // handled above

      const customerId = invoice.customer;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tier')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        console.log(`🔄 Renewed subscription for user ${profile.id} (${profile.tier})`);
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return res.status(200).json({ received: true });
};
