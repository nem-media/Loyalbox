-- ---------------------------------------------------------------------------
-- 0026 — Omdømme: eksterne profiler, scorehistorik og opfølgning på feedback
--
-- HVAD OMRÅDET SKAL KUNNE: vise virksomheden ét tal for, hvordan kunderne
-- oplever den. Tallet regnes i `src/lib/omdoemme.ts` og hviler på tre kilder:
--
--   1. `feedback` — de stjerner, kunderne selv har sat i vores eget flow.
--      Findes i forvejen. Bemærk at der oprettes en række i BEGGE veje, både
--      når kunden går videre til Google og når hun sender privat feedback, så
--      gennemsnittet dækker alle kunder og ikke kun de utilfredse.
--   2. Opfølgningen på de utilfredse — den mangler et sted at stå. Se nedenfor.
--   3. Eksterne ratings, virksomheden selv har oplyst. Ny tabel.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1) Opfølgning på feedback
--
-- HVORFOR ET TIDSSTEMPEL OG IKKE ET FLAG. "Håndteret" uden hvornår kan ikke
-- bruges til noget bagefter: man kan hverken se, om der gik en dag eller en
-- måned, eller vise en historik. Et null/ikke-null er lige så let at spørge
-- om som en boolean, og det koster det samme.
--
-- Feltet er ikke afgrænset til negative sager i basen. Beregningen kigger kun
-- på 1-2 stjerner, men der er ingen grund til at forbyde, at nogen kvitterer
-- for en firestjernet kommentar.
-- ---------------------------------------------------------------------------

alter table public.feedback
  add column if not exists haandteret_den timestamptz;

comment on column public.feedback.haandteret_den is
  'Hvornår butikken fulgte op på oplevelsen. Null = ikke fulgt op.';

-- Opslaget er altid "de uhåndterede for én virksomhed".
create index if not exists feedback_uhaandteret_idx
  on public.feedback(company_id)
  where haandteret_den is null;

-- ---------------------------------------------------------------------------
-- 2) Eksterne profiler
--
-- MANUELT OPLYST, OG DET SKAL KUNNE SES. `kilde` er med fra dag ét, selvom
-- kun 'manual' bruges nu: den dag et tal kommer fra Google Business Profile
-- eller Trustpilots API, skal brugerfladen kunne skelne et selvoplyst tal fra
-- et hentet — og det kan den ikke, hvis kolonnen først tilføjes bagefter og
-- alle gamle rækker står som ukendte.
--
-- RATING ELLER PROCENT, IKKE BEGGE PÅKRÆVET. Facebook bruger ikke længere en
-- klassisk 1-5, men "94 % anbefaler". Derfor kan `rating` være null, når
-- `anbefaling_procent` er sat. Beregningen springer profiler over, der
-- hverken har det ene eller det andet — en tom profil må ikke kunne pynte.
--
-- `rating_skala` gemmes PR. PROFIL og ikke som en konstant pr. platform:
-- "anden" kan være hvad som helst, og en platform kan skifte skala. Uden den
-- ville et tal på 8 være meningsløst.
-- ---------------------------------------------------------------------------

create table if not exists public.eksterne_profiler (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  -- google | trustpilot | tripadvisor | facebook | anden
  platform            text not null,
  -- Kun til 'anden'. De øvrige har deres navn i koden.
  visningsnavn        text,
  rating              numeric(5, 2),
  rating_skala        numeric(5, 2),
  antal_anmeldelser   integer not null default 0,
  -- Facebook o.l.: 0-100. Bruges når der ikke er en rating.
  anbefaling_procent  numeric(5, 2),
  profil_url          text,
  -- manual | api | loyalsum. Kun 'manual' bruges i v1.
  kilde               text not null default 'manual',
  opdateret_den       timestamptz not null default now(),
  created_at          timestamptz not null default now(),

  -- Samme grænser som valider() i src/lib/omdoemme.ts. De står BEGGE steder
  -- med vilje: brugerfladen skal kunne sige hvad der er galt, og basen skal
  -- kunne holde til data, der kommer ind ad en anden vej.
  constraint eksterne_profiler_rating_chk
    check (rating is null or (rating >= 0 and rating_skala is not null and rating <= rating_skala)),
  constraint eksterne_profiler_skala_chk
    check (rating_skala is null or rating_skala > 0),
  constraint eksterne_profiler_antal_chk
    check (antal_anmeldelser >= 0),
  constraint eksterne_profiler_procent_chk
    check (anbefaling_procent is null or (anbefaling_procent >= 0 and anbefaling_procent <= 100)),
  constraint eksterne_profiler_tal_chk
    check (rating is not null or anbefaling_procent is not null)
);

create index if not exists eksterne_profiler_company_idx
  on public.eksterne_profiler(company_id);

