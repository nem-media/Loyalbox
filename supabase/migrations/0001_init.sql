-- ============================================================================
-- ReviewStand.dk — initial schema (Sprint 1)
-- ============================================================================
-- Run in the Supabase SQL editor, or via `supabase db push`.
-- Idempotent-ish: uses IF NOT EXISTS where practical.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'customer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type destination_type as enum ('google', 'trustpilot', 'facebook', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type device_type as enum ('mobile', 'tablet', 'desktop', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('new', 'needs_onboarding', 'ready_for_production', 'shipped', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('active', 'trialing', 'past_due', 'canceled', 'incomplete');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- users  (mirrors auth.users, adds role)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       user_role not null default 'customer',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.users(id) on delete set null,
  name          text not null,
  logo_url      text,
  contact_email text,
  phone         text,
  address       text,
  stand_text    text,
  created_at    timestamptz not null default now()
);
create index if not exists companies_user_id_idx on public.companies(user_id);

-- ---------------------------------------------------------------------------
-- stands
-- ---------------------------------------------------------------------------
create table if not exists public.stands (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  name              text not null,
  slug              text not null unique,
  destination_type  destination_type not null default 'google',
  google_review_url text,
  trustpilot_url    text,
  facebook_url      text,
  custom_url        text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);
create index if not exists stands_company_id_idx on public.stands(company_id);
create index if not exists stands_slug_idx on public.stands(slug);

-- ---------------------------------------------------------------------------
-- scans
-- ---------------------------------------------------------------------------
create table if not exists public.scans (
  id          uuid primary key default gen_random_uuid(),
  stand_id    uuid not null references public.stands(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  device_type device_type not null default 'unknown',
  source      text,
  created_at  timestamptz not null default now()
);
create index if not exists scans_stand_id_idx on public.scans(stand_id);
create index if not exists scans_company_id_idx on public.scans(company_id);
create index if not exists scans_created_at_idx on public.scans(created_at);

-- ---------------------------------------------------------------------------
-- feedback
-- ---------------------------------------------------------------------------
create table if not exists public.feedback (
  id                       uuid primary key default gen_random_uuid(),
  stand_id                 uuid not null references public.stands(id) on delete cascade,
  company_id               uuid not null references public.companies(id) on delete cascade,
  rating                   int not null check (rating between 1 and 5),
  comment                  text,
  customer_name            text,
  customer_email           text,
  is_public_review_clicked boolean not null default false,
  created_at               timestamptz not null default now()
);
create index if not exists feedback_stand_id_idx on public.feedback(stand_id);
create index if not exists feedback_company_id_idx on public.feedback(company_id);
create index if not exists feedback_created_at_idx on public.feedback(created_at);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid references public.companies(id) on delete set null,
  stripe_session_id text,
  product_name      text not null,
  quantity          int not null default 1,
  status            order_status not null default 'new',
  total_amount      numeric(10,2) not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists orders_company_id_idx on public.orders(company_id);
create index if not exists orders_status_idx on public.orders(status);

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null references public.companies(id) on delete cascade,
  stripe_subscription_id text,
  plan                   text not null,
  status                 subscription_status not null default 'incomplete',
  current_period_end     timestamptz,
  created_at             timestamptz not null default now()
);
create index if not exists subscriptions_company_id_idx on public.subscriptions(company_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Role check that does NOT trigger RLS recursion (SECURITY DEFINER).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  );
$$;

-- Auto-create a public.users row when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (
    new.id,
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users         enable row level security;
alter table public.companies     enable row level security;
alter table public.stands        enable row level security;
alter table public.scans         enable row level security;
alter table public.feedback      enable row level security;
alter table public.orders        enable row level security;
alter table public.subscriptions enable row level security;

-- users -------------------------------------------------------------
drop policy if exists users_self_select on public.users;
create policy users_self_select on public.users
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists users_admin_all on public.users;
create policy users_admin_all on public.users
  for all using (public.is_admin()) with check (public.is_admin());

-- companies ---------------------------------------------------------
drop policy if exists companies_owner_select on public.companies;
create policy companies_owner_select on public.companies
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists companies_owner_update on public.companies;
create policy companies_owner_update on public.companies
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists companies_admin_write on public.companies;
create policy companies_admin_write on public.companies
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists companies_owner_insert on public.companies;
create policy companies_owner_insert on public.companies
  for insert with check (user_id = auth.uid() or public.is_admin());

-- stands ------------------------------------------------------------
drop policy if exists stands_owner_all on public.stands;
create policy stands_owner_all on public.stands
  for all
  using (
    public.is_admin()
    or company_id in (select id from public.companies where user_id = auth.uid())
  )
  with check (
    public.is_admin()
    or company_id in (select id from public.companies where user_id = auth.uid())
  );

-- scans (owner + admin read; writes happen via service role) --------
drop policy if exists scans_owner_select on public.scans;
create policy scans_owner_select on public.scans
  for select using (
    public.is_admin()
    or company_id in (select id from public.companies where user_id = auth.uid())
  );

-- feedback (owner + admin read; writes happen via service role) -----
drop policy if exists feedback_owner_select on public.feedback;
create policy feedback_owner_select on public.feedback
  for select using (
    public.is_admin()
    or company_id in (select id from public.companies where user_id = auth.uid())
  );

-- orders ------------------------------------------------------------
drop policy if exists orders_owner_select on public.orders;
create policy orders_owner_select on public.orders
  for select using (
    public.is_admin()
    or company_id in (select id from public.companies where user_id = auth.uid())
  );

drop policy if exists orders_admin_write on public.orders;
create policy orders_admin_write on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

-- subscriptions -----------------------------------------------------
drop policy if exists subscriptions_owner_select on public.subscriptions;
create policy subscriptions_owner_select on public.subscriptions
  for select using (
    public.is_admin()
    or company_id in (select id from public.companies where user_id = auth.uid())
  );

drop policy if exists subscriptions_admin_write on public.subscriptions;
create policy subscriptions_admin_write on public.subscriptions
  for all using (public.is_admin()) with check (public.is_admin());
