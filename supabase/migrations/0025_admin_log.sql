-- ---------------------------------------------------------------------------
-- 0025 — Log over det, admin ændrer i hånden
--
-- HVORFOR DEN FINDES: de manuelle ændringer er dem, der afgør kundens adgang,
-- og de var de eneste, der ikke efterlod et spor. Produktvælgeren på
-- virksomhedssiden låser stempelkortet op eller i; en opsigelse stopper
-- pengene; en genoptagelse standser en sletning, der ellers var på vej. Der
-- var ingen måde at se, HVEM der gjorde det, HVORNÅR, eller hvad der stod før.
--
-- Det er ikke hypotetisk. Frisør Nielsine blev solgt LoyalSum Komplet manuelt
-- og endte på niveau `premium` — en betalende kunde uden feedback-indbakke,
-- statistik og dynamiske links. Intet gik i stykker, så det blev ikke
-- opdaget, og der var bagefter ingen måde at se, hvornår det skete, eller
-- hvad hun stod på før.
--
-- IKKE I `drift_log`. Den er til baggrundsopgaver, har ingen policies (kun
-- service-role læser den), og dens kommentar lover udtrykkeligt, at der ikke
-- står personoplysninger i den. Her ER der en person: den medarbejder, der
-- trykkede. De to skal ikke blandes.
--
-- HVAD DER IKKE MÅ STÅ I `foer`/`efter`: kundens egne oplysninger. Kun de
-- felter, handlingen ændrede — produkt, niveau, abonnementstilstand. Loggen
-- skal kunne besvare "hvem gjorde hvad", ikke gemme en kopi af kunden.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

create table if not exists public.admin_log (
  id          uuid primary key default gen_random_uuid(),
  -- Hvem. `on delete set null`, fordi loggen skal overleve, at en medarbejder
  -- holder op — ellers ville en fratrædelse slette sporet af det, de gjorde.
  actor_id    uuid references public.users(id) on delete set null,
  -- Mailen gemmes SOM TEKST ved siden af. Uden den er en række med et
  -- nulstillet actor_id anonym, og så er loggen ikke en log.
  actor_email text not null,
  company_id  uuid references public.companies(id) on delete cascade,
  -- Hvad der blev gjort. Fx 'produkt-skiftet', 'abonnement-opsagt'.
  handling    text not null,
  -- Kun de felter, handlingen rørte. ALDRIG en kopi af kunden.
  foer        jsonb,
  efter       jsonb,
  created_at  timestamptz not null default now()
);

-- Opslaget er altid "alt for én virksomhed, nyeste først".
create index if not exists admin_log_company_idx
  on public.admin_log(company_id, created_at desc);

alter table public.admin_log enable row level security;

-- Kun admin læser. En butiksejer skal ikke kunne se vores interne noter om
-- hendes konto, og der er ingen skrive-policy: der skrives med service-role
-- fra `admin-log.ts`, præcis som driftsloggen skrives.
drop policy if exists admin_log_admin_select on public.admin_log;
create policy admin_log_admin_select on public.admin_log
  for select using (public.is_admin());

comment on table public.admin_log is
  'Hvad admin har ændret i hånden, og hvem der gjorde det. Ingen kundeoplysninger i foer/efter.';

-- ---------------------------------------------------------------------------
-- `slet_virksomhedens_data()` SKAL kende den nye tabel
--
-- Funktionen har et sikkerhedsnet: en tabel med `company_id`, der hverken står
-- på `haandterede` eller `bevaret`, STANDSER hele sletningen med en fejl. Det
-- er med vilje — sådan kan en ny tabel ikke blive glemt i stilhed — og det
-- betyder, at den her migration ikke kan nøjes med at oprette en tabel.
--
-- ADMIN_LOG SLETTES MED RESTEN, og det er et valg. Argumentet imod er, at en
-- revisionslog, der kan slettes, er en svag revisionslog. Argumentet for vejer
-- tungere: databehandleraftalens § 13 lover, at alt om kunden er væk 30 dage
-- efter ophør, og en log, der peger på hendes virksomhed og på, hvad vi
-- ændrede på hendes konto, er ikke regnskabsmateriale. Undtagelsen i § 13
-- gælder det, LOVGIVNINGEN kræver gemt — bogføringsloven kræver fakturaen,
-- ikke vores interne noter.
--
-- Resten af funktionen er ordret som i 0018, der er den SENESTE udgave
-- (0014 -> 0017 -> 0018). Den gentages i sin helhed, fordi `create or replace`
-- erstatter hele kroppen — og en kopi taget fra 0014 ville stille rulle
-- både `dataudtraek_frist = null` (0017) og hele designs-delen (0018) tilbage.
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
    'locations', 'subscriptions', 'designs', 'admin_log'
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