-- ÉN PROFIL PR. PLATFORM, undtagen 'anden'. To Google-profiler på samme
-- virksomhed er en indtastningsfejl, ikke et ønske — og de ville tælle
-- dobbelt i den vejede eksterne score. 'anden' er undtaget, fordi en butik
-- godt kan have både Booking.com og en brancheportal.
create unique index if not exists eksterne_profiler_en_pr_platform
  on public.eksterne_profiler(company_id, platform)
  where platform <> 'anden';

alter table public.eksterne_profiler enable row level security;

-- Samme mønster som stands/feedback: ejeren og admin, ingen andre.
drop policy if exists eksterne_profiler_owner_all on public.eksterne_profiler;
create policy eksterne_profiler_owner_all on public.eksterne_profiler
  for all
  using (
    public.is_admin()
    or company_id in (select id from public.companies where user_id = auth.uid())
  )
  with check (
    public.is_admin()
    or company_id in (select id from public.companies where user_id = auth.uid())
  );

comment on table public.eksterne_profiler is
  'Eksterne ratings oplyst af virksomheden selv. Verificeres ikke automatisk.';

-- ---------------------------------------------------------------------------
-- 3) Scorehistorik
--
-- ÉN RÆKKE PR. DAG PR. VIRKSOMHED, håndhævet af et unikt indeks på datoen.
-- Uden det ville hver sideindlæsning kunne lægge en række, og en aktiv kunde
-- ville have tusindvis af identiske snapshots efter en måned. Med det bliver
-- historikken en linje pr. dag, uanset hvor tit siden åbnes.
--
-- DELSCORERNE GEMMES MED. Uden dem kan et fald i totalen ikke forklares — man
-- ville kunne se, at scoren faldt fire point, men ikke om det var de eksterne
-- ratings eller opfølgningen, der skred.
--
-- `version` er dét, der gør historikken læselig på den lange bane. Ændres
-- formlen, ville en kurve uden version have et spring, som lige så godt kunne
-- være virkeligheden som vores egen kode — og ingen kunne se forskel.
-- ---------------------------------------------------------------------------

create table if not exists public.omdoemme_snapshots (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies(id) on delete cascade,
  score                integer not null check (score between 0 and 100),
  kundetilfredshed     integer check (kundetilfredshed between 0 and 100),
  positive_oplevelser  integer check (positive_oplevelser between 0 and 100),
  feedbackhaandtering  integer check (feedbackhaandtering between 0 and 100),
  eksterne_ratings     integer check (eksterne_ratings between 0 and 100),
  -- Stjernegennemsnittet, så "+0,2 siden sidst" kan vises uden at regne igen.
  kundescore           numeric(3, 1),
  antal_oplevelser     integer not null default 0,
  version              text not null,
  beregnet_den         timestamptz not null default now()
);

create index if not exists omdoemme_snapshots_company_idx
  on public.omdoemme_snapshots(company_id, beregnet_den desc);

-- Loftet på én pr. dag. `date_trunc` frem for et ::date-cast, så indekset
-- ikke afhænger af sessionens tidszone.
create unique index if not exists omdoemme_snapshots_en_pr_dag
  on public.omdoemme_snapshots(company_id, (date_trunc('day', beregnet_den at time zone 'UTC')));

alter table public.omdoemme_snapshots enable row level security;

-- LÆSNING for ejeren, SKRIVNING kun med service-role. Snapshots laves af
-- serveren, når siden beregnes; en klient skal ikke kunne skrive sin egen
-- historik.
drop policy if exists omdoemme_snapshots_owner_select on public.omdoemme_snapshots;
create policy omdoemme_snapshots_owner_select on public.omdoemme_snapshots
  for select using (
    public.is_admin()
    or company_id in (select id from public.companies where user_id = auth.uid())
  );

comment on table public.omdoemme_snapshots is
  'Daglige øjebliksbilleder af Reputation Score. Én række pr. virksomhed pr. dag.';

-- ---------------------------------------------------------------------------
-- 4) `slet_virksomhedens_data()` SKAL kende de to nye tabeller
--
-- Sikkerhedsnettet i funktionen STANDSER enhver sletning, hvis en tabel med
-- `company_id` hverken står på `haandterede` eller `bevaret`. Det er med
-- vilje, og det er tredje gang, det gør sit arbejde.
--
-- BEGGE SLETTES MED KUNDENS DATA. De eksterne profiler er virksomhedens egne
-- oplysninger, og snapshots er en tidsserie over hendes kunders vurderinger —
-- ingen af delene er regnskabsmateriale, og § 13's undtagelse gælder kun det,
-- lovgivningen kræver gemt.
--
-- Kopien er taget fra 0025, som er den SENESTE udgave (0014 → 0017 → 0018 →
-- 0025). En kopi fra en ældre migration ville stille rulle admin_log,
-- dataudtraek_frist eller designs-delen tilbage.
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
