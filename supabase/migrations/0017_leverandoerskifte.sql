-- ---------------------------------------------------------------------------
-- 0017 — Leverandørskifte efter dataforordningens artikel 25
--
-- HVORFOR: handelsbetingelsernes § 12 giver kunden ret til at skifte
-- leverandør med en overgangsperiode på 30 kalenderdage OG derefter mindst 30
-- kalenderdage til at hente sine data. Tilsammen op til 60 dage efter
-- ophøret.
--
-- Databehandleraftalens § 13 lover til gengæld sletning senest 30 dage efter
-- ophør, og `afslut_ophoerte_aftaler()` håndhæver det hver nat. De to løfter
-- ville altså kollidere: oprydningen ville slette midt i et skifte, kunden har
-- lovsikret ret til.
--
-- Løsningen er ét felt. Er `dataudtraek_frist` sat og endnu ikke passeret,
-- rører oprydningen ikke virksomheden. Det er præcis den undtagelse,
-- forordningens artikel 28, stk. 3, litra g giver plads til: "medmindre
-- EU-retten kræver, at oplysningerne gemmes".
--
-- Feltet sættes, når en kunde beder om at skifte. Det sker manuelt i dag —
-- med tre kunder er der ikke en selvbetjening at bygge endnu — men fristen
-- HÅNDHÆVES automatisk, og det er den vej rundt, der er den rigtige: et løfte
-- uden en mekanisme er værre end intet løfte.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

alter table public.companies
  -- Sat mens et leverandørskifte er i gang. Til og med denne dato slettes der
  -- INTET for virksomheden — heller ikke en sletning, kunden selv har bestilt.
  add column if not exists dataudtraek_frist timestamptz;

create index if not exists companies_dataudtraek_idx
  on public.companies(dataudtraek_frist)
  where dataudtraek_frist is not null;

-- ---------------------------------------------------------------------------
-- Oprydningen får fristen at vide
--
-- Kun ét udtryk er ændret i forhold til 0014: den nye betingelse i trin 2.
-- Resten står ordret som før, fordi funktionen erstattes i sin helhed.
-- Fristerne SKAL blive ved med at stemme med FRISTER i src/lib/opbevaring.ts —
-- opbevaring.test.ts læser alle migrationer og fanger det, hvis de driver fra
-- hinanden, også når en funktion erstattes som her.
-- ---------------------------------------------------------------------------

create or replace function public.afslut_ophoerte_aftaler(p_toerloeb boolean default true)
returns jsonb
language plpgsql
as $$
declare
  frist_suspension   constant interval := '6 months';
  frist_efter_ophoer constant interval := '30 days';

  n_ophoert int := 0;
  til_sletning uuid[];
  n_sletning int := 0;
  n_afventer_skifte int := 0;
  c uuid;
begin
  -- 1) Suspensioner der er løbet ud: aftalen ophører, og de 30 dage begynder.
  --
  --    Et igangværende skifte stopper IKKE dette trin. Aftalen ophører, når
  --    den ophører; det er kun sletningen, der venter.
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
  --    tørløb tæller det samme som en rigtig kørsel.
  --
  --    `dataudtraek_frist` er den nye betingelse: er et leverandørskifte i
  --    gang, slettes der intet, før kunden har haft den tid til at hente sine
  --    data, som artikel 25 giver. Se kommentaren øverst.
  select coalesce(array_agg(id), '{}'::uuid[])
    into til_sletning
    from public.companies
   where slettet_den is null
     and (dataudtraek_frist is null or dataudtraek_frist <= now())
     and (
       coalesce(ophoert_den, suspenderet_siden + frist_suspension)
         < now() - frist_efter_ophoer
       or (sletning_udfoeres_den is not null and sletning_udfoeres_den <= now())
     );

  n_sletning := coalesce(array_length(til_sletning, 1), 0);

  -- Hvor mange er holdt tilbage af et skifte? Tallet noteres, så en frist, der
  -- ved en fejl aldrig bliver ryddet, kan ses i driftsloggen frem for stille at
  -- holde en virksomhed udenfor oprydningen for evigt.
  select count(*) into n_afventer_skifte
    from public.companies
   where slettet_den is null
     and dataudtraek_frist is not null
     and dataudtraek_frist > now();

  if not p_toerloeb and n_sletning > 0 then
    foreach c in array til_sletning loop
      perform public.slet_virksomhedens_data(c);
    end loop;
  end if;

  return jsonb_build_object(
    'toerloeb', p_toerloeb,
    'ophoert', n_ophoert,
    'slettet', n_sletning,
    'afventer_skifte', n_afventer_skifte,
    'virksomheder', to_jsonb(til_sletning)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Sletningen skal også rydde fristen, så en genoprettet virksomhed ikke
-- arver en gammel dato.
-- ---------------------------------------------------------------------------

-- (slet_virksomhedens_data rører ikke feltet i 0014; her tilføjes det.)
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
    'locations', 'subscriptions'
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
         dataudtraek_frist     = null,
         slettet_den           = now()
   where id = p_company_id;
end;
$$;
