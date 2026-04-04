// api/notify-vacancy-alert.js
// Called when a provider creates an offering post
// Finds participants whose state + disability_types match and emails them

const { createClient } = require('@supabase/supabase-js');
const { sendEmail, emailWrapper } = require('./send-email');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = 'https://carevacancy.vercel.app';

const categoryLabels = {
  sil: 'SIL — Supported Independent Living',
  sda: 'SDA — Specialist Disability Accommodation',
  sc: 'Support Coordination',
  pm: 'Plan Management',
  allied: 'Allied Health',
  'personal-care': 'Personal Care / Support Worker',
  respite: 'Respite / Short Term Accommodation',
  other: 'Other'
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { postId } = req.body;
  if (!postId) return res.status(400).json({ error: 'Missing postId' });

  try {
    // Get the offering post + provider details
    const { data: post } = await supabase
      .from('posts')
      .select('*, profiles!posts_user_id_fkey(id, full_name, org_name, tier, state, suburb)')
      .eq('id', postId)
      .eq('type', 'offering')
      .eq('is_active', true)
      .single();

    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Only send alerts for Featured/Premium providers (quality filter)
    const providerTier = post.profiles?.tier || 'basic';
    if (providerTier === 'basic') {
      return res.status(200).json({ alerted: 0, message: 'Basic tier - no alerts sent' });
    }

    // Find participants + family members whose profiles match
    // Match on: same state (if set) + overlapping disability_types
    let query = supabase
      .from('profiles')
      .select('id, full_name, email, state, disability_types, role')
      .in('role', ['participant', 'family'])
      .eq('status', 'active')
      .not('email', 'is', null);

    // Filter by state if post has one
    if (post.state) {
      query = query.eq('state', post.state);
    }

    const { data: candidates } = await query;

    if (!candidates || candidates.length === 0) {
      return res.status(200).json({ alerted: 0, message: 'No matching participants found' });
    }

    // Score by disability type overlap
    const postDisabilities = post.disability_types || [];
    const matched = candidates
      .filter(p => {
        if (!postDisabilities.length) return true; // no disability filter = matches all
        const profileDisabilities = p.disability_types || [];
        if (!profileDisabilities.length) return true; // participant hasnt set prefs = send to them
        if (postDisabilities.includes('Any') || profileDisabilities.includes('Any')) return true;
        return profileDisabilities.some(d => postDisabilities.includes(d));
      })
      .slice(0, 50); // cap at 50 alerts per post to avoid spam early on

    if (matched.length === 0) {
      return res.status(200).json({ alerted: 0, message: 'No disability type matches' });
    }

    const providerName = post.profiles?.org_name || post.profiles?.full_name || 'A provider';
    const location = [post.suburb, post.state].filter(Boolean).join(', ') || 'your area';
    const categoryLabel = categoryLabels[post.category] || post.category || 'NDIS service';
    const availabilityLabel = post.availability === 'immediate' ? 'Immediate availability' : post.availability === 'waitlist' ? 'Waitlist available' : 'Available soon';
    const tierBadge = providerTier === 'premium' ? '💎 Premium Provider' : '⭐ Featured Provider';

    let emailsSent = 0;

    for (const participant of matched) {
      const firstName = (participant.full_name || 'there').split(' ')[0];

      const html = emailWrapper(`
        <div style="margin-bottom:24px;">
          <div style="display:inline-block;background:#dcfce7;color:#15803d;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;margin-bottom:12px;">🔔 New vacancy alert</div>
          <h1 style="font-size:20px;font-weight:800;color:#0f2942;margin:0 0 8px;">A new vacancy just opened near you</h1>
          <p style="font-size:14px;color:#64748b;margin:0;">A verified ${categoryLabel} provider just posted availability matching your needs</p>
        </div>

        <p style="font-size:14px;color:#475569;line-height:1.7;">Hi ${firstName},</p>
        <p style="font-size:14px;color:#475569;line-height:1.7;">Good news — <strong>${providerName}</strong> just posted a new vacancy on CareVacancy that matches your profile.</p>

        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin:20px 0;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <span style="font-size:11px;font-weight:700;background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:10px;">${tierBadge}</span>
            <span style="font-size:11px;color:#64748b;">✓ Verified provider</span>
          </div>
          <div style="font-size:16px;font-weight:700;color:#0f2942;margin-bottom:6px;">${post.title || categoryLabel + ' vacancy'}</div>
          ${post.description ? `<div style="font-size:13px;color:#475569;line-height:1.6;margin-bottom:10px;">${post.description.slice(0, 150)}${post.description.length > 150 ? '...' : ''}</div>` : ''}
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <span style="font-size:12px;background:#dbeafe;color:#1e40af;padding:3px 10px;border-radius:20px;">${categoryLabel}</span>
            <span style="font-size:12px;background:#f1f5f9;color:#475569;padding:3px 10px;border-radius:20px;">📍 ${location}</span>
            <span style="font-size:12px;background:#dcfce7;color:#15803d;padding:3px 10px;border-radius:20px;">${availabilityLabel}</span>
            ${(post.disability_types || []).slice(0, 2).map(d => `<span style="font-size:12px;background:#f0fdf4;color:#166534;padding:3px 10px;border-radius:20px;">${d}</span>`).join('')}
          </div>
        </div>

        <p style="font-size:14px;color:#475569;line-height:1.7;">Vacancies fill quickly. Log in to CareVacancy to view the full details and send an enquiry directly to this provider.</p>

        <div style="text-align:center;margin:28px 0;">
          <a href="${BASE_URL}/pages/search.html?state=${encodeURIComponent(post.state || '')}&category=${encodeURIComponent(post.category || '')}" style="background:#0d9488;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">View vacancy on CareVacancy →</a>
        </div>

        <p style="font-size:12px;color:#94a3b8;text-align:center;">You're receiving this alert because your profile matches this vacancy. <a href="${BASE_URL}/dashboards/dashboard-participant.html" style="color:#0d9488;">Manage your alert preferences</a></p>
      `);

      await sendEmail({
        to: 'bizeshghi@gmail.com', // temp override until domain verified
        subject: `🔔 New ${categoryLabel} vacancy in ${location} — CareVacancy`,
        html,
      });

      emailsSent++;
    }

    console.log(`Vacancy alerts: ${emailsSent} participants notified for post ${postId}`);
    return res.status(200).json({ matched: matched.length, alerted: emailsSent });

  } catch (err) {
    console.error('Vacancy alert error:', err);
    return res.status(500).json({ error: err.message });
  }
};