/* ============================================
   CAREVACANCY — AUTH GUARD
   Drop this into every page AFTER supabase.js
   <script src="../js/auth-guard.js"></script>
   ============================================ */

const AuthGuard = {

  // Called on every page load — checks session silently
  async init() {
    // Hide body until auth check done — prevents flicker
    document.body.style.visibility = 'hidden';

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Refresh session if close to expiry
        const expiresAt = session.expires_at * 1000;
        const fiveMin = 5 * 60 * 1000;
        if (Date.now() > expiresAt - fiveMin) {
          await supabase.auth.refreshSession();
        }
      }
    } catch(e) {
      console.error('Auth init error:', e);
    }

    // Show page
    document.body.style.visibility = 'visible';
  },

  // Use on protected pages (dashboards, post, etc)
  // Redirects to login if not authenticated
  async requireAuth() {
    document.body.style.visibility = 'hidden';

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = '/pages/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return null;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    document.body.style.visibility = 'visible';
    return { user, profile };
  },

  // Use on pages only for providers (not participants/family)
  async requireProvider() {
    const result = await this.requireAuth();
    if (!result) return null;

    const { profile } = result;
    if (['participant', 'family'].includes(profile?.role)) {
      window.location.href = '/dashboards/dashboard-participant.html';
      return null;
    }
    return result;
  },

  // Redirect logged-in users away from login/signup pages
  async redirectIfLoggedIn() {
    document.body.style.visibility = 'hidden';

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile) {
        redirectToDashboard(profile.role);
        return;
      }
    }

    document.body.style.visibility = 'visible';
  },

  // Check if user can access a tier feature
  // Shows upgrade modal if not
  async requireTier(feature, requiredTier = 'featured') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single();

    const tierRank = { basic: 0, featured: 1, premium: 2 };
    const userRank = tierRank[profile?.tier || 'basic'];
    const requiredRank = tierRank[requiredTier];

    if (userRank >= requiredRank) return true;

    // Show upgrade modal
    this.showUpgradeModal(requiredTier, profile?.tier);
    return false;
  },

  showUpgradeModal(requiredTier, currentTier) {
    // Remove existing modal if any
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
      <div class="cv-modal-backdrop" onclick="AuthGuard.closeUpgradeModal()"></div>
      <div class="cv-modal-box">
        <button class="cv-modal-close" onclick="AuthGuard.closeUpgradeModal()">✕</button>
        <div class="cv-modal-icon">🔒</div>
        <h2>Upgrade to ${tierLabels[requiredTier]}</h2>
        <p>This feature requires a ${requiredTier} plan. Unlock it along with:</p>
        <ul class="cv-modal-features">
          ${(features[requiredTier] || []).map(f => `<li>✓ ${f}</li>`).join('')}
        </ul>
        <a href="/pages/upgrade.html" class="cv-modal-btn">See upgrade options →</a>
        <button class="cv-modal-cancel" onclick="AuthGuard.closeUpgradeModal()">Maybe later</button>
      </div>
    `;

    // Inject styles if not already there
    if (!document.getElementById('cv-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'cv-modal-styles';
      style.textContent = `
        .cv-modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 9998;
          animation: cvFadeIn 0.2s ease;
        }
        .cv-modal-box {
          position: fixed;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          background: #fff;
          border-radius: 16px;
          padding: 40px 32px;
          max-width: 420px;
          width: 90%;
          z-index: 9999;
          text-align: center;
          animation: cvSlideUp 0.25s ease;
        }
        .cv-modal-close {
          position: absolute; top: 16px; right: 16px;
          background: none; border: none;
          font-size: 1.1rem; cursor: pointer;
          color: #94a3b8; padding: 4px 8px;
        }
        .cv-modal-close:hover { color: #1a1a2e; }
        .cv-modal-icon { font-size: 2.5rem; margin-bottom: 16px; }
        .cv-modal-box h2 { font-size: 1.3rem; font-weight: 800; margin-bottom: 10px; }
        .cv-modal-box p { color: #64748b; font-size: 0.9rem; margin-bottom: 16px; }
        .cv-modal-features {
          list-style: none; padding: 0;
          text-align: left; margin-bottom: 24px;
        }
        .cv-modal-features li {
          padding: 6px 0;
          font-size: 0.88rem;
          color: #166534;
          border-bottom: 1px solid #f1f5f9;
        }
        .cv-modal-btn {
          display: block;
          background: #2563eb; color: #fff;
          padding: 13px; border-radius: 10px;
          text-decoration: none; font-weight: 700;
          margin-bottom: 10px;
          transition: opacity 0.2s;
        }
        .cv-modal-btn:hover { opacity: 0.9; }
        .cv-modal-cancel {
          background: none; border: none;
          color: #94a3b8; font-size: 0.85rem;
          cursor: pointer; padding: 8px;
        }
        .cv-modal-cancel:hover { color: #64748b; }
        @keyframes cvFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cvSlideUp { from { transform: translate(-50%, -48%); opacity: 0; } to { transform: translate(-50%, -50%); opacity: 1; } }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(modal);
  },

  closeUpgradeModal() {
    const modal = document.getElementById('cv-upgrade-modal');
    if (modal) modal.remove();
  },

  // Lock UI elements for users without the right tier
  // Usage: AuthGuard.lockFeatures(userTier)
  lockFeatures(userTier) {
    const tierRank = { basic: 0, featured: 1, premium: 2 };
    const rank = tierRank[userTier || 'basic'];

    // Lock featured-only elements
    if (rank < 1) {
      document.querySelectorAll('[data-requires="featured"]').forEach(el => {
        this.applyLock(el, 'featured');
      });
    }

    // Lock premium-only elements
    if (rank < 2) {
      document.querySelectorAll('[data-requires="premium"]').forEach(el => {
        this.applyLock(el, 'premium');
      });
    }
  },

  applyLock(el, tier) {
    el.style.position = 'relative';
    el.style.pointerEvents = 'none';
    el.style.opacity = '0.5';

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; pointer-events: all; z-index: 10;
      border-radius: inherit;
    `;
    overlay.innerHTML = `<span style="background:#1a1a2e;color:#fff;font-size:0.75rem;font-weight:700;padding:4px 10px;border-radius:20px;">🔒 ${tier === 'featured' ? 'Featured' : 'Premium'}</span>`;
    overlay.onclick = () => this.showUpgradeModal(tier);

    el.style.position = 'relative';
    el.appendChild(overlay);
  },

  // Sign out
  async signOut() {
    await supabase.auth.signOut();
    window.location.href = '/pages/login.html';
  }
};

// Auto-init on every page
AuthGuard.init();
