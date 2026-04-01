// api/notify-enquiry.js
// Called after an enquiry is inserted to notify the provider by email

const { createClient } = require('@supabase/supabase-js');
const { sendEmail, enquiryEmail } = require('./send-email');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = 'https://carevacancy.vercel.app';

const roleLabels = {
  org: 'SIL/SDA Organisation',
  sc: 'Support Coordinator',
  pm: 'Plan Manager',
  allied: 'Allied Health Professional',
  participant: 'Participant',
  family: 'Family / Carer',
};

const dashMap = {
  org:    BASE_URL + '/dashboards/dashboard-org.html',
  sc:     BASE_URL + '/dashboards/dashboard-sc.html',
  pm:     BASE_URL + '/dashboards/dashboard-pm.html',
  allied: BASE_URL + '/dashboards/dashboard-allied.html',
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { enquiryId } = req.body;
  if (!enquiryId) return res.status(400).json({ error: 'Missing enquiryId' });

  try {
    // Get enquiry
    const { data: enq } = await supabase
      .from('enquiries').select('*').eq('id', enquiryId).single();
    if (!enq) return res.status(404).json({ error: 'Enquiry not found' });

    // Get provider (recipient)
    const { data: provider } = await supabase
      .from('profiles').select('full_name, org_name, email, role')
      .eq('id', enq.to_user_id).single();
    if (!provider?.email) return res.status(200).json({ skipped: 'No provider email' });

    // Get sender
    const { data: sender } = await supabase
      .from('profiles').select('full_name, org_name, role')
      .eq('id', enq.from_user_id).single();

    const providerName = provider.org_name || provider.full_name || 'Provider';
    const senderName = sender?.org_name || sender?.full_name || 'Someone';
    const senderRole = roleLabels[sender?.role] || 'CareVacancy user';
    const dashboardUrl = dashMap[provider.role] || BASE_URL;

    await sendEmail({
      to: provider.email,
      subject: `New enquiry: ${enq.subject || 'General enquiry'} — CareVacancy`,
      html: enquiryEmail(providerName, senderName, senderRole, enq.subject, enq.message, enq.contact_preference, dashboardUrl),
    });

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('Enquiry email error:', err);
    return res.status(500).json({ error: err.message });
  }
};