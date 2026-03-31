/* ============================================
   CAREVACANCY — NAV.JS
   Updates nav actions based on auth state
   Works with existing #cv-nav structure
   ============================================ */

async function initNav() {
  const actionsEl = document.getElementById('nav-actions');
  if (!actionsEl) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Logged OUT — show Login + CTA
      actionsEl.innerHTML = `
        <a href="/pages/login.html" class="nav-login-btn">Log in</a>
        <a href="/pages/signup.html" class="nav-cta-btn">List Your Service</a>
      `;
      return;
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tier, full_name, org_name')
      .eq('id', user.id)
      .single();

    if (!profile) return;

    const dashMap = {
      org:         '/dashboards/dashboard-org.html',
      sc:          '/dashboards/dashboard-sc.html',
      pm:          '/dashboards/dashboard-pm.html',
      allied:      '/dashboards/dashboard-allied.html',
      participant: '/dashboards/dashboard-participant.html',
      family:      '/dashboards/dashboard-participant.html',
      admin:       '/dashboards/dashboard-admin.html',
    };

    const dashUrl = dashMap[profile.role] || '/index.html';
    const name = (profile.org_name || profile.full_name || user.email || 'Account').split(' ')[0];
    const tier = profile.tier || 'basic';

    const tierBadge = tier !== 'basic'
      ? `<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;background:${tier === 'premium' ? '#ede9fe' : '#dcfce7'};color:${tier === 'premium' ? '#5b21b6' : '#166534'};">${tier === 'premium' ? '💎' : '⭐'} ${tier.charAt(0).toUpperCase() + tier.slice(1)}</span>`
      : '';

    // Logged IN — show Dashboard + name + logout
    actionsEl.innerHTML = `
      ${tierBadge}
      <a href="${dashUrl}" class="nav-dashboard-btn">Dashboard</a>
      <div style="position:relative;" id="nav-user-menu">
        <button onclick="toggleNavMenu()" style="display:flex;align-items:center;gap:6px;background:none;border:1.5px solid var(--border);border-radius:8px;padding:6px 12px;cursor:pointer;font-family:inherit;font-size:13px;color:var(--navy);">
          ${name} ▾
        </button>
        <div id="nav-user-dropdown" style="display:none;position:absolute;top:calc(100% + 6px);right:0;background:white;border:1px solid var(--border);border-radius:12px;padding:8px;min-width:180px;box-shadow:0 8px 24px rgba(0,0,0,0.1);z-index:200;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);padding:6px 10px 4px;">${profile.role} · ${tier}</div>
          <a href="${dashUrl}" style="display:block;padding:8px 10px;font-size:13px;color:var(--text);text-decoration:none;border-radius:8px;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='none'">My dashboard</a>
          ${tier === 'basic' ? `<a href="/pages/upgrade.html" style="display:block;padding:8px 10px;font-size:13px;color:#2563eb;font-weight:600;text-decoration:none;border-radius:8px;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='none'">⬆ Upgrade plan</a>` : ''}
          ${['org','sc','pm','allied'].includes(profile.role) ? `<a href="/pages/upgrade.html" style="display:block;padding:8px 10px;font-size:13px;color:var(--text);text-decoration:none;border-radius:8px;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='none'">Billing</a>` : ''}
          <hr style="border:none;border-top:1px solid var(--border);margin:4px 0;"/>
          <a href="#" onclick="signOutUser()" style="display:block;padding:8px 10px;font-size:13px;color:#dc2626;text-decoration:none;border-radius:8px;" onmouseover="this.style.background='var(--bg)'" onmouseout="this.style.background='none'">Sign out</a>
        </div>
      </div>
    `;

  } catch(e) {
    console.error('Nav error:', e);
  }
}

function toggleNavMenu() {
  const dd = document.getElementById('nav-user-dropdown');
  if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('#nav-user-menu')) {
    const dd = document.getElementById('nav-user-dropdown');
    if (dd) dd.style.display = 'none';
  }
});

async function signOutUser() {
  await supabase.auth.signOut();
  window.location.href = '/pages/login.html';
}

// Also handle mobile menu toggle if it exists
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (menu) menu.classList.toggle('open');
}

// Run on load
document.addEventListener('DOMContentLoaded', initNav);