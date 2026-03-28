/* ============================================
   CAREVACANCY — NAV.JS
   Renders the correct nav for every auth state
   Include on every page
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  await renderNav();
});

async function renderNav() {
  const actionsEl = document.getElementById('nav-actions');
  if (!actionsEl) return;

  const user = await CV.getCurrentUser();

  if (!user || !user.profile) {
    // Logged out nav
    actionsEl.innerHTML = `
      <a href="../pages/login.html" class="nav-login-btn">Log in</a>
      <a href="../pages/signup.html" class="nav-cta-btn">List Your Service</a>
    `;
    return;
  }

  const p = user.profile;
  const initials = getInitials(p.full_name || p.email);
  const roleConfig = CV.ROLES[p.role] || {};

  // Show mode toggle for dual-mode roles (SC and PM)
  const modeToggle = roleConfig.dualMode ? `
    <div class="nav-mode-toggle">
      <button class="mode-btn ${p.current_mode !== 'provider' ? 'active' : ''}"
              onclick="setMode('search')">🔎 Search</button>
      <button class="mode-btn ${p.current_mode === 'provider' ? 'active' : ''}"
              onclick="setMode('provider')">📋 My listing</button>
    </div>
  ` : '';

  actionsEl.innerHTML = `
    ${modeToggle}
    <div class="nav-user-menu">
      <button class="nav-user-btn" onclick="toggleDropdown()">
        <div class="nav-avatar">${initials}</div>
        <span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.full_name || 'My account'}</span>
        <span class="nav-role-badge role-${p.role}">${CV.ROLES[p.role]?.label || p.role}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="nav-dropdown" id="nav-dropdown">
        <div class="nav-dropdown-header">
          <div class="nav-dropdown-name">${p.full_name || 'My account'}</div>
          <div class="nav-dropdown-email">${user.email}</div>
        </div>

        ${p.role !== 'participant' && p.role !== 'family' ? `
          <a href="../dashboards/dashboard-${p.role}.html" class="nav-dropdown-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Dashboard
          </a>
          ${CV.ROLES[p.role]?.canPost ? `
            <a href="../pages/post.html" class="nav-dropdown-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New post
            </a>
          ` : ''}
        ` : `
          <a href="../dashboards/dashboard-participant.html" class="nav-dropdown-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            My searches
          </a>
        `}

        <a href="../pages/account.html" class="nav-dropdown-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Account settings
        </a>

        ${p.role === 'admin' ? `
          <div class="nav-dropdown-divider"></div>
          <a href="../dashboards/dashboard-admin.html" class="nav-dropdown-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Admin panel
          </a>
        ` : ''}

        <div class="nav-dropdown-divider"></div>
        <button class="nav-dropdown-item danger" onclick="signOut()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign out
        </button>
      </div>
    </div>
  `;

  // Highlight active nav link
  highlightActiveLink();
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  return name.slice(0,2).toUpperCase();
}

function toggleDropdown() {
  document.getElementById('nav-dropdown')?.classList.toggle('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-user-menu')) {
    document.getElementById('nav-dropdown')?.classList.remove('open');
  }
});

function toggleMobileMenu() {
  let menu = document.getElementById('nav-mobile-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'nav-mobile-menu';
    menu.className = 'nav-mobile-menu';
    menu.innerHTML = `
      <a href="../pages/search.html">Find a Provider</a>
      <a href="../pages/search.html?type=sil">SIL Vacancies</a>
      <a href="../pages/search.html?type=sc">Support Coordinators</a>
      <a href="../pages/signup.html">For Providers</a>
      <a href="../pages/login.html">Log in</a>
    `;
    document.body.appendChild(menu);
  }
  menu.classList.toggle('open');
}

async function setMode(mode) {
  const user = await CV.getCurrentUser();
  if (!user) return;
  await CV.db.from('profiles').update({ current_mode: mode }).eq('id', user.id);
  window.location.reload();
}

async function signOut() {
  await CV.db.auth.signOut();
  window.location.href = '../index.html';
}

function highlightActiveLink() {
  const current = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') && current.includes(a.getAttribute('href').replace('../', ''))) {
      a.classList.add('active');
    }
  });
}
