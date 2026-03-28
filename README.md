# CareVacancy — Sprint 1 Setup Guide

## What's been built

```
carevacancy/
├── pages/
│   ├── signup.html       ← Role selection + account creation + verification flow
│   └── login.html        ← Login with status checks (pending/rejected/suspended)
├── dashboards/
│   └── dashboard-admin.html  ← Admin verification queue + user management
├── css/
│   ├── global.css        ← All shared styles (change once, updates everywhere)
│   ├── nav.css           ← Navigation styles
│   └── auth.css          ← Signup + login styles
├── js/
│   ├── supabase.js       ← Database connection + ROLES + TIERS config
│   └── nav.js            ← Dynamic nav rendering (logged in/out states)
└── components/
    └── nav.html          ← Nav HTML template
```

## Setup steps (do this before testing)

### Step 1 — Create Supabase account
1. Go to https://supabase.com
2. Create a new project (choose Sydney region)
3. Copy your Project URL and anon key from Settings → API

### Step 2 — Add your Supabase keys
Open `js/supabase.js` and replace:
```
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### Step 3 — Create database tables
Go to Supabase → SQL Editor and run this:

```sql
-- PROFILES TABLE (one row per user)
create table profiles (
  id uuid references auth.users primary key,
  full_name text,
  email text,
  email_domain text,
  org_name text,
  role text not null check (role in ('org','sc','pm','allied','participant','family','admin')),
  status text default 'active' check (status in ('pending','active','rejected','suspended')),
  tier text default 'basic' check (tier in ('basic','featured','premium')),
  abn text,
  ndis_registration text,
  ahpra_number text,
  state text,
  phone text,
  current_mode text default 'search',
  verification_status text default 'unverified',
  verification_notes text,
  rejection_reason text,
  pref_suburb text,
  pref_state text,
  pref_support_types text[],
  created_at timestamptz default now()
);

-- VERIFICATION QUEUE TABLE
create table verification_queue (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  role text,
  org_name text,
  abn text,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  notes text
);

-- ROW LEVEL SECURITY
alter table profiles enable row level security;
alter table verification_queue enable row level security;

-- Users can read/update their own profile
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Admins can see all profiles
create policy "Admins can view all profiles"
  on profiles for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Admins can manage verification queue
create policy "Admins can manage queue"
  on verification_queue for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Users can insert their own queue entry
create policy "Users can insert own queue entry"
  on verification_queue for insert with check (user_id = auth.uid());
```

### Step 4 — Create your admin account
1. Open `pages/signup.html` in your browser
2. Sign up as any role (you'll change it manually)
3. Go to Supabase → Table Editor → profiles
4. Find your row and change `role` to `admin` and `status` to `active`
5. Now you can log in and access `dashboards/dashboard-admin.html`

### Step 5 — Enable Google OAuth (optional)
1. Supabase → Authentication → Providers → Google
2. Follow the setup guide
3. Add your domain to allowed redirect URLs

### Step 6 — Run locally
1. Install VS Code + Live Server extension
2. Open the `carevacancy` folder
3. Click "Go Live" on `index.html`
4. Navigate to `pages/signup.html` to test

### Step 7 — Push to GitHub
```bash
cd carevacancy
git init
git add .
git commit -m "Sprint 1: Auth system, signup, login, admin panel"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### Step 8 — Deploy to Vercel
1. Go to vercel.com → New project → Import from GitHub
2. Select your carevacancy repo
3. Deploy — done. Your site is live with HTTPS.
4. Every `git push` auto-deploys.

## What's coming in Sprint 2
- Posting system (offering + seeking)
- Search page wired to real database
- Provider profiles with real data
- Direct messaging/enquiries
- Participant preference alerts
