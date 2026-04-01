// api/notify-approval.js
// Called by admin dashboard when approving or rejecting a provider

const { createClient } = require('@supabase/supabase-js');
const { sendEmail, approvedEmail, rejectedEmail } = require('./send-email');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, action, reason } = req.body;
  if (!userId || !action) return res.status(400).json({ error: 'Missing userId or action' });
  if (!['approved', 'rejected'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

  try {
    const { data: profile } = await supabase
      .from('profiles').select('full_name, org_name, email')
      .eq('id', userId).single();

    if (!profile?.email) return res.status(200).json({ skipped: 'No email found' });

    const name = profile.org_name || profile.full_name || 'Provider';

    await sendEmail({
      to: profile.email,
      subject: action === 'approved'
        ? '🎉 Your CareVacancy account is approved!'
        : 'Your CareVacancy application — update',
      html: action === 'approved'
        ? approvedEmail(name)
        : rejectedEmail(name, reason),
    });

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('Approval email error:', err);
    return res.status(500).json({ error: err.message });
  }
};