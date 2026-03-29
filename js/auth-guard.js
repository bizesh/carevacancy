/* ============================================
   CAREVACANCY — AUTH GUARD v2
   ============================================ */

const AuthGuard = {

  // Call on PUBLIC pages only (search, provider-profile)
  async init() {
    document.body.style.visibility = 'visible';
  },

  // Call on PROTECTED pages (dashboards, post, upgrade)
  // Returns { user, profile } or redirects to login
  async requireAuth() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/pages/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return null;
      }
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();

      document.body.style.visibility = 'visible';
      return { user, profile };
    } catch(e) {
      console.error('AuthGuard.requireAuth error:', e);
      document.body.style.visibility = 'visible';
      return null;
    }
  },

  // Call on LOGIN and SIGNUP pages only
  // Redirects away if already logged in
  async redirectIfLoggedIn() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('role').eq('id', user.id).single();
        if (profile) {
          redirectToDashboard(profile.role);
          return;
        }
      }
    } catch(e) {}
    document.body.style.visibility = 'visible';
  },

  // Show upgrade modal when basic user hits a locked feature
  showUpgradeModal(requiredTier) {
    const existing = document.getElementById('cv-upgrade-modal');
    if (existing) existing.remove();

    const tierLabels = { featured: 'Featured ($49/mo)', premium: 'Premium ($99/mo)' };
    const features = {
      featured: ['Post vacancies & services', 'Receive direct enquiries', 'Analytics', 'Job board access'],
      premium:  ['Auto-match notifications', 'Vacancy alerts to participants', 'Waitlist management', 'Market insights']
    };

    const modal = document.createElement('div');
    modal.id = 'cv-upgrade-modal';
    modal.innerHTML = `
      <div onclick="AuthGuard.closeUpgradeModal()" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;"></div>
      <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;border-radius:16px;padding:40px 32px;max-width:420px;width:90%;z-index:9999;text-align:center;">
        <button onclick="AuthGuard.closeUpgradeModal()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:1.2rem;cursor:pointer;color:#94a3b8;">✕</button>
        <div style="font-size:2.5rem;margin-bottom:16px;">🔒</div>
        <h2 style="font-size:1.3rem;font-weight:800;margin-bottom:10px;">Upgrade to ${tierLabels[requiredTier]}</h2>
        <p style="color:#64748b;font-size:0.9rem;margin-bottom:16px;">This feature requires a ${requiredTier} plan. Unlock it along with:</p>
        <ul style="list-style:none;padding:0;text-align:left;margin-bottom:24px;">
          ${(features[requiredTier]||[]).map(f=>`<li style="padding:6px 0;font-size:0.88rem;color:#166534;border-bottom:1px solid #f1f5f9;">✓ ${f}</li>`).join('')}
        </ul>
        <a href="/pages/upgrade.html" style="display:block;background:#2563eb;color:#fff;padding:13px;border-radius:10px;text-decoration:none;font-weight:700;margin-bottom:10px;">See upgrade options →</a>
        <button onclick="AuthGuard.closeUpgradeModal()" style="background:none;border:none;color:#94a3b8;font-size:0.85rem;cursor:pointer;padding:8px;">Maybe later</button>
      </div>
    `;
    document.body.appendChild(modal);
  },

  closeUpgradeModal() {
    const m = document.getElementById('cv-upgrade-modal');
    if (m) m.remove();
  },

  // Grey out elements that need a higher tier
  // Add data-requires="featured" or data-requires="premium" to HTML elements
  lockFeatures(userTier) {
    const rank = { basic: 0, featured: 1, premium: 2 };
    const userRank = rank[userTier || 'basic'];

    ['featured', 'premium'].forEach(tier => {
      if (userRank < rank[tier]) {
        document.querySelectorAll(`[data-requires="${tier}"]`).forEach(el => {
          el.style.position = 'relative';
          el.style.pointerEvents = 'none';
          el.style.opacity = '0.45';
          const overlay = document.createElement('div');
          overlay.style.cssText = 'position:absolute;inset:0;cursor:pointer;pointer-events:all;z-index:10;border-radius:inherit;display:flex;align-items:center;justify-content:center;';
          overlay.innerHTML = `<span style="background:#1e293b;color:#fff;font-size:0.72rem;font-weight:700;padding:3px 10px;border-radius:20px;">🔒 ${tier === 'featured' ? 'Featured' : 'Premium'}</span>`;
          overlay.onclick = () => AuthGuard.showUpgradeModal(tier);
          el.appendChild(overlay);
        });
      }
    });
  },

  async signOut() {
    await supabase.auth.signOut();
    window.location.href = '/pages/login.html';
  }
};

// DO NOT auto-run anything here — each page calls what it needs
