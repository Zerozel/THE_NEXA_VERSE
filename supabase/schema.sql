-- ============================================================
-- NEXA v3.0 — Complete Supabase Schema
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── 1. SERVICES ──────────────────────────────────────────────
create table if not exists public.services (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  description  text,
  price        numeric,
  market_price numeric,
  highlight    boolean default false,
  images       text[] default '{}',
  created_at   timestamptz default now()
);

-- Full-text search vector (auto-updated on insert/update)
alter table public.services
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('english',
      coalesce(name, '') || ' ' || coalesce(description, '')
    )
  ) stored;

create index if not exists idx_services_search on public.services using gin(search_vector);
create index if not exists idx_services_highlight on public.services(highlight) where highlight = true;

insert into public.services (name, description, price, highlight, images) values
  ('Electrician',   'Wiring, Repairs & Solar Installations', 2000, true,  '{}'),
  ('Plumber',       'Pipes, Taps & Drainage Fixes',          2500, false, '{}'),
  ('Painter',       'Interior & Exterior Painting',          5000, false, '{}'),
  ('Carpenter',     'Furniture & Roofing Repairs',           3000, false, '{}'),
  ('AC Technician', 'Installation, Service & Gas Refills',   4000, true,  '{}')
on conflict do nothing;


-- ── 2. STORE ITEMS ───────────────────────────────────────────
create table if not exists public.store_items (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  description  text,
  price        numeric not null,
  market_price numeric,
  category     text default 'General',
  highlight    boolean default false,
  images       text[] default '{}',
  created_at   timestamptz default now()
);

alter table public.store_items
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('english',
      coalesce(name, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(category, '')
    )
  ) stored;

create index if not exists idx_items_search    on public.store_items using gin(search_vector);
create index if not exists idx_items_highlight on public.store_items(highlight) where highlight = true;
create index if not exists idx_items_category  on public.store_items(category);

insert into public.store_items (name, description, price, market_price, category, highlight) values
  ('Extension Box 4-Way', '4-socket heavy duty extension', 3500, 4500, 'Electronics', true),
  ('LED Bulb 12W',        'Energy saving, bright white',   800,  null, 'Electronics', false),
  ('Padlock (Standard)',  'Hardened steel, 2 keys',        1500, null, 'Security',    false),
  ('Phone Holder',        'Flexible desk mount',           1200, 1800, 'Accessories', true)
on conflict do nothing;


