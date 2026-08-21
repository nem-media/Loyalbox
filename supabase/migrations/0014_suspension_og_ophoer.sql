-- ---------------------------------------------------------------------------
-- 0014 — Suspension, ophør og sletning
--
-- HVORFOR DEN FINDES: databehandleraftalens § 13 lovede sletning senest 30
-- dage efter aftalens ophør, uden at der fandtes noget, der gjorde det — og
-- uden at nogen kunne se, HVORNÅR en aftale var ophørt. Samtidig behandlede
-- koden manglende betaling og opsigelse som samme hændelse, mens de to
-- dokumenter lovede hver sin behandling af data.
--
-- MODELLEN, som src/lib/abonnement.ts beskriver i detaljer:
--
--   aktiv         kunden betaler.
--   suspenderet   betalingen mangler. Kundeforholdet BESTÅR, aftalen er i
--                 kraft, og der slettes ingenting. Varer 6 måneder.
--   ophørt        de 6 måneder er gået, eller kunden har selv bedt om det.
--                 30 dage senere er alt væk.
--
-- Det er sondringen, der gør de 6 måneder lovlige: så længe aftalen er i
-- kraft, er der ingen sletningspligt at bryde.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1) Felterne på virksomheden
-- ---------------------------------------------------------------------------

alter table public.companies
  -- Stripes status ORDRET. Ikke et ja/nej: vejen tilbage afhænger af den —
  -- 'past_due' kan reddes med et nyt kort, 'canceled' kræver et nyt abonnement.
  add column if not exists stripe_status text,
  -- Hvornår betalingen holdt op. Null = har aldrig været suspenderet.
  add column if not exists suspenderet_siden timestamptz,
  -- Hvornår aftalen ophørte. Sætter de 30 dage i gang.
  add column if not exists ophoert_den timestamptz,
  -- Selvbetjent sletning: bestilt, bekræftet (token brugt), og hvornår den
  -- udføres. De tre felter er hele angrefristen.
  add column if not exists sletning_bestilt_den timestamptz,
  add column if not exists sletning_token text,
  add column if not exists sletning_udfoeres_den timestamptz,
  -- Sat når data FAKTISK er slettet. Rækken bliver liggende, fordi
  -- bogføringsloven kræver fakturaen i fem år — se kommentaren ved
  -- slet_virksomhedens_data().
  add column if not exists slettet_den timestamptz;

create index if not exists companies_suspenderet_idx
  on public.companies(suspenderet_siden)
  where suspenderet_siden is not null;

create index if not exists companies_sletning_idx
  on public.companies(sletning_udfoeres_den)
  where sletning_udfoeres_den is not null;

-- ---------------------------------------------------------------------------
-- 2) Sletning af én virksomheds data
--
-- HVAD DER SLETTES: alt om butikkens egne kunder og personale, og butikkens
-- egen opsætning — medlemmer, stempler, belønninger, feedback, standere,
-- scanninger, medarbejdere, programmer, kampagner.
--
-- HVAD DER BLIVER: selve `companies`-rækken med navn og adresse samt
-- `orders`. Bogføringsloven kræver regnskabsmaterialet i fem år efter
-- regnskabsårets udløb, og en faktura uden en køber er ikke et
-- regnskabsmateriale. Det er præcis den undtagelse, databehandleraftalens
-- § 13 tager forbehold for ("medmindre lovgivningen kræver, at de gemmes").
-- Kontaktoplysninger, logo og standertekst ryger derimod — de har intet med
-- bogføringen at gøre.
--
-- Loginnet slettes IKKE her. Auth-brugere kan ikke røres forsvarligt fra en
-- SQL-funktion; det sker fra /api/cron/oprydning bagefter med admin-nøglen.
-- Fejler det trin, er personoplysningerne allerede væk, og der står en tom
-- login tilbage — det noteres i driftsloggen frem for at blive tiet ihjel.
-- ---------------------------------------------------------------------------

