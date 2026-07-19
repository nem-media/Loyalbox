-- ============================================================================
-- LoyalBox — Stempelkort & belønninger (Loyalty-modul)
-- ============================================================================
-- Bygger oven på 0001-0003. Org = companies. Reads via RLS (ejer/admin);
-- transaktionelle writes sker via service-role i server actions efter app-
-- validering — samme mønster som scans/feedback.
--
-- Kør i Supabase SQL-editoren eller via `supabase db push`.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin create type loyalty_program_status as enum ('draft','active','paused','archived'); exception when duplicate_object then null; end $$;
do $$ begin create type loyalty_earn_model as enum ('per_purchase','per_visit','per_amount','manual','campaign'); exception when duplicate_object then null; end $$;
do $$ begin create type loyalty_reward_type as enum ('free_product','amount_off','percent_off','service','gift','custom','none'); exception when duplicate_object then null; end $$;
do $$ begin create type loyalty_reward_status as enum ('available','redeemed','expired','revoked'); exception when duplicate_object then null; end $$;
do $$ begin create type loyalty_txn_type as enum (
  'stamp_earned','stamp_manual','stamp_removed','bonus_stamp','adjustment',
  'reward_earned','reward_redeemed','discount_granted','discount_redeemed',
  'reversed','card_reset','stamp_expired'
); exception when duplicate_object then null; end $$;
do $$ begin create type loyalty_txn_source as enum ('staff','qr','nfc','import','system','feedback_recovery'); exception when duplicate_object then null; end $$;
do $$ begin create type membership_status as enum ('active','paused','blocked'); exception when duplicate_object then null; end $$;
do $$ begin create type discount_type as enum ('fixed_amount','percent','free_product','bxgy','special','birthday','welcome','comeback','compensation','vip'); exception when duplicate_object then null; end $$;
do $$ begin create type discount_status as enum ('draft','active','paused','archived'); exception when duplicate_object then null; end $$;
do $$ begin create type customer_discount_status as enum ('available','redeemed','expired','revoked'); exception when duplicate_object then null; end $$;
do $$ begin create type consent_type as enum ('terms','marketing'); exception when duplicate_object then null; end $$;
do $$ begin create type campaign_status as enum ('draft','active','paused','archived'); exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- locations (valgfrit; program/txn kan referere en lokation)
-- ---------------------------------------------------------------------------
create table if not exists public.locations (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name       text not null,
  address    text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists locations_company_id_idx on public.locations(company_id);

-- ---------------------------------------------------------------------------
-- employees (permission-flag; user_id valgfri til fremtidig medarbejder-login)
-- ---------------------------------------------------------------------------
create table if not exists public.employees (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  user_id      uuid references public.users(id) on delete set null,
  name         text not null,
  email        text,
  is_active    boolean not null default true,
  can_stamp    boolean not null default true,
  can_discount boolean not null default false,
  can_redeem   boolean not null default true,
  can_manage   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists employees_company_id_idx on public.employees(company_id);
create unique index if not exists employees_user_company_idx on public.employees(company_id, user_id) where user_id is not null;

-- ---------------------------------------------------------------------------
-- loyalty_programs (stempelkort)
-- ---------------------------------------------------------------------------
create table if not exists public.loyalty_programs (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  location_id   uuid references public.locations(id) on delete set null,
  name          text not null,
  internal_name text,
  description   text,
  status        loyalty_program_status not null default 'draft',
  earn_model    loyalty_earn_model not null default 'per_purchase',
  stamps_per_earn  int not null default 1 check (stamps_per_earn >= 1),
  amount_per_stamp numeric(10,2),          -- til per_amount (fx 100 kr / stempel)
  start_date    date,
  end_date      date,
  -- belønnings-cyklus
  reset_on_redeem boolean not null default true,
  keep_overflow   boolean not null default false,
  -- design
  color       text default '#19375c',
  background  text,
  icon        text default 'star',
  card_text   text,
  logo_url    text,
  -- regler / sikkerhed
  max_stamps_per_txn   int not null default 1 check (max_stamps_per_txn >= 1),
  max_stamps_per_day   int,
  min_minutes_between  int not null default 0,
  require_staff_confirm boolean not null default true,
  require_presence      boolean not null default false,
  require_pin           boolean not null default false,
  require_member_qr     boolean not null default false,
  require_location      boolean not null default false,
  stamps_expire         boolean not null default false,
  stamp_expiry_days     int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists loyalty_programs_company_id_idx on public.loyalty_programs(company_id);
create index if not exists loyalty_programs_status_idx on public.loyalty_programs(status);

-- ---------------------------------------------------------------------------
-- loyalty_rewards (belønningsdefinition; primær + evt. kampagne)
-- ---------------------------------------------------------------------------
create table if not exists public.loyalty_rewards (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  program_id     uuid not null references public.loyalty_programs(id) on delete cascade,
  name           text not null,
  description    text,
  image_url      text,
  type           loyalty_reward_type not null default 'free_product',
  value          numeric(10,2),
  required_stamps int not null default 10 check (required_stamps >= 1),
  validity_days  int,
  is_primary     boolean not null default true,
  is_campaign    boolean not null default false,
  terms          text,
  status         loyalty_program_status not null default 'active',
  created_at     timestamptz not null default now()
);
create index if not exists loyalty_rewards_program_id_idx on public.loyalty_rewards(program_id);
create index if not exists loyalty_rewards_company_id_idx on public.loyalty_rewards(company_id);

-- ---------------------------------------------------------------------------
-- loyalty_members (butikkens slutkunder — company-scoped, ikke app-konti)
-- ---------------------------------------------------------------------------
create table if not exists public.loyalty_members (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  name            text,
  email           text,
  phone           text,
  customer_number text,
  public_token    text not null unique default encode(gen_random_bytes(16),'hex'),
  created_at      timestamptz not null default now()
);
create index if not exists loyalty_members_company_id_idx on public.loyalty_members(company_id);
create index if not exists loyalty_members_email_idx on public.loyalty_members(company_id, email);
create index if not exists loyalty_members_phone_idx on public.loyalty_members(company_id, phone);

-- ---------------------------------------------------------------------------
-- loyalty_memberships (medlem ↔ program)
-- ---------------------------------------------------------------------------
create table if not exists public.loyalty_memberships (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  program_id   uuid not null references public.loyalty_programs(id) on delete cascade,
  member_id    uuid not null references public.loyalty_members(id) on delete cascade,
  status       membership_status not null default 'active',
  balance_cache int not null default 0,   -- cache; kan genberegnes via loyalty_balance()
  enrolled_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (program_id, member_id)
);
create index if not exists loyalty_memberships_member_idx on public.loyalty_memberships(member_id);
create index if not exists loyalty_memberships_program_idx on public.loyalty_memberships(program_id);

-- ---------------------------------------------------------------------------
-- discounts (genbrugelig rabatdefinition) — før transactions pga. FK
-- ---------------------------------------------------------------------------
create table if not exists public.discounts (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  name             text not null,
  description      text,
  type             discount_type not null default 'percent',
  value            numeric(10,2) not null default 0,
  start_date       date,
  end_date         date,
  weekdays         int[],            -- 0=søndag .. 6=lørdag
  time_start       time,
  time_end         time,
  min_purchase     numeric(10,2),
  max_discount     numeric(10,2),
  per_customer_limit int,
  total_limit      int,
  combinable       boolean not null default false,
  requires_approval boolean not null default false,
  status           discount_status not null default 'active',
  created_at       timestamptz not null default now()
);
create index if not exists discounts_company_id_idx on public.discounts(company_id);
create index if not exists discounts_status_idx on public.discounts(status);

-- ---------------------------------------------------------------------------
-- loyalty_transactions (UFORANDERLIG ledger)
-- ---------------------------------------------------------------------------
create table if not exists public.loyalty_transactions (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  location_id   uuid references public.locations(id) on delete set null,
  program_id    uuid not null references public.loyalty_programs(id) on delete cascade,
  membership_id uuid references public.loyalty_memberships(id) on delete cascade,
  member_id     uuid references public.loyalty_members(id) on delete cascade,
  employee_id   uuid references public.employees(id) on delete set null,
  type          loyalty_txn_type not null,
  stamps        int not null default 0,       -- kan være negativ (reset/reversering)
  amount        numeric(10,2),
  currency      text not null default 'DKK',
  source        loyalty_txn_source not null default 'staff',
  reference     text,                          -- idempotens-/kvitteringsreference
  device        text,
  note          text,
  reason        text,
  reversal_of   uuid references public.loyalty_transactions(id) on delete set null,
  reward_id     uuid references public.loyalty_rewards(id) on delete set null,
  discount_id   uuid references public.discounts(id) on delete set null,
  feedback_id   uuid references public.feedback(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists loyalty_txn_membership_idx on public.loyalty_transactions(membership_id);
create index if not exists loyalty_txn_company_idx on public.loyalty_transactions(company_id);
create index if not exists loyalty_txn_member_idx on public.loyalty_transactions(member_id);
create index if not exists loyalty_txn_created_idx on public.loyalty_transactions(created_at);
-- Idempotens: samme reference må kun bruges én gang pr. medlemskab.
create unique index if not exists loyalty_txn_ref_idx on public.loyalty_transactions(membership_id, reference) where reference is not null;

-- ---------------------------------------------------------------------------
-- customer_rewards (optjent belønning pr. medlem)
-- ---------------------------------------------------------------------------
create table if not exists public.customer_rewards (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  program_id    uuid not null references public.loyalty_programs(id) on delete cascade,
  membership_id uuid not null references public.loyalty_memberships(id) on delete cascade,
  member_id     uuid not null references public.loyalty_members(id) on delete cascade,
  reward_id     uuid not null references public.loyalty_rewards(id) on delete cascade,
  status        loyalty_reward_status not null default 'available',
  earned_at     timestamptz not null default now(),
  expires_at    timestamptz,
  redeemed_at   timestamptz,
  redeemed_by   uuid references public.employees(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists customer_rewards_membership_idx on public.customer_rewards(membership_id);
create index if not exists customer_rewards_member_idx on public.customer_rewards(member_id);
create index if not exists customer_rewards_status_idx on public.customer_rewards(status);

-- ---------------------------------------------------------------------------
-- customer_discounts (konkret tildelt rabat)
-- ---------------------------------------------------------------------------
create table if not exists public.customer_discounts (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  member_id   uuid not null references public.loyalty_members(id) on delete cascade,
  discount_id uuid not null references public.discounts(id) on delete cascade,
  status      customer_discount_status not null default 'available',
  granted_at  timestamptz not null default now(),
  granted_by  uuid references public.employees(id) on delete set null,
  expires_at  timestamptz,
  redeemed_at timestamptz,
  feedback_id uuid references public.feedback(id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists customer_discounts_member_idx on public.customer_discounts(member_id);
create index if not exists customer_discounts_status_idx on public.customer_discounts(status);

-- ---------------------------------------------------------------------------
-- campaigns (let kampagne-entitet)
-- ---------------------------------------------------------------------------
create table if not exists public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  program_id  uuid references public.loyalty_programs(id) on delete set null,
  name        text not null,
  description text,
  type        text,
  start_date  date,
  end_date    date,
  config      jsonb not null default '{}'::jsonb,
  status      campaign_status not null default 'draft',
  created_at  timestamptz not null default now()
);
create index if not exists campaigns_company_id_idx on public.campaigns(company_id);

-- ---------------------------------------------------------------------------
-- consent_records (samtykke-dokumentation)
-- ---------------------------------------------------------------------------
create table if not exists public.consent_records (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  member_id    uuid not null references public.loyalty_members(id) on delete cascade,
  type         consent_type not null,
  text_version text,
  granted      boolean not null default true,
  channel      text,
  source       text,
  ip           text,
  meta         jsonb not null default '{}'::jsonb,
  granted_at   timestamptz not null default now(),
  withdrawn_at timestamptz
);
create index if not exists consent_member_idx on public.consent_records(member_id);

-- ---------------------------------------------------------------------------
-- loyalty_audit_log (revisions-/sikkerhedslog)
-- ---------------------------------------------------------------------------
create table if not exists public.loyalty_audit_log (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  actor_user_id    uuid references public.users(id) on delete set null,
  actor_employee_id uuid references public.employees(id) on delete set null,
  action           text not null,
  target_type      text,
  target_id        uuid,
  meta             jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists loyalty_audit_company_idx on public.loyalty_audit_log(company_id);

-- ---------------------------------------------------------------------------
-- Saldo-funktion (autoritativ; saldo = sum af stempler i ledger)
-- ---------------------------------------------------------------------------
create or replace function public.loyalty_balance(p_membership uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(stamps), 0)::int
  from public.loyalty_transactions
  where membership_id = p_membership;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
--   Config-tabeller (locations, employees, programs, rewards, discounts,
--   campaigns): ejer må læse+skrive; admin alt.
--   Ledger/medlemsdata: ejer+admin læser; writes sker via service-role.
-- ---------------------------------------------------------------------------
alter table public.locations           enable row level security;
alter table public.employees           enable row level security;
alter table public.loyalty_programs    enable row level security;
alter table public.loyalty_rewards     enable row level security;
alter table public.loyalty_members     enable row level security;
alter table public.loyalty_memberships enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.customer_rewards    enable row level security;
alter table public.discounts           enable row level security;
alter table public.customer_discounts  enable row level security;
alter table public.campaigns           enable row level security;
alter table public.consent_records     enable row level security;
alter table public.loyalty_audit_log   enable row level security;

-- Genbrugt mønster: company_id ejet af auth.uid() ELLER admin.
-- Config-tabeller: fuld adgang for ejer/admin.
do $$
declare t text;
begin
  foreach t in array array['locations','employees','loyalty_programs','loyalty_rewards','discounts','campaigns']
  loop
    execute format('drop policy if exists %I_owner_all on public.%I', t, t);
    execute format(
      'create policy %I_owner_all on public.%I for all using (public.is_admin() or company_id in (select id from public.companies where user_id = auth.uid())) with check (public.is_admin() or company_id in (select id from public.companies where user_id = auth.uid()))',
      t, t
    );
  end loop;

  -- Ledger/medlemsdata: kun SELECT for ejer/admin (writes via service-role).
  foreach t in array array['loyalty_members','loyalty_memberships','loyalty_transactions','customer_rewards','customer_discounts','consent_records','loyalty_audit_log']
  loop
    execute format('drop policy if exists %I_owner_select on public.%I', t, t);
    execute format(
      'create policy %I_owner_select on public.%I for select using (public.is_admin() or company_id in (select id from public.companies where user_id = auth.uid()))',
      t, t
    );
  end loop;
end $$;
