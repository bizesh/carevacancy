// api/auto-match.js
// Called when a seeking post is created
// Finds matching Premium providers and notifies them by email

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

const dashMap = {
  org:    BASE_URL + '/dashboards/dashboard-org.html',
  sc:     BASE_URL + '/dashboards/dashboard-sc.html',
  pm:     BASE_URL + '/dashboards/dashboard-pm.html',
  allied: BASE_URL + '/dashboards/dashboard-allied.html',
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { postId } = req.body;
  if (!postId) return res.status(400).json({ error: 'Missing postId' });

  try {
    // Get the seeking post
    const { data: seekingPost } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .eq('type', 'seeking')
      .eq('is_active', true)
      .single();

    if (!seekingPost) return res.status(404).json({ error: 'Post not found' });

    // Find matching offering posts from Premium providers
    // Match on: same category + same state (if specified) + overlapping disability types
    let query = supabase
      .from('posts')
      .select('*, profiles!posts_user_id_fkey(id, full_name, org_name, email, role, tier)')
      .eq('type', 'offering')
      .eq('is_active', true)
      .eq('category', seekingPost.category);

    // Filter by state if seeking post has one
    if (seekingPost.state) {
      query = query.eq('state', seekingPost.state);
    }

    const { data: matchingPosts } = await query;

    if (!matchingPosts || matchingPosts.length === 0) {
      return res.status(200).json({ matched: 0, message: 'No matches found' });
    }

    // Filter to Premium providers only + score by disability type overlap
    const scored = matchingPosts
      .filter(post => post.profiles?.tier === 'premium' && post.profiles?.email)
      .map(post => {
        let score = 1; // base score for category + state match

        // Bonus for disability type overlap
        const seekDisabilities = seekingPost.disability_types || [];
        const offerDisabilities = post.disability_types || [];

        if (seekDisabilities.includes('Any') || offerDisabilities.includes('Any')) {
          score += 3; // any = full match
        } else {
          const overlap = seekDisabilities.filter(d => offerDisabilities.includes(d));
          score += overlap.length;
        }

        // Bonus for support level match
        if (seekingPost.support_level && seekingPost.support_level !== 'any' &&
            post.support_level === seekingPost.support_level) {
          score += 2;
        }

        return { ...post, matchScore: score };
      })
      .filter(post => post.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    if (scored.length === 0) {
      return res.status(200).json({ matched: 0, message: 'No Premium provider matches' });
    }

    // Deduplicate by provider (one email per provider even if multiple posts match)
    const notifiedProviders = new Set();
    let emailsSent = 0;

    for (const match of scored) {
      const providerId = match.profiles?.id;
      if (!providerId || notifiedProviders.has(providerId)) continue;
      notifiedProviders.add(providerId);

      const providerName = match.profiles.org_name || match.profiles.full_name || 'Provider';
      const dashboardUrl = dashMap[match.profiles.role] || BASE_URL;

      const html = emailWrapper(`
        <div style="margin-bottom:24px;">
          <div style="display:inline-block;background:#ede9fe;color:#5b21b6;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;margin-bottom:12px;">💎 Premium match alert</div>
          <h1 style="font-size:20px;font-weight:800;color:#0f2942;margin:0 0 8px;">Someone is looking for your service</h1>
          <p style="font-size:14px;color:#64748b;margin:0;">A new seeking post matches your offering on CareVacancy</p>
        </div>

        <p style="font-size:14px;color:#475569;line-height:1.7;">Hi ${providerName},</p>
        <p style="font-size:14px;color:#475569;line-height:1.7;">A support coordinator, plan manager or participant just posted that they're looking for <strong>${categoryLabels[seekingPost.category] || seekingPost.category}</strong>${seekingPost.state ? ` in ${seekingPost.state}` : ''} — which matches your current offering.</p>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:20px 0;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;margin-bottom:8px;">What they need</div>
          <div style="font-size:15px;font-weight:600;color:#0f2942;margin-bottom:6px;">${seekingPost.title}</div>
          ${seekingPost.description ? `<div style="font-size:13px;color:#475569;line-height:1.6;margin-bottom:10px;">${seekingPost.description}</div>` : ''}
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <span style="font-size:12px;background:#dbeafe;color:#1e40af;padding:3px 10px;border-radius:20px;">${categoryLabels[seekingPost.category] || seekingPost.category}</span>
            ${seekingPost.state ? `<span style="font-size:12px;background:#f1f5f9;color:#475569;padding:3px 10px;border-radius:20px;">📍 ${seekingPost.state}</span>` : ''}
            ${seekingPost.support_level && seekingPost.support_level !== 'any' ? `<span style="font-size:12px;background:#f1f5f9;color:#475569;padding:3px 10px;border-radius:20px;">Support: ${seekingPost.support_level}</span>` : ''}
            ${(seekingPost.disability_types || []).slice(0,3).map(d => `<span style="font-size:12px;background:#f0fdf4;color:#166534;padding:3px 10px;border-radius:20px;">${d}</span>`).join('')}
          </div>
        </div>

        <p style="font-size:14px;color:#475569;line-height:1.7;">Log in to your dashboard to view and respond to this match. Act quickly — other providers may also be notified.</p>

        <div style="text-align:center;margin:28px 0;">
          <a href="${dashboardUrl}" style="background:#7c3aed;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">View match in dashboard →</a>
        </div>
        <p style="font-size:12px;color:#94a3b8;text-align:center;">You're receiving this because you're a Premium provider. These alerts are exclusive to Premium members.</p>
      `);

      await sendEmail({
        to: 'bizeshghi@gmail.com', // temp override - change to match.profiles.email when domain verified
        subject: `💎 New match: Someone needs ${categoryLabels[seekingPost.category] || seekingPost.category} in ${seekingPost.state || 'your area'}`,
        html,
      });

      emailsSent++;
    }

    console.log(`Auto-match: ${emailsSent} providers notified for post ${postId}`);
    return res.status(200).json({ matched: scored.length, notified: emailsSent });

  } catch (err) {
    console.error('Auto-match error:', err);
    return res.status(500).json({ error: err.message });
  }
};