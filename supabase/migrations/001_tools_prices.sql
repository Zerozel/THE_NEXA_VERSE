-- ============================================================
-- NEXA Migration 001 — Tools Price Management
-- Run this in Supabase SQL Editor AFTER the main schema.sql
-- ============================================================
-- This migration adds a `service_prices` table so you can manage
-- the Cost Estimator price data from the admin dashboard instead
-- of editing code.
--
-- For now, prices are hardcoded in ToolsClient.tsx (works offline,
-- instant, no DB call). This table is for future admin price editing.
-- ============================================================

create table if not exists public.service_prices (
  id          uuid primary key default uuid_generate_v4(),
  category_id text not null,           -- e.g. 'electrical', 'plumbing'
  category    text not null,           -- Display name: 'Electrical'
  icon_label  text not null,           -- Short badge text: 'ELC'
  item_id     text not null unique,    -- e.g. 'elec-1'
  label       text not null,           -- e.g. 'Power Outage Fixing'
  description text,
  mid_price   numeric not null,        -- Midpoint price (range = mid ±30%)
  min_note    text,                    -- Optional note shown below range
  active      boolean default true,    -- Hide without deleting
  sort_order  int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- RLS
alter table public.service_prices enable row level security;
create policy "public_read_prices"  on public.service_prices for select using (active = true);
create policy "admin_all_prices"    on public.service_prices for all using (auth.role() = 'authenticated');

-- Index for fast category lookups
create index if not exists idx_prices_category on public.service_prices(category_id);
create index if not exists idx_prices_active   on public.service_prices(active) where active = true;

-- Seed with the real NEXA prices
insert into public.service_prices (category_id, category, icon_label, item_id, label, description, mid_price, min_note, sort_order) values
  ('generator','Generator','GEN','gen-1','Changeover Installation','Full manual or automatic changeover switch installation for generator connection.',10000,null,1),
  ('electrical','Electrical','ELC','elec-1','Power Outage Fixing','Tracing and fixing tripped breakers, blown fuses, or faulty wiring causing power outages.',8000,null,1),
  ('electrical','Electrical','ELC','elec-2','Socket, Switch & Lighting Installation','Installing or replacing wall sockets, switches, ceiling lights, or bulb holders.',4000,null,2),
  ('electrical','Electrical','ELC','elec-3','Rewiring or Extension','Running new wire extensions or rewiring a section of an apartment.',12500,null,3),
  ('electrical','Electrical','ELC','elec-4','Ceiling Fan / Chandelier / LED Strip','Mounting and wiring ceiling fans, chandeliers, or LED strip lighting.',8000,null,4),
  ('electrical','Electrical','ELC','elec-5','Electrical Maintenance','General checks: connections, terminals, circuit testing.',3000,'N3,000 upwards depending on scope',5),
  ('electrical','Electrical','ELC','elec-6','Electrical Repair','Diagnosing and fixing faults in existing electrical installations.',3000,'N3,000 upwards depending on fault type',6),
  ('piping','Fresh Piping','PIP','pip-1','Full Conduit Piping','Complete conduit pipe installation for a new apartment.',20000,'N20,000 upwards - rooms and apartment type affect price',1),
  ('piping','Fresh Piping','PIP','pip-2','Half Conduit Piping','Partial conduit installation for renovations or adding circuits.',15000,'N15,000 upwards depending on scope',2),
  ('piping','Fresh Piping','PIP','pip-3','Surface Piping / Trunking','Pipes run on wall surface in PVC trunking.',15000,'N15,000 upwards depending on length and rooms',3),
  ('wiring','Fresh Wiring','WIR','wir-1','Full Conduit Wiring','Complete wiring through conduit for a new build.',20000,'N20,000 upwards - rooms, light points and sockets all affect price',1),
  ('wiring','Fresh Wiring','WIR','wir-2','Half Conduit Wiring','Wiring half the apartment through conduit.',15000,'N15,000 upwards depending on scope',2),
  ('wiring','Fresh Wiring','WIR','wir-3','Surface Wiring','Wires clipped or trunked on wall surface.',12000,'N12,000 upwards depending on length',3),
  ('plumbing','Plumbing','PLM','plm-1','Emergency Burst Pipe / Sudden Leak','Immediate response to burst pipes or sudden leaks.',5000,null,1),
  ('plumbing','Plumbing','PLM','plm-2','Emergency Water Supply Fix','Restoring water supply to a tap, point, or section.',3500,null,2),
  ('plumbing','Plumbing','PLM','plm-3','Water Tank Maintenance','Cleaning and servicing overhead tanks.',7500,null,3),
  ('plumbing','Plumbing','PLM','plm-4','Toilet Repairs','Fixing flush mechanisms, cisterns, broken handles.',10000,'N10,000 and above depending on the fault',4),
  ('plumbing','Plumbing','PLM','plm-5','Clogged Drain / Toilet Blockage','Unblocking drains or toilets. May require opening chambers.',20000,'Can reach N20,000+ if chamber opening is required',5),
  ('plumbing','Plumbing','PLM','plm-6','Leaky Faucet / Dripping Pipe','Fixing worn taps and leaking pipes. Includes replacement fittings.',8500,'Includes cost of replacement parts',6),
  ('carpentry','Carpentry','CAR','car-1','Carpentry Maintenance','Doors, frames, hinges, furniture, shelves.',10000,'N5,000 to N15,000 base range depending on task',1)
on conflict (item_id) do update
  set mid_price = excluded.mid_price,
      label     = excluded.label,
      updated_at = now();

-- Auto-update the updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger service_prices_updated_at
  before update on public.service_prices
  for each row execute function update_updated_at();

-- ============================================================
-- DONE: service_prices table created and seeded.
-- To edit prices: UPDATE service_prices SET mid_price = X WHERE item_id = 'elec-1';
-- The ±30% range is always calculated at display time.
-- ============================================================
