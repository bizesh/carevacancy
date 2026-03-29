/* ============================================
   CAREVACANCY — SMART NAV
   Auto-renders based on auth state + role
   ============================================ */

async function renderNav() {
  const nav = document.getElementById('nav-placeholder');
  if (!nav) return;

  // Determine base path for links
  const isInSubfolder = window.location.pathname.includes('/pages/') || 
                        window.location.pathname.includes('/dashboards/');
  const base = isInSubfolder ? '..' : '.';

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Logged OUT nav
      nav.innerHTML = `
        <nav class="main-nav">
          <div class="nav-inner">
            <a class="nav-logo" href="${base}/index.html">CareVacancy</a>
            <div class="nav-links">
              <a href="${base}/pages/search.html">Find providers</a>
              <a href="${base}/pages/login.html" class="nav-btn-outline">Log in</a>
              <a href="${base}/pages/signup.html" class="nav-btn-primary">Sign up free</a>
            </div>
            <button class="nav-hamburger" onclick="toggleMobileNav()">☰</button>
          </div>
          <div class="nav-mobile" id="nav-mobile">
            <a href="${base}/pages/search.html">Find providers</a>
            <a href="${base}/pages/login.html">Log in</a>
            <a href="${base}/pages/signup.html">Sign up free</a>
          </div>
        </nav>
      `;
      return;
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tier, full_name, status')
      .eq('id', user.id)
      .single();

    if (!profile) return;

    const dashMap = {
      org:         `${base}/dashboards/dashboard-org.html`,
      sc:          `${base}/dashboards/dashboard-sc.html`,
      pm:          `${base}/dashboards/dashboard-pm.html`,
      allied:      `${base}/dashboards/dashboard-allied.html`,
      participant: `${base}/dashboards/dashboard-participant.html`,
      family:      `${base}/dashboards/dashboard-participant.html`,
      admin:       `${base}/dashboards/dashboard-admin.html`,
    };

    const dashUrl = dashMap[profile.role] || `${base}/index.html`;
    const isProvider = ['org','sc','pm','allied','admin'].includes(profile.role);
    const tier = profile.tier || 'basic';

    const tierBadge = tier !== 'basic' ? `
      <span class="nav-tier-badge nav-tier-${tier}">
        ${tier === 'featured' ? '⭐' : '💎'} ${tier.charAt(0).toUpperCase() + tier.slice(1)}
      </span>` : '';

    // Logged IN nav
    nav.innerHTML = `
      <nav class="main-nav">
        <div class="nav-inner">
          <a class="nav-logo" href="${base}/index.html">CareVacancy</a>
          <div class="nav-links">
            <a href="${base}/pages/search.html">Search</a>
            ${isProvider ? `<a href="${base}/pages/post.html">Post</a>` : ''}
            <a href="${dashUrl}" class="nav-btn-outline">Dashboard</a>
            ${tierBadge}
            <div class="nav-user-menu">
              <button class="nav-avatar" onclick="toggleUserMenu()">
                ${(profile.full_name || user.email || 'U').charAt(0).toUpperCase()}
              </button>
              <div class="nav-dropdown" id="nav-dropdown">
                <div class="nav-dropdown-name">${profile.full_name || user.email}</div>
                <div class="nav-dropdown-role">${profile.role} · ${tier}</div>
                <hr/>
                <a href="${dashUrl}">My dashboard</a>
                ${isProvider && tier === 'basic' ? `<a href="${base}/pages/upgrade.html" style="color:#2563eb;font-weight:600;">⬆ Upgrade plan</a>` : ''}
                ${isProvider ? `<a href="${base}/pages/upgrade.html">Billing</a>` : ''}
                <hr/>
                <a href="#" onclick="AuthGuard.signOut()" style="color:#dc2626;">Sign out</a>
              </div>
            </div>
          </div>
          <button class="nav-hamburger" onclick="toggleMobileNav()">☰</button>
        </div>
        <div class="nav-mobile" id="nav-mobile">
          <a href="${base}/pages/search.html">Search</a>
          ${isProvider ? `<a href="${base}/pages/post.html">Post</a>` : ''}
          <a href="${dashUrl}">Dashboard</a>
          ${isProvider && tier === 'basic' ? `<a href="${base}/pages/upgrade.html">⬆ Upgrade</a>` : ''}
          <a href="#" onclick="AuthGuard.signOut()">Sign out</a>
        </div>
      </nav>
    `;

  } catch(e) {
    console.error('Nav error:', e);
  }
}

function toggleUserMenu() {
  const dd = document.getElementById('nav-dropdown');
  if (dd) dd.classList.toggle('open');
}

function toggleMobileNav() {
  const mn = document.getElementById('nav-mobile');
  if (mn) mn.classList.toggle('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-user-menu')) {
    const dd = document.getElementById('nav-dropdown');
    if (dd) dd.classList.remove('open');
  }
});

// Run on load
document.addEventListener('DOMContentLoaded', renderNav);
