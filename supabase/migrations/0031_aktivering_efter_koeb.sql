-- ============================================================================
-- 0031 — Abonnement kan købes UDEN konto, og kontoen aktiveres bagefter
-- ============================================================================
-- Kør MANUELT i Supabase → SQL Editor. Idempotent.
--
-- HVORFOR:
--
-- Pro og Komplet krævede en konto FØR købet: opret konto → bekræft mail →
-- bestil → betal. Basic gør det modsatte og er langt kortere: bestil → betal,
-- og der er ingen konto, fordi der ikke er noget at administrere.
--
-- Nu skal abonnementerne følge Basic hele vejen til betalingen og først
-- DEREFTER give adgang. Virksomheden oprettes altså uden ejer — præcis som
-- Basic allerede gør (`companies.user_id` har været nullable siden 0001) — og
-- køberen gør den til sin bagefter.
--
-- TOKENET ER AUTORISATIONEN, ligesom `/kort/<public_token>` og
-- `sletning_token`. Den, der har det, kan gøre virksomheden til sin. Det
-- sendes kun til den e-mail, betalingen blev gennemført med.
--
-- HVORFOR EN UDLØBSDATO: et token uden udløb ligger i en indbakke for altid,
-- og en videresendt kvittering ville kunne overtage en betalende kundes
-- virksomhed år senere. 30 dage er valgt, fordi skiltet er 3-5 hverdage om at
-- komme frem, og en del først sætter sig med det, når det står på disken.
-- ---------------------------------------------------------------------------

alter table public.companies
  add column if not exists aktivering_token text,
  add column if not exists aktivering_udloeber timestamptz;

-- Opslaget sker PÅ tokenet, og det skal være entydigt. Delvist indeks, fordi
-- langt de fleste virksomheder ikke har et token — og to gange null er ikke
-- en dublet.
create unique index if not exists companies_aktivering_token_unik
  on public.companies(aktivering_token)
  where aktivering_token is not null;

-- ---------------------------------------------------------------------------
-- `slet_virksomhedens_data()` SKAL nulstille tokenet
--
-- Et gyldigt aktiveringstoken på en slettet virksomhed ville være en åben dør
-- til en tom skal — og `sletning_token` nulstilles allerede af samme grund.
--
-- Kopien er taget fra 0030, som er den SENESTE udgave (0014 → 0017 → 0018 →
-- 0025 → 0026 → 0029 → 0030).
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
         aktivering_token      = null,
         aktivering_udloeber   = null,
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