create or replace function public.slet_virksomhedens_data(p_company_id uuid)
returns void
language plpgsql
as $$
declare
  -- Tabeller med company_id, som ryddes. Rækkefølgen er børn før forældre.
  haandterede constant text[] := array[
    'loyalty_transactions', 'customer_rewards', 'customer_discounts',
    'consent_records', 'loyalty_memberships', 'loyalty_members',
    'loyalty_audit_log', 'campaigns', 'discounts', 'loyalty_rewards',
    'loyalty_programs', 'feedback', 'scans', 'stands', 'employees',
    'locations', 'subscriptions'
  ];
  -- Bevidst bevaret. Står her frem for at være udeladt i stilhed, så
  -- sikkerhedsnettet nedenfor ikke skal fortolke et fravær.
  bevaret constant text[] := array['orders', 'companies'];
  uhaandterede text[];
begin
  -- SIKKERHEDSNET. En ny tabel med company_id, der ikke står på en af de to
  -- lister, standser sletningen med en fejl frem for at blive glemt. Den slags
  -- opdages ellers aldrig: sletningen ville se ud til at lykkes, og
  -- oplysningerne ville blive liggende i en tabel, ingen tænkte på.
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

  update public.companies
     set logo_url              = null,
         contact_email         = null,
         phone                 = null,
         stand_text            = null,
         billing_email         = null,
         plan                  = 'basic',
         product_slug          = null,
         sletning_token        = null,
         sletning_bestilt_den  = null,
         sletning_udfoeres_den = null,
         slettet_den           = now()
   where id = p_company_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Den natlige kørsel
--
-- To skridt: lad udløbne suspensioner ophøre, og slet dem, hvis 30 dage
-- derefter er gået. Kaldes fra /api/cron/oprydning sammen med
-- ryd_op_efter_frister().
--
-- `p_toerloeb` tæller kun. Kør ALTID et tørløb først — det er en sletning,
-- der ikke kan gøres om.
-- ---------------------------------------------------------------------------

create or replace function public.afslut_ophoerte_aftaler(p_toerloeb boolean default true)
returns jsonb
language plpgsql
as $$
declare
  -- Fristerne. Skal stemme med FRISTER i src/lib/opbevaring.ts —
  -- opbevaring.test.ts holder de to lister op mod hinanden.
  frist_suspension   constant interval := '6 months';
  frist_efter_ophoer constant interval := '30 days';

  n_ophoert int := 0;
  til_sletning uuid[];
  n_sletning int := 0;
  c uuid;
begin
  -- 1) Suspensioner der er løbet ud: aftalen ophører, og de 30 dage begynder.
  if p_toerloeb then
    select count(*) into n_ophoert
      from public.companies
     where ophoert_den is null
       and slettet_den is null
       and suspenderet_siden is not null
       and suspenderet_siden < now() - frist_suspension;
  else
    with ophoert as (
      update public.companies
         set ophoert_den = suspenderet_siden + frist_suspension
       where ophoert_den is null
         and slettet_den is null
         and suspenderet_siden is not null
         and suspenderet_siden < now() - frist_suspension
      returning 1
    )
    select count(*) into n_ophoert from ophoert;
  end if;

  -- 2) Hvem skal slettes nu?
  --
  --    Ophørsdatoen regnes med coalesce og ikke ud fra kolonnen alene, så et
  --    tørløb tæller det samme som en rigtig kørsel. Ellers ville en
  --    virksomhed, der både ophører OG skal slettes i samme kørsel, være
  --    usynlig i tørløbet — og tørløbet er hele grundlaget for at turde køre.
  select coalesce(array_agg(id), '{}'::uuid[])
    into til_sletning
    from public.companies
   where slettet_den is null
     and (
       coalesce(ophoert_den, suspenderet_siden + frist_suspension)
         < now() - frist_efter_ophoer
       or (sletning_udfoeres_den is not null and sletning_udfoeres_den <= now())
     );

  n_sletning := coalesce(array_length(til_sletning, 1), 0);

  if not p_toerloeb and n_sletning > 0 then
    foreach c in array til_sletning loop
      perform public.slet_virksomhedens_data(c);
    end loop;
  end if;

  return jsonb_build_object(
    'toerloeb', p_toerloeb,
    'ophoert', n_ophoert,
    'slettet', n_sletning,
    -- Id'erne med, så ruten kan slette de tilhørende logins og logoer
    -- bagefter. Det er ikke personoplysninger — kun nøgler.
    'virksomheder', to_jsonb(til_sletning)
  );
end;
$$;
