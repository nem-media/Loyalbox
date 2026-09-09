-- ============================================================================
-- 0029 — Virksomhedens leveringsadresse bliver et rigtigt felt
-- ============================================================================
-- Kør MANUELT i Supabase → SQL Editor. Idempotent.
--
-- HVORFOR:
--
-- `companies.address` har hidtil været et enkelt fritekstfelt, der blev
-- SKREVET fra profilen og fra admin — og LÆST af ingenting. Hjælpeteksten
-- lovede "Dit skilt sendes hertil", mens handelsbetingelserne siger, at der
-- sendes "til den leveringsadresse, du oplyser ved betalingen". Kunden kunne
-- altså rette sin adresse uden nogen som helst virkning.
--
-- Nu skal feltet styre leveringen: retter kunden sin adresse, skal NÆSTE
-- bestilling sendes dertil. Det kræver en STRUKTUREL adresse — Stripe vil
-- have `line1`, `postal_code` og `city` hver for sig, og en dansk adresse kan
-- ikke deles pålideligt op ud fra én tekstlinje. `address` bliver derfor
-- vejnavn og nummer, og de to nye kolonner bærer resten. Landet gemmes ikke:
-- vi sender kun til Danmark (`LEVERINGSLANDE`).
--
-- Ordrens `leveringsadresse` er URØRT og er fortsat sandheden om, hvor DEN
-- ordre blev sendt hen. Det her er kundens adresse, ikke ordrens.
-- ---------------------------------------------------------------------------

alter table public.companies
  add column if not exists postnummer text,
  add column if not exists by text;

-- Samme mønster som `companies_cvr_format` (0015): et forkert nummer må ikke
-- slippe igennem, for så tror kunden, at skiltet er på vej det rigtige sted
-- hen. Tomt er tilladt — adressen er frivillig, indtil der bestilles.
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_postnummer_format'
  ) then
    alter table public.companies
      add constraint companies_postnummer_format
      check (postnummer is null or postnummer ~ '^[0-9]{4}$');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- `slet_virksomhedens_data()` SKAL nulstille adressen
--
-- DEN NULSTILLEDE DEN IKKE FØR — heller ikke `address`, som har ligget der
-- siden 0001. For en enkeltmandsvirksomhed er vejnavn og nummer typisk
-- indehaverens PRIVATADRESSE, så den overlevede en sletning sammen med
-- firmanavnet. Det er ikke regnskabsmateriale: ordrens egen
-- `leveringsadresse` er bilaget, og den bevares med ordren under § 13's
-- undtagelse. Kundens adressekartotek er ikke.
--
-- Kopien er taget fra 0026, som er den SENESTE udgave (0014 → 0017 → 0018 →
-- 0025 → 0026). En kopi fra en ældre migration ville stille rulle
-- omdømme-tabellerne, admin_log eller designs-delen tilbage.
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
