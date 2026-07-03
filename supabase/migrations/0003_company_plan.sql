-- ============================================================================
-- ReviewStand.dk — company plan / tier (Sprint 2)
-- ============================================================================
-- Adds a "plan" (tier) to each company. This drives which capabilities the
-- customer gets in the control panel (see src/lib/constants.ts).
--
-- A company's plan is separate from billing history (orders) and Stripe
-- subscriptions — it is the single source of truth for feature access.
--
-- Run in the Supabase SQL editor, or via `supabase db push`.
-- ============================================================================

do $$ begin
  create type company_plan as enum ('basic', 'premium', 'pro');
exception when duplicate_object then null; end $$;

alter table public.companies
  add column if not exists plan company_plan not null default 'basic';

-- ---------------------------------------------------------------------------
-- Guard: only an admin or the service role (billing / Stripe webhooks) may
-- change a company's plan. This prevents a customer from silently upgrading
-- themselves for free through a normal row update, even though owner-update
-- RLS otherwise lets them edit their own company.
-- ---------------------------------------------------------------------------
create or replace function public.guard_company_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan is distinct from old.plan
     and not public.is_admin()
     and coalesce(auth.role(), '') <> 'service_role'
  then
    raise exception 'Kun admin eller betaling kan ændre en virksomheds plan.';
  end if;
  return new;
end;
$$;

drop trigger if exists companies_guard_plan on public.companies;
create trigger companies_guard_plan
  before update on public.companies
  for each row execute function public.guard_company_plan();
