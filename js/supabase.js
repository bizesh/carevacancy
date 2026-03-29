/* ============================================
   CAREVACANCY — SUPABASE CLIENT
   Single connection used by all pages
   ============================================ */

const SUPABASE_URL = 'https://zanxrugbtowbpbmhsnum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphbnhydWdidG93YnBibWhzbnVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NDM3NDUsImV4cCI6MjA5MDMxOTc0NX0.rvQU77UfJ1NcBPzEEoEUkewmSOBcbDspz80Ul3qYhRw';

const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const db = supabaseClient;
window.supabase = supabaseClient;

// ============================================
// ROLE DEFINITIONS
// ============================================
const ROLES = {
  org:         { label: 'Organisation',          canPost: true,  canReceiveEnquiries: true,  canPostVacancies: true,  isProvider: true,  needsVerification: true  },
  sc:          { label: 'Support Coordinator',   canPost: true,  canReceiveEnquiries: true,  canPostVacancies: false, isProvider: true,  needsVerification: true,  dualMode: true },
  pm:          { label: 'Plan Manager',          canPost: true,  canReceiveEnquiries: true,  canPostVacancies: false, isProvider: true,  needsVerification: true,  dualMode: true },
  allied:      { label: 'Allied Health',         canPost: true,  canReceiveEnquiries: true,  canPostVacancies: false, isProvider: true,  needsVerification: true  },
  participant: { label: 'Participant',           canPost: false, canReceiveEnquiries: false, canPostVacancies: false, isProvider: false, needsVerification: false },
  family:      { label: 'Family / Carer',        canPost: false, canReceiveEnquiries: false, canPostVacancies: false, isProvider: false, needsVerification: false },
  admin:       { label: 'Admin',                 canPost: true,  canReceiveEnquiries: true,  canPostVacancies: true,  isProvider: false, needsVerification: false }
};

// ============================================
// TIER DEFINITIONS
// ============================================
const TIERS = {
  basic: {
    label: 'Basic',
    price: 0,
    canPostVacancies: false,
    canSendEnquiries: false,
    canReceiveEnquiries: false,
    canPostSeeking: false,
    appearsInSearch: true,
    searchRank: 3,
    homepageSlider: false,
    basicAnalytics: false,
    advancedAnalytics: false,
    autoMatch: false,
    suggestions: false,
    vacancyAlerts: false,
    waitlistManagement: false,
    referralSystem: false,
    jobBoard: false,
    availabilityCalendar: false,
    complianceHub: false,
  },
  featured: {
    label: 'Featured',
    price: 49,
    canPostVacancies: true,
    canSendEnquiries: true,
    canReceiveEnquiries: true,
    canPostSeeking: true,
    appearsInSearch: true,
    searchRank: 2,
    homepageSlider: true,
    basicAnalytics: true,
    advancedAnalytics: false,
    autoMatch: false,
    suggestions: true,
    vacancyAlerts: false,
    waitlistManagement: false,
    referralSystem: false,
    jobBoard: true,
    availabilityCalendar: true,
    complianceHub: true,
  },
  premium: {
    label: 'Premium',
    price: 99,
    canPostVacancies: true,
    canSendEnquiries: true,
    canReceiveEnquiries: true,
    canPostSeeking: true,
    appearsInSearch: true,
    searchRank: 1,
    homepageSlider: true,
    homepageSliderPriority: true,
    basicAnalytics: true,
    advancedAnalytics: true,
    autoMatch: true,
    suggestions: true,
    vacancyAlerts: true,
    waitlistManagement: true,
    referralSystem: true,
    jobBoard: true,
    availabilityCalendar: true,
    complianceHub: true,
    marketInsights: true,
  }
};

// ============================================
// AUTH HELPERS
// ============================================

async function getCurrentUser() {
  try {
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) return null;

    const { data: profile } = await db
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return { ...user, profile };
  } catch (e) {
    return null;
  }
}

function canAccess(userTier, feature) {
  const tier = TIERS[userTier] || TIERS.basic;
  return tier[feature] === true;
}

async function requireAuth(redirectTo = '/pages/login.html') {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = redirectTo + '?redirect=' + encodeURIComponent(window.location.pathname);
    return null;
  }
  return user;
}

async function redirectIfLoggedIn() {
  const user = await getCurrentUser();
  if (user && user.profile) {
    redirectToDashboard(user.profile.role);
  }
}

function redirectToDashboard(role) {
  const dashboards = {
    org:         '../dashboards/dashboard-org.html',
    sc:          '../dashboards/dashboard-sc.html',
    pm:          '../dashboards/dashboard-pm.html',
    allied:      '../dashboards/dashboard-allied.html',
    participant: '../dashboards/dashboard-participant.html',
    family:      '../dashboards/dashboard-participant.html',
    admin:       '../dashboards/dashboard-admin.html',
  };
  window.location.href = dashboards[role] || '../pages/search.html';
}

// ============================================
// SECURITY HELPERS
// ============================================

async function checkEmailDomainFlag(email) {
  const domain = email.split('@')[1];
  if (!domain) return false;

  const genericDomains = ['gmail.com','hotmail.com','outlook.com','yahoo.com','icloud.com','me.com'];
  if (genericDomains.includes(domain.toLowerCase())) return false;

  const { data } = await db
    .from('profiles')
    .select('id')
    .eq('email_domain', domain)
    .eq('role', 'org')
    .limit(1);

  return data && data.length > 0;
}

function sanitise(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

function isValidABN(abn) {
  const clean = abn.replace(/\s/g, '');
  return /^\d{11}$/.test(clean);
}

function isValidPhone(phone) {
  const clean = phone.replace(/[\s\-()]/g, '');
  return /^(\+61|0)[2-9]\d{8}$/.test(clean);
}

// ============================================
// EXPORT
// ============================================
window.CV = {
  db, ROLES, TIERS,
  getCurrentUser, canAccess, requireAuth,
  redirectIfLoggedIn, redirectToDashboard,
  checkEmailDomainFlag, sanitise,
  isValidABN, isValidPhone
};