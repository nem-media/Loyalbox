-- ============================================================================
-- 0030 — Pakken kan stiles til en person
-- ============================================================================
-- Kør MANUELT i Supabase → SQL Editor. Idempotent.
--
-- HVORFOR:
--
-- 0029 gav virksomheden en leveringsadresse, der forudfylder checkouten. Men
-- modtagernavnet blev sat til VIRKSOMHEDENS navn, og der er kun ét navnefelt
-- hos Stripe — så et personnavn, kunden selv havde skrevet ved en tidligere
-- betaling, blev overskrevet ved næste køb. En pakke til en butik med tyve
-- ansatte er ikke stilet til nogen.
--
-- TO KOLONNER, OG DE ER IKKE DET SAMME:
--
--   `companies.kontaktperson` er kundens EGEN oplysning: hvem skal pakken
--   stiles til fremover. Den forudfylder checkouten sammen med adressen.
--
--   `orders.leveringsnavn` er BILAGET: det navn, der faktisk blev bekræftet,
--   da netop den ordre blev betalt. Uden den ville admin skrive et navn på
--   pakkelabelen ud fra profilen, som kunden kan have ændret i checkouten —
--   og skærmen ville vise noget andet, end kunden godkendte.
--
-- Adressen har haft præcis den opdeling siden 0020 (`orders.leveringsadresse`
-- er bilaget, `companies.address` er kartoteket). Navnet følger nu med, så de
-- to ting ikke er halvt adskilt.
-- ---------------------------------------------------------------------------

alter table public.companies
  add column if not exists kontaktperson text;

alter table public.orders
  add column if not exists leveringsnavn text;

-- ---------------------------------------------------------------------------
-- `slet_virksomhedens_data()` SKAL nulstille kontaktpersonen
--
-- Det er et PERSONNAVN på en navngiven medarbejder — mere entydigt
-- personhenførbart end noget andet felt på virksomheden. Den skal væk med
-- resten, præcis som `contact_email` og `phone`.
--
-- `orders.leveringsnavn` nulstilles derimod IKKE, og det er samme begrundelse
-- som for `orders.leveringsadresse`: ordren er regnskabsmateriale, og
-- databehandleraftalens § 13 undtager det, lovgivningen kræver gemt. Et bilag
-- uden modtager er ikke et bilag.
--
-- Kopien er taget fra 0029, som er den SENESTE udgave (0014 → 0017 → 0018 →
-- 0025 → 0026 → 0029). En kopi fra en ældre migration ville stille rulle
-- adressefelterne eller omdømme-tabellerne tilbage.
-- ---------------------------------------------------------------------------

create or replace function public.slet_virksomhedens_data(p_company_id uuid)
returns void
language plpgsql
as $$
declare
  haandterede constant text[] := array[
    'loyalty_transactions', 'customer_rewards', 'customer_discounts',
    'consent_records', 'loyalty_memberships', 'loyalty_members',
    'loyalty_audit_log', 'campaigns', 'discounts', 'loyalty_rewards',
    'loyalty_programs', 'feedback', 'scans', 'stands', 'employees',
    'locations', 'subscriptions', 'designs', 'admin_log',
    'eksterne_profiler', 'omdoemme_snapshots'
  ];
  bevaret constant text[] := array['orders', 'companies'];
  uhaandterede text[];
begin
  select coalesce(array_agg(c.table_name::text order by c.table_name), '{}'::text[])
    into uhaandterede
    from information_schema.columns c
   where c.table_schema = 'public'
     and c.column_name = 'company_id'
     and not (c.table_name::text = any (haandterede))
     and not (c.table_name::text = any (bevaret));

  if array_length(uhaandterede, 1) > 0 then
    raise exception
      'slet_virksomhedens_data: tabeller med company_id mangler på listen: %. Tilføj dem til haandterede eller bevaret.',
      uhaandterede;
  end if;

  delete from public.loyalty_transactions where company_id = p_company_id;
  delete from public.customer_rewards     where company_id = p_company_id;
  delete from public.customer_discounts   where company_id = p_company_id;
  delete from public.consent_records      where company_id = p_company_id;
  delete from public.loyalty_memberships  where company_id = p_company_id;
  delete from public.loyalty_members      where company_id = p_company_id;
  delete from public.loyalty_audit_log    where company_id = p_company_id;
  delete from public.campaigns            where company_id = p_company_id;
  delete from public.discounts            where company_id = p_company_id;
  delete from public.loyalty_rewards      where company_id = p_company_id;
  delete from public.loyalty_programs     where company_id = p_company_id;
  delete from public.feedback             where company_id = p_company_id;
  delete from public.scans                where company_id = p_company_id;
  delete from public.stands               where company_id = p_company_id;
  delete from public.employees            where company_id = p_company_id;
  delete from public.locations            where company_id = p_company_id;
  delete from public.subscriptions        where company_id = p_company_id;
  delete from public.admin_log            where company_id = p_company_id;
  delete from public.eksterne_profiler    where company_id = p_company_id;
  delete from public.omdoemme_snapshots   where company_id = p_company_id;

  -- Ordrer bevares, men må ikke pege på et design, der slettes om lidt.
  update public.orders
     set design_id = null
   where company_id = p_company_id;

  delete from public.designs where company_id = p_company_id;

  update public.companies
     set logo_url              = null,
         contact_email         = null,
         phone                 = null,
         stand_text            = null,
         billing_email         = null,
         address               = null,
         postnummer            = null,
         by                    = null,
         kontaktperson         = null,
         plan                  = 'basic',
         product_slug          = null,
         sletning_token        = null,
         sletning_bestilt_den  = null,
         sletning_udfoeres_den = null,
         dataudtraek_frist     = null,
         slettet_den           = now()
   where id = p_company_id;
end;
$$;