-- ── 3. PROMOS ────────────────────────────────────────────────
create table if not exists public.promos (
  id         uuid primary key default uuid_generate_v4(),
  title      text not null,
  message    text not null,
  active     boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_promos_active on public.promos(active) where active = true;

insert into public.promos (title, message, active) values
  ('Welcome Offer', 'First booking gets 10% off! Use code NEXA10', true)
on conflict do nothing;


-- ── 4. REVIEWS ───────────────────────────────────────────────
create table if not exists public.reviews (
  id         uuid primary key default uuid_generate_v4(),
  name       text,
  rating     int check (rating >= 0 and rating <= 5),
  comment    text not null,
  created_at timestamptz default now()
);

create index if not exists idx_reviews_rating  on public.reviews(rating desc);
create index if not exists idx_reviews_created on public.reviews(created_at desc);

insert into public.reviews (name, rating, comment) values
  ('Tunde A.',    5, 'Electrician came within 30 minutes. Fixed everything perfectly!'),
  ('Chioma O.',   5, 'Finally a service I can trust on campus. Very professional.'),
  ('Ibrahim K.',  4, 'Good service, painter did a clean job. Will use again.')
on conflict do nothing;


-- ── 5. REQUESTS (bookings + orders) ──────────────────────────
create table if not exists public.requests (
  id         uuid primary key default uuid_generate_v4(),
  item       text not null,
  price      numeric,
  source     text default 'unknown',
  status     text default 'new',  -- new | assigned | in_progress | completed
  agent_code text,
  created_at timestamptz default now()
);

create index if not exists idx_requests_created on public.requests(created_at desc);
create index if not exists idx_requests_status  on public.requests(status);
create index if not exists idx_requests_agent   on public.requests(agent_code) where agent_code is not null;

-- Enable Realtime on requests table (for admin dashboard live notifications)
-- Run this once: ALTER PUBLICATION supabase_realtime ADD TABLE public.requests;


-- ── 6. VISITS (traffic analytics) ────────────────────────────
create table if not exists public.visits (
  id         uuid primary key default uuid_generate_v4(),
  page       text default 'home',
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_visits_created on public.visits(created_at desc);
create index if not exists idx_visits_page    on public.visits(page);


-- ── 7. SETTINGS (key-value CMS config) ───────────────────────
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null default '{}'
);

insert into public.settings (key, value) values
  ('phone',        '{"number": "2347079722171"}'),
  ('hero',         '{"headline": "Tired of Unreliable Artisans?", "subtext": "Get your home fixed. Guaranteed.", "image": ""}'),
  ('service_hero', '{"title": "What do you need fixed today?", "subtext": "Select a service below"}'),
  ('home_titles',  '{"problem": "The Stress is Real", "solution": "Your 3-Step Fix"}')
on conflict (key) do nothing;


-- ── 8. TECHNICIANS ───────────────────────────────────────────
create table if not exists public.technicians (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  skills         text[] default '{}',
  jobs_completed int default 0,
  rating         numeric default 0,
  phone          text,
  active         boolean default true,
  created_at     timestamptz default now()
);

create index if not exists idx_tech_active on public.technicians(active) where active = true;


-- ── 9. AGENTS (referral system) ──────────────────────────────
create table if not exists public.agents (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  referral_code text unique not null,
  jobs_referred int default 0,
  phone         text,
  active        boolean default true,
  created_at    timestamptz default now()
);

-- Link requests to agents
alter table public.requests
  add column if not exists technician_id uuid references public.technicians(id);


-- ── 10. ROW LEVEL SECURITY ───────────────────────────────────
alter table public.services     enable row level security;
alter table public.store_items  enable row level security;
alter table public.promos       enable row level security;
alter table public.reviews      enable row level security;
alter table public.requests     enable row level security;
alter table public.visits       enable row level security;
alter table public.settings     enable row level security;
alter table public.technicians  enable row level security;
alter table public.agents       enable row level security;

-- Public READ
create policy "public_read_services"    on public.services    for select using (true);
create policy "public_read_items"       on public.store_items for select using (true);
create policy "public_read_promos"      on public.promos      for select using (true);
create policy "public_read_reviews"     on public.reviews     for select using (true);
create policy "public_read_settings"    on public.settings    for select using (true);
create policy "public_read_technicians" on public.technicians for select using (active = true);

-- Public WRITE (visitors submit reviews, requests, visits)
create policy "public_insert_reviews"   on public.reviews  for insert with check (true);
create policy "public_insert_requests"  on public.requests for insert with check (true);
create policy "public_insert_visits"    on public.visits   for insert with check (true);

-- Authenticated (admin) FULL ACCESS
create policy "admin_all_services"     on public.services    for all using (auth.role() = 'authenticated');
create policy "admin_all_items"        on public.store_items for all using (auth.role() = 'authenticated');
create policy "admin_all_promos"       on public.promos      for all using (auth.role() = 'authenticated');
create policy "admin_all_reviews"      on public.reviews     for all using (auth.role() = 'authenticated');
create policy "admin_all_requests"     on public.requests    for all using (auth.role() = 'authenticated');
create policy "admin_all_visits"       on public.visits      for all using (auth.role() = 'authenticated');
create policy "admin_all_settings"     on public.settings    for all using (auth.role() = 'authenticated');
create policy "admin_all_technicians"  on public.technicians for all using (auth.role() = 'authenticated');
create policy "admin_all_agents"       on public.agents      for all using (auth.role() = 'authenticated');


-- ── 11. ENABLE REALTIME ──────────────────────────────────────
-- Run this AFTER creating tables to enable live push to admin dashboard:
alter publication supabase_realtime add table public.requests;


-- ── DONE ─────────────────────────────────────────────────────
-- Next steps:
-- 1. Supabase Dashboard → Authentication → Providers → Enable Email/Password
-- 2. Authentication → Users → Add User (your admin email + password)
-- 3. Copy Project URL + Anon Key → paste into .env.local
-- 4. Copy Service Role Key → paste into .env.local (server only)
-- ─────────────────────────────────────────────────────────────
