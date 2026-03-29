/* ============================================
   CAREVACANCY — SUPABASE CLIENT
   Single connection used by all pages
   ============================================ */

// ⚠️  REPLACE THESE WITH YOUR REAL SUPABASE KEYS
// Get them from: supabase.com → your project → Settings → API
const SUPABASE_URL = 'https://zanxrugbtowbpbmhsnum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphbnhydWdidG93YnBibWhzbnVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NDM3NDUsImV4cCI6MjA5MDMxOTc0NX0.rvQU77UfJ1NcBPzEEoEUkewmSOBcbDspz80Ul3qYhRw';

// Load Supabase from CDN
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// ROLE DEFINITIONS
// What each role can and cannot do
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
// What each subscription tier unlocks
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
    searchRank: 3,           // buried
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
    searchRank: 2,           // top of results
    homepageSlider: true,
    basicAnalytics: true,
    advancedAnalytics: false,
    autoMatch: false,
    suggestions: true,       // passive suggestions only
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
    searchRank: 1,           // priority above featured
    homepageSlider: true,
    homepageSliderPriority: true,
    basicAnalytics: true,
    advancedAnalytics: true,
    autoMatch: true,         // active push notifications
    suggestions: true,
    vacancyAlerts: true,     // pushes to matching participants
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

// Get the currently logged in user + their profile
async function getCurrentUser() {
  try {
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) return null;

    // Get their profile from our profiles table
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

// Check if user has access to a specific tier feature
function canAccess(userTier, feature) {
  const tier = TIERS[userTier] || TIERS.basic;
  return tier[feature] === true;
}

// Redirect to login if not authenticated
async function requireAuth(redirectTo = '/pages/login.html') {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = redirectTo + '?redirect=' + encodeURIComponent(window.location.pathname);
    return null;
  }
  return user;
}

// Redirect to dashboard if already logged in
async function redirectIfLoggedIn() {
  const user = await getCurrentUser();
  if (user && user.profile) {
    redirectToDashboard(user.profile.role);
  }
}

// Route user to correct dashboard based on role
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
// Anti-abuse checks
// ============================================

// Check if email domain matches a known provider
// This flags suspicious family/participant signups
async function checkEmailDomainFlag(email) {
  const domain = email.split('@')[1];
  if (!domain) return false;

  // Generic domains are fine
  const genericDomains = ['gmail.com','hotmail.com','outlook.com','yahoo.com','icloud.com','me.com'];
  if (genericDomains.includes(domain.toLowerCase())) return false;

  // Check if this domain is used by an existing provider
  const { data } = await db
    .from('profiles')
    .select('id')
    .eq('email_domain', domain)
    .eq('role', 'org')
    .limit(1);

  return data && data.length > 0;
}

// Sanitise input — strip HTML tags
function sanitise(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

// Validate Australian ABN format (11 digits)
function isValidABN(abn) {
  const clean = abn.replace(/\s/g, '');
  return /^\d{11}$/.test(clean);
}

// Validate Australian phone
function isValidPhone(phone) {
  const clean = phone.replace(/[\s\-()]/g, '');
  return /^(\+61|0)[2-9]\d{8}$/.test(clean);
}

// Export for use in other files
window.CV = {
  db, ROLES, TIERS,
  getCurrentUser, canAccess, requireAuth,
  redirectIfLoggedIn, redirectToDashboard,
  checkEmailDomainFlag, sanitise,
  isValidABN, isValidPhone
};
