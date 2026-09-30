-- ---------------------------------------------------------------------------
-- 0049 — LoyalSum Commerce API v1
--
-- Webshops (WooCommerce nu, Shopify senere) taler med LoyalSum gennem ÉN
-- versioneret API. Kontrakten er `loyalsum-integrations` @ 9aa9906
-- (contracts/commerce/v1) og er kilden til sandheden; denne migration er
-- LoyalSum cores side af den.
--
-- DETTE ER ET LAG OVENPÅ — IKKE ET NYT LOYALITETSSYSTEM.
--   * Kunden er den eksisterende `loyalty_members`-række. Der oprettes ingen
--     webshopkunde ved siden af.
--   * Point bogføres med `point_giv()` og `point_annuller()` (0044) i den
--     eksisterende pointledger. Stempler gives af `giveStamp()`/`reverseStamp()`
--     i TypeScript i den eksisterende stempelledger (kilde `commerce`).
--   * Tabellerne her holder kun det, der er NYT: hvilken butik der er forbundet,
--     hvilken tilstand en ordre sidst havde, hvad den har bidraget med, og
--     hvilke belønninger der er holdt af til en kurv.
--
-- IDEMPOTENS OG KAPLØB LIGGER I BASEN, ikke i en if-sætning. En serverfunktion
-- kører i mange eksemplarer, og webshoppen gensender (Action Scheduler,
-- Shopify-webhooks). Derfor:
--   * ordrens nøgle er unik pr. integration, og ordrerækken LÅSES, mens den
--     nye tilstand sammenlignes med den gamle (ældre tilstand afvises);
--   * bidraget er unikt pr. ordre og program, og pointdelta'et bogføres i SAMME
--     transaktion som låsen — to samtidige synkroniseringer kan ikke begge se
--     "0 anvendt";
--   * reservationen tager en lås på pointkontoen, så to kurve ikke kan
--     reservere de samme point.
--
-- INGEN MARKEDSFØRINGSSAMTYKKE. Intet her skriver i `consent_records`, og en
-- ordre bærer intet felt, der kunne blive til et.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent. Kræver 0044.
-- ---------------------------------------------------------------------------

-- --------------------------------------------------------------------- typer
do $$ begin
  create type commerce_provider as enum ('woocommerce','shopify');
exception when duplicate_object then null; end $$;

-- Samme tre ord som kontraktens health-svar.
do $$ begin
  create type commerce_integration_status as enum ('active','paused','revoked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type commerce_reservation_status as enum
    ('reserved','committed','released','expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type commerce_link_status as enum ('pending','verified','revoked');
exception when duplicate_object then null; end $$;

-- Stempelledgerens kilde. Ny VÆRDI, ingen ny ledger: en webshopordre er en
-- kilde på linje med disken, QR-koden og NFC.
-- (ADD VALUE kan ikke bruges i samme transaktion, som den tilføjes i — intet
-- nedenfor bruger den.)
alter type loyalty_txn_source add value if not exists 'commerce';

-- ------------------------------------------------------------- integrationen
create table if not exists public.commerce_integrations (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  provider           commerce_provider not null,
  -- BUTIKKENS IDENTITET ER provider + external_store_id — ALDRIG adressen.
  -- En butik skifter domæne; dens id gør ikke.
  external_store_id  text not null check (char_length(external_store_id) between 1 and 255),
  store_url          text not null check (char_length(store_url) <= 2048),
  store_name         text check (store_name is null or char_length(store_name) <= 255),
  currency           text not null check (currency ~ '^[A-Z]{3}$'),
  adapter_version    text check (adapter_version is null or char_length(adapter_version) <= 64),
  platform_version   text check (platform_version is null or char_length(platform_version) <= 64),
  status             commerce_integration_status not null default 'active',
  -- NØGLEN PR. INTEGRATION, KRYPTERET (AES-256-GCM, se src/lib/commerce-api/
  -- secret.ts). Serveren SKAL kunne genskabe den for at efterprøve en HMAC,
  -- så en hash duer ikke. Sættes til null ved afbrydelse: en afbrudt
  -- integration kan ikke signere noget igen, heller ikke med en lækket nøgle.
  secret_ciphertext  text,
  connected_at       timestamptz not null default now(),
  disconnected_at    timestamptz,
  last_successful_sync_at timestamptz,
  last_error_at      timestamptz,
  last_error_code    text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (status <> 'revoked' or secret_ciphertext is null),
  check (status = 'revoked' or secret_ciphertext is not null)
);

-- ÉN LEVENDE INTEGRATION PR. BUTIK. En afbrudt række bliver stående som
-- historik, og en genforbindelse fra SAMME virksomhed genopliver den (så
-- ordrenøglerne er de samme, og gamle ordrer ikke giver point igen).
create unique index if not exists commerce_integrations_butik_idx
  on public.commerce_integrations (provider, external_store_id)
  where status <> 'revoked';
create index if not exists commerce_integrations_company_idx
  on public.commerce_integrations (company_id);

-- ---------------------------------------------------------------- parringen
create table if not exists public.commerce_pairing_codes (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  provider       commerce_provider not null,
  -- sha256 af koden. Selve koden vises én gang i dashboardet og gemmes aldrig.
  code_hash      text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  created_by     uuid references public.users(id) on delete set null,
  expires_at     timestamptz not null,
  used_at        timestamptz,
  integration_id uuid references public.commerce_integrations(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists commerce_pairing_codes_company_idx
  on public.commerce_pairing_codes (company_id, created_at desc);

-- --------------------------------------------- gentagelser og hastighedsgrænse
-- ET REQUEST-ID MÅ KUN BRUGES ÉN GANG pr. integration inden for vinduet.
-- Primærnøglen ER spærren; rækkerne ryddes løbende, se commerce_godkend().
create table if not exists public.commerce_request_ids (
  integration_id uuid not null references public.commerce_integrations(id) on delete cascade,
  request_id     uuid not null,
  received_at    timestamptz not null default now(),
  primary key (integration_id, request_id)
);
create index if not exists commerce_request_ids_received_idx
  on public.commerce_request_ids (received_at);

create table if not exists public.commerce_rate_windows (
  integration_id uuid not null references public.commerce_integrations(id) on delete cascade,
  window_start   timestamptz not null,
  requests       int not null default 0,
  primary key (integration_id, window_start)
);

-- ------------------------------------------------------------------ kanaler
-- ET EKSISTERENDE PROGRAM BLIVER IKKE AF SIG SELV ET WEBSHOPPROGRAM. Butikken
-- slår det til pr. kanal (= provider). Uden en række her giver en webshopordre
-- intet til programmet. Disken (IN_STORE) er stadig programmets hjem og
-- kræver ingen række.
create table if not exists public.commerce_program_channels (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  provider         commerce_provider not null,
  point_program_id uuid references public.loyalty_point_programs(id) on delete cascade,
  stamp_program_id uuid references public.loyalty_programs(id) on delete cascade,
  enabled          boolean not null default true,
  -- Kun for stempelkort: en ordre skal have mindst dette eligible spend (i
  -- mindste enhed) for at give et stempel. null = ingen grænse.
  min_order_minor  bigint check (min_order_minor is null or min_order_minor >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((point_program_id is null) <> (stamp_program_id is null)),
  check (point_program_id is null or min_order_minor is null)
);
create unique index if not exists commerce_program_channels_point_idx
  on public.commerce_program_channels (provider, point_program_id)
  where point_program_id is not null;
create unique index if not exists commerce_program_channels_stamp_idx
  on public.commerce_program_channels (provider, stamp_program_id)
  where stamp_program_id is not null;
-- ÉT POINTPROGRAM PR. WEBSHOPKANAL. Kontraktens `/customer/loyalty` svarer med
-- ÉN pointsaldo, og en belønning trækker på ét program; to programmer i samme
-- webshop ville gøre saldoen tvetydig.
create unique index if not exists commerce_program_channels_et_point_idx
  on public.commerce_program_channels (company_id, provider)
  where point_program_id is not null and enabled;
create index if not exists commerce_program_channels_company_idx
  on public.commerce_program_channels (company_id);

-- EN FYSISK BELØNNING BLIVER HELLER IKKE AF SIG SELV EN WEBSHOPRABAT. "Gratis
-- kaffe" kan ikke lægges i en webshopkurv; butikken vælger, hvilke belønninger
-- der gælder online, og hvad de er værd dér. V1: fast beløb eller procent af
-- kurven — ingen gratis vare.
create table if not exists public.commerce_reward_channels (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  provider        commerce_provider not null,
  point_reward_id uuid not null references public.loyalty_point_rewards(id) on delete cascade,
  enabled         boolean not null default true,
  discount_type   text not null check (discount_type in ('fixed_amount','percentage')),
  -- fixed_amount: beløb INKL. moms i mindste enhed.
  amount_minor    bigint check (amount_minor is null or amount_minor > 0),
  currency        text check (currency is null or currency ~ '^[A-Z]{3}$'),
  -- percentage: basispoint (1000 = 10 %).
  percentage_bp   int check (percentage_bp is null or percentage_bp between 1 and 10000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (provider, point_reward_id),
  check (
    (discount_type = 'fixed_amount' and amount_minor is not null and currency is not null and percentage_bp is null)
    or
    (discount_type = 'percentage' and percentage_bp is not null and amount_minor is null)
  )
);
create index if not exists commerce_reward_channels_company_idx
  on public.commerce_reward_channels (company_id);

-- ---------------------------------------------------------- ordrens tilstand
-- DEN SENEST KENDTE, NORMALISEREDE TILSTAND — ikke platformens ordre. Ingen
-- varenavne, ingen adresse, intet `provider_metadata`. Beløbene og
-- refunderingernes summer står her, så support kan se, HVORFOR et bidrag er,
-- som det er, og så en ældre tilstand kan genkendes og afvises.
create table if not exists public.commerce_orders (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null references public.companies(id) on delete cascade,
  integration_id         uuid not null references public.commerce_integrations(id) on delete cascade,
  external_order_id      text not null check (char_length(external_order_id) between 1 and 255),
  external_order_number  text not null,
  order_status           text not null check (order_status in ('open','completed','cancelled')),
  payment_status         text not null check (payment_status in
                           ('unpaid','paid','partially_refunded','refunded','failed','voided')),
  currency               text not null check (currency ~ '^[A-Z]{3}$'),
  order_created_at       timestamptz not null,
  order_updated_at       timestamptz not null,
  paid_at                timestamptz,
  observed_at            timestamptz not null,
  amounts                jsonb not null,
  refunds                jsonb not null default '[]'::jsonb,
  eligible_spend_minor   bigint not null check (eligible_spend_minor >= 0),
  earning_qualified      boolean not null,
  external_customer_id   text,
  -- NORMALISERET E-MAIL (trim + små bogstaver). Bruges KUN til at genkende en
  -- kunde, der ikke er fundet endnu, og nulstilles, når ordren er knyttet til
  -- et medlem. Aldrig et samtykke.
  customer_email_norm    text,
  member_id              uuid references public.loyalty_members(id) on delete set null,
  -- 'expired': identiteten er slettet efter 90 dage uden aktivitet (se
  -- commerce_oprydning). Ordren er der stadig; e-mailen er ikke.
  customer_resolution    text not null check (customer_resolution in
                           ('link','email','unknown','ambiguous','expired')),
  state_hash             text not null,
  last_request_id        uuid,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (integration_id, external_order_id)
);
create index if not exists commerce_orders_company_idx
  on public.commerce_orders (company_id, updated_at desc);
create index if not exists commerce_orders_member_idx
  on public.commerce_orders (member_id) where member_id is not null;
create index if not exists commerce_orders_afventer_idx
  on public.commerce_orders (company_id, customer_email_norm)
  where member_id is null and customer_email_norm is not null;

-- ------------------------------------------------------------------ bidraget
-- ÉN RÆKKE PR. ORDRE PR. PROGRAM. `target` er, hvad ordren SKAL have givet
-- efter programmets regler; `applied` er, hvad der faktisk ER bogført. Kun
-- forskellen bogføres, så en dublet giver 0 og en refundering et negativt tal.
create table if not exists public.commerce_order_contributions (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  integration_id   uuid not null references public.commerce_integrations(id) on delete cascade,
  order_id         uuid not null references public.commerce_orders(id) on delete cascade,
  external_order_id text not null,
  point_program_id uuid references public.loyalty_point_programs(id) on delete cascade,
  stamp_program_id uuid references public.loyalty_programs(id) on delete cascade,
  member_id        uuid references public.loyalty_members(id) on delete set null,
  target           int not null default 0 check (target >= 0),
  applied          int not null default 0 check (applied >= 0),
  -- Tæller bogføringer, så hver ledgerlinje får sin egen reference
  -- (`commerce:<id>:<n>`) — det er den, ledgerens unikke indeks spærrer på.
  ledger_seq       int not null default 0,
  status           text not null default 'pending' check (status in
                     ('pending','applied','awaiting_customer','blocked','member_deleted',
                      'identity_expired')),
  status_reason    text,
  last_calculated_at timestamptz not null default now(),
  last_applied_at  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check ((point_program_id is null) <> (stamp_program_id is null))
);
create unique index if not exists commerce_contrib_point_idx
  on public.commerce_order_contributions (order_id, point_program_id)
  where point_program_id is not null;
create unique index if not exists commerce_contrib_stamp_idx
  on public.commerce_order_contributions (order_id, stamp_program_id)
  where stamp_program_id is not null;
create index if not exists commerce_contrib_company_idx
  on public.commerce_order_contributions (company_id, updated_at desc);
create index if not exists commerce_contrib_member_idx
  on public.commerce_order_contributions (member_id) where member_id is not null;

-- ----------------------------------------------------------- kundekoblingen
-- EN E-MAIL PÅ EN ORDRE ER NOK TIL AT OPTJENE — MEN ALDRIG TIL AT BRUGE.
-- Point må kun bruges i webshoppen gennem en BEKRÆFTET kobling: kunden har
-- klikket på et link i sin egen indbakke (link_method = verified_email).
create table if not exists public.commerce_customer_links (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references public.companies(id) on delete cascade,
  integration_id       uuid not null references public.commerce_integrations(id) on delete cascade,
  external_customer_id text,
  email_norm           text not null,
  -- En kobling til et medlem, der er slettet (opbevaringsfristen), er
  -- meningsløs og forsvinder med det.
  member_id            uuid references public.loyalty_members(id) on delete cascade,
  -- Den UIGENNEMSIGTIGE reference, adapteren gemmer. Ikke medlemmets id.
  customer_ref         text not null unique check (customer_ref ~ '^lc_[0-9a-f]{32}$'),
  status               commerce_link_status not null default 'pending',
  link_method          text check (link_method is null or link_method in
                         ('verified_email','loyalsum_login','store_owner_confirmed')),
  verification_token_hash text unique,
  verification_expires_at timestamptz,
  verification_sent_at timestamptz,
  verified_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (status <> 'verified' or (member_id is not null and verified_at is not null))
);
create unique index if not exists commerce_customer_links_kunde_idx
  on public.commerce_customer_links
     (integration_id, coalesce(external_customer_id, ''), email_norm);
create index if not exists commerce_customer_links_member_idx
  on public.commerce_customer_links (member_id) where member_id is not null;

-- --------------------------------------------------------------- reservation
create table if not exists public.commerce_reward_reservations (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  integration_id    uuid not null references public.commerce_integrations(id) on delete cascade,
  link_id           uuid not null references public.commerce_customer_links(id) on delete cascade,
  member_id         uuid not null references public.loyalty_members(id) on delete cascade,
  point_program_id  uuid not null references public.loyalty_point_programs(id) on delete cascade,
  point_reward_id   uuid references public.loyalty_point_rewards(id) on delete set null,
  -- Aftryk: navnet og prisen i det øjeblik, kunden fik rabatten.
  reward_navn       text not null,
  points_reserved   int not null check (points_reserved > 0),
  discount_type     text not null check (discount_type in ('fixed_amount','percentage')),
  discount_minor    bigint not null check (discount_minor > 0),
  currency          text not null check (currency ~ '^[A-Z]{3}$'),
  external_cart_ref text not null check (char_length(external_cart_ref) between 1 and 255),
  status            commerce_reservation_status not null default 'reserved',
  expires_at        timestamptz not null,
  committed_at      timestamptz,
  released_at       timestamptz,
  expired_at        timestamptz,
  external_order_id text,
  redeem_txn_id     uuid references public.loyalty_point_transactions(id) on delete set null,
  refund_reversal_txn_id uuid references public.loyalty_point_transactions(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (status <> 'committed' or external_order_id is not null)
);
-- Samme kurv + samme belønning = samme reservation (et gentaget klik).
create unique index if not exists commerce_reservations_kurv_idx
  on public.commerce_reward_reservations (integration_id, external_cart_ref, point_reward_id)
  where status = 'reserved';
create index if not exists commerce_reservations_aktive_idx
  on public.commerce_reward_reservations (point_program_id, member_id)
  where status = 'reserved';
create index if not exists commerce_reservations_udloeb_idx
  on public.commerce_reward_reservations (expires_at)
  where status = 'reserved';
create index if not exists commerce_reservations_ordre_idx
  on public.commerce_reward_reservations (integration_id, external_order_id)
  where external_order_id is not null;

-- ------------------------------------------------------------------------ RLS
-- Ejeren må LÆSE sin egen butiks rækker (dashboardet); alle skrivninger sker
-- med service-role efter en kontrol i koden — samme mønster som 0044.
-- Hemmeligheden ligger i commerce_integrations og læses aldrig af klienten:
-- dashboardet vælger eksplicit kolonner, og RLS giver kun egen virksomhed.
do $$
declare t text;
begin
  foreach t in array array[
    'commerce_integrations','commerce_pairing_codes','commerce_request_ids',
    'commerce_rate_windows','commerce_program_channels','commerce_reward_channels',
    'commerce_orders','commerce_order_contributions','commerce_customer_links',
    'commerce_reward_reservations'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;

  foreach t in array array[
    'commerce_program_channels','commerce_reward_channels','commerce_orders',
    'commerce_order_contributions','commerce_reward_reservations'
  ]
  loop
    execute format('drop policy if exists %I_owner_select on public.%I', t, t);
    execute format(
      'create policy %I_owner_select on public.%I for select using (public.is_admin() or company_id in (select id from public.companies where user_id = auth.uid()))',
      t, t
    );
  end loop;
end $$;
-- commerce_integrations, pairing codes, request ids, rate windows og links har
-- BEVIDST ingen policy: de bærer en krypteret nøgle, kodehashes eller kundens
-- e-mail, og dashboardet læser dem med service-role og udvalgte kolonner.

-- =========================================================================
-- FUNKTIONERNE
-- =========================================================================

/**
 * GODKEND EN SIGNERET ANMODNING: gentagelse og hastighedsgrænse i ÉT kald.
 *
 * Kaldes EFTER at signaturen er efterprøvet i koden — ellers kunne en fremmed
 * brænde request-id'er af. Primærnøglen afgør gentagelsen (to samtidige kald
 * med samme id: præcis ét får en række). Tælleren er en upsert i samme
 * sætning, så den ikke kan tabe et kald.
 *
 * RYDDER OP EFTER SIG: gamle request-id'er for DENNE integration slettes her,
 * så tabellen aldrig vokser ubegrænset, selv hvis natkørslen står stille.
 */
create or replace function public.commerce_godkend(
  p_integration    uuid,
  p_request_id     uuid,
  p_limit          int,
  p_window_seconds int,
  p_replay_seconds int
)
returns jsonb
language plpgsql
as $$
declare
  vindue timestamptz;
  antal  int;
  ny     int;
begin
  insert into public.commerce_request_ids (integration_id, request_id)
  values (p_integration, p_request_id)
  on conflict do nothing;
  get diagnostics ny = row_count;
  if ny = 0 then
    return jsonb_build_object('ok', false, 'fejl', 'replay_detected');
  end if;

  vindue := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.commerce_rate_windows (integration_id, window_start, requests)
  values (p_integration, vindue, 1)
  on conflict (integration_id, window_start)
  do update set requests = public.commerce_rate_windows.requests + 1
  returning requests into antal;

  -- Oprydning for denne integration. Et request-id skal huskes længere end
  -- tidsstemplets vindue (±300 s), ellers kunne det genbruges lige efter.
  delete from public.commerce_request_ids
   where integration_id = p_integration
     and received_at < now() - make_interval(secs => p_replay_seconds);
  delete from public.commerce_rate_windows
   where integration_id = p_integration
     and window_start < vindue - interval '1 hour';

  if antal > p_limit then
    return jsonb_build_object(
      'ok', false, 'fejl', 'rate_limited',
      'retry_after', ceil(extract(epoch from (vindue + make_interval(secs => p_window_seconds) - now())))::int
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

/**
 * PARRING: indløs engangskoden og opret (eller genopliv) integrationen — i én
 * transaktion, så en afvist parring ikke har brugt koden.
 *
 * Koden er BETINGET indløst (`used_at is null and expires_at > now()`), så to
 * samtidige forsøg med samme kode ikke begge kan lykkes.
 *
 * GENFORBINDELSE: findes der en afbrudt integration for samme butik OG samme
 * virksomhed, genopliver vi den med en ny nøgle i stedet for at lave en ny.
 * Ordrerne er nøglet på integrationen, så en gensynkronisering af gamle
 * ordrer rammer de gamle bidrag og giver ikke point igen.
 */
create or replace function public.commerce_par(
  p_code_hash         text,
  p_provider          commerce_provider,
  p_external_store_id text,
  p_store_url         text,
  p_store_name        text,
  p_currency          text,
  p_adapter_version   text,
  p_platform_version  text,
  p_secret_ciphertext text
)
returns jsonb
language plpgsql
as $$
declare
  kode public.commerce_pairing_codes;
  levende public.commerce_integrations;
  gammel public.commerce_integrations;
  ny_id uuid;
begin
  update public.commerce_pairing_codes
     set used_at = now()
   where code_hash = p_code_hash
     and used_at is null
     and expires_at > now()
  returning * into kode;

  if kode.id is null then
    return jsonb_build_object('ok', false, 'fejl', 'invalid_pairing_code');
  end if;

  if kode.provider <> p_provider then
    raise exception using errcode = 'P0001', message = 'provider_mismatch';
  end if;

  select * into levende
    from public.commerce_integrations
   where provider = p_provider
     and external_store_id = p_external_store_id
     and status <> 'revoked'
   for update;

  if levende.id is not null then
    if levende.company_id <> kode.company_id then
      -- Butikken er forbundet til en ANDEN virksomhed. Den skal afbrydes
      -- dér først; ellers kunne en fremmed kode stjæle en butiks ordrer.
      raise exception using errcode = 'P0001', message = 'store_already_paired';
    end if;
    -- Samme virksomhed parrer igen (pluginet er geninstalleret og har mistet
    -- nøglen): ny nøgle, samme integration.
    update public.commerce_integrations
       set secret_ciphertext = p_secret_ciphertext,
           store_url = p_store_url,
           store_name = p_store_name,
           currency = p_currency,
           adapter_version = p_adapter_version,
           platform_version = p_platform_version,
           status = 'active',
           connected_at = now(),
           updated_at = now()
     where id = levende.id;
    ny_id := levende.id;
  else
    select * into gammel
      from public.commerce_integrations
     where provider = p_provider
       and external_store_id = p_external_store_id
       and company_id = kode.company_id
       and status = 'revoked'
     order by disconnected_at desc nulls last
     limit 1
     for update;

    if gammel.id is not null then
      update public.commerce_integrations
         set secret_ciphertext = p_secret_ciphertext,
             store_url = p_store_url,
             store_name = p_store_name,
             currency = p_currency,
             adapter_version = p_adapter_version,
             platform_version = p_platform_version,
             status = 'active',
             connected_at = now(),
             disconnected_at = null,
             last_error_at = null,
             last_error_code = null,
             updated_at = now()
       where id = gammel.id;
      ny_id := gammel.id;
    else
      insert into public.commerce_integrations (
        company_id, provider, external_store_id, store_url, store_name,
        currency, adapter_version, platform_version, secret_ciphertext
      ) values (
        kode.company_id, p_provider, p_external_store_id, p_store_url, p_store_name,
        p_currency, p_adapter_version, p_platform_version, p_secret_ciphertext
      ) returning id into ny_id;
    end if;
  end if;

  update public.commerce_pairing_codes
     set integration_id = ny_id
   where id = kode.id;

  return jsonb_build_object('ok', true, 'integration_id', ny_id,
                            'company_id', kode.company_id);
exception
  when raise_exception then
    -- Rul koden tilbage (hele blokken annulleres) og sig hvorfor.
    return jsonb_build_object('ok', false, 'fejl', sqlerrm);
  when unique_violation then
    return jsonb_build_object('ok', false, 'fejl', 'store_already_paired');
end;
$$;

/**
 * AFBRYD: nøglen slettes, nye kald afvises, historikken bliver. Aktive
 * reservationer frigives, så kundens point ikke hænger fast.
 */
create or replace function public.commerce_afbryd(
  p_company     uuid,
  p_integration uuid
)
returns jsonb
language plpgsql
as $$
declare
  n int;
begin
  update public.commerce_integrations
     set status = 'revoked',
         secret_ciphertext = null,
         disconnected_at = now(),
         updated_at = now()
   where id = p_integration
     and company_id = p_company
     and status <> 'revoked';
  get diagnostics n = row_count;
  if n = 0 then
    return jsonb_build_object('ok', false, 'fejl', 'ikke-fundet');
  end if;

  update public.commerce_reward_reservations
     set status = 'released', released_at = now(), updated_at = now()
   where integration_id = p_integration and status = 'reserved';

  return jsonb_build_object('ok', true);
end;
$$;

/**
 * ANVEND POINTBIDRAGET: bogfør forskellen mellem target og applied i den
 * EKSISTERENDE pointledger via `point_giv()`.
 *
 * Bidragsrækken låses først, så to samtidige kald ikke begge ser samme
 * `applied`. Hver bogføring får sin egen reference (`commerce:<id>:<n>`), og
 * `point_giv()`s unikke indeks gør en gentagelse til den samme linje.
 *
 * NEGATIVT DELTA KAN IKKE GÅ UNDER NUL. Har kunden allerede brugt de point, en
 * refundering skal tage tilbage, trækkes det, der er; resten står som
 * `applied > target` og tages ved næste synkronisering, hvis saldoen til den
 * tid rækker. En saldo i minus findes ikke i LoyalSum (0044's check).
 *
 * PAUSET PROGRAM: `point_giv()` afviser — samme regel som ved disken. Bidraget
 * står som `blocked` og anvendes ved næste synkronisering.
 */
create or replace function public.commerce_anvend_pointbidrag(p_contribution uuid)
returns jsonb
language plpgsql
as $$
declare
  c      public.commerce_order_contributions;
  o      public.commerce_orders;
  konto  public.loyalty_point_accounts;
  delta  int;
  faktisk int;
  svar   jsonb;
  foer   int;
  ref    text;
  opslag text;
  vente  text;
begin
  select * into c
    from public.commerce_order_contributions
   where id = p_contribution
   for update;
  if c.id is null or c.point_program_id is null then
    return jsonb_build_object('ok', false, 'fejl', 'ikke-fundet');
  end if;

  foer := c.applied;

  if c.member_id is null then
    if c.applied <> 0 then
      update public.commerce_order_contributions
         set status = 'member_deleted', updated_at = now()
       where id = c.id;
      return jsonb_build_object('ok', true, 'foer', foer, 'efter', foer, 'status', 'member_deleted');
    end if;
    select customer_resolution into opslag from public.commerce_orders where id = c.order_id;
    vente := case when c.target = 0 then 'applied'
                  when opslag = 'expired' then 'identity_expired'
                  else 'awaiting_customer' end;
    update public.commerce_order_contributions
       set status = vente, updated_at = now()
     where id = c.id;
    return jsonb_build_object('ok', true, 'foer', foer, 'efter', foer, 'status', vente);
  end if;

  delta := c.target - c.applied;
  if delta = 0 then
    update public.commerce_order_contributions
       set status = 'applied', status_reason = null, updated_at = now()
     where id = c.id and status <> 'applied';
    return jsonb_build_object('ok', true, 'foer', foer, 'efter', foer, 'status', 'applied');
  end if;

  select * into o from public.commerce_orders where id = c.order_id;
  ref := 'commerce:' || c.id::text || ':' || (c.ledger_seq + 1)::text;

  if delta > 0 then
    faktisk := delta;
    svar := public.point_giv(
      c.company_id, c.point_program_id, c.member_id, faktisk, 'earn',
      case when o.eligible_spend_minor <= 9999999999 then round(o.eligible_spend_minor / 100.0, 2) else null end,
      ref, null, null,
      'Webshopkøb ' || o.external_order_number
    );
  else
    konto := public.point_konto_laast(c.company_id, c.point_program_id, c.member_id);
    faktisk := greatest(delta, -konto.balance);
    if faktisk = 0 then
      update public.commerce_order_contributions
         set status = 'blocked', status_reason = 'saldo-raekker-ikke', updated_at = now()
       where id = c.id;
      return jsonb_build_object('ok', true, 'foer', foer, 'efter', foer,
                                'status', 'blocked', 'grund', 'saldo-raekker-ikke');
    end if;
    svar := public.point_giv(
      c.company_id, c.point_program_id, c.member_id, faktisk, 'adjust_remove',
      null, ref, null, null,
      'Webshopordre ' || o.external_order_number || ' refunderet'
    );
  end if;

  if not coalesce((svar ->> 'ok')::boolean, false) then
    update public.commerce_order_contributions
       set status = 'blocked', status_reason = svar ->> 'fejl', updated_at = now()
     where id = c.id;
    return jsonb_build_object('ok', true, 'foer', foer, 'efter', foer,
                              'status', 'blocked', 'grund', svar ->> 'fejl');
  end if;

  update public.commerce_order_contributions
     set applied = c.applied + faktisk,
         ledger_seq = c.ledger_seq + 1,
         status = case when c.applied + faktisk = c.target then 'applied' else 'blocked' end,
         status_reason = case when c.applied + faktisk = c.target then null else 'saldo-raekker-ikke' end,
         last_applied_at = now(),
         updated_at = now()
   where id = c.id;

  return jsonb_build_object('ok', true, 'foer', foer, 'efter', foer + faktisk,
    'status', case when foer + faktisk = c.target then 'applied' else 'blocked' end,
    'txn', svar ->> 'txn');
end;
$$;

/**
 * GIV EN FULDT REFUNDERET ORDRES BELØNNING TILBAGE — ÉN GANG.
 *
 * En committed reservation har trukket point med en `redeem`-linje. Bliver
 * ordren fuldt refunderet, annulleres den linje med `point_annuller()` —
 * en modpost, aldrig en sletning — og `loyalty_point_txn_en_annullering_idx`
 * (0044) afgør i basen, at det kun kan ske én gang. En delvis refundering
 * giver BEVIDST ikke point tilbage i V1: belønningen er brugt.
 */
create or replace function public.commerce_tilbagefoer_beloenninger(
  p_integration uuid,
  p_external_order_id text
)
returns int
language plpgsql
as $$
declare
  r public.commerce_reward_reservations;
  svar jsonb;
  antal int := 0;
  modpost uuid;
begin
  for r in
    select * from public.commerce_reward_reservations
     where integration_id = p_integration
       and external_order_id = p_external_order_id
       and status = 'committed'
       and redeem_txn_id is not null
       and refund_reversal_txn_id is null
     for update
  loop
    svar := public.point_annuller(r.company_id, r.redeem_txn_id, null, null,
                                  'Webshopordre refunderet — belønningen er givet tilbage');
    if coalesce((svar ->> 'ok')::boolean, false) then
      modpost := (svar ->> 'txn')::uuid;
    elsif svar ->> 'fejl' = 'allerede-annulleret' then
      select id into modpost from public.loyalty_point_transactions
       where reversal_of = r.redeem_txn_id;
    else
      continue; -- fx pauset program: prøves igen ved næste synkronisering
    end if;
    update public.commerce_reward_reservations
       set refund_reversal_txn_id = modpost, updated_at = now()
     where id = r.id;
    antal := antal + 1;
  end loop;
  return antal;
end;
$$;

/**
 * SYNKRONISÉR EN ORDRES NUVÆRENDE TILSTAND.
 *
 * Koden har allerede valideret ordren mod kontrakten, regnet eligible spend
 * og programmernes target ud. Her sker det, der kræver en lås:
 *
 *  1. Ordrerækken oprettes eller LÅSES.
 *  2. ÆLDRE TILSTAND AFVISES: er `observed_at` ELLER ordrens `updated_at`
 *     ældre end den gemte, er det en forsinket hændelse, og intet ændres.
 *  3. Tilstanden gemmes, bidragene får deres nye target, og pointbidragene
 *     bogføres. Stempelbidragene bogføres bagefter i koden af `giveStamp()`.
 *  4. En fuld refundering giver committede belønninger tilbage (FØR
 *     pointene bogføres — se låserækkefølgen nedenfor).
 *
 * p_targets: [{ "kind": "points"|"stamps", "program_id": uuid, "target": int }]
 */
create or replace function public.commerce_synk_ordre(
  p_integration uuid,
  p_order       jsonb,
  p_observed_at timestamptz,
  p_state_hash  text,
  p_eligible    bigint,
  p_qualified   boolean,
  p_member      uuid,
  p_resolution  text,
  p_targets     jsonb,
  p_request_id  uuid
)
returns jsonb
language plpgsql
as $$
declare
  integ   public.commerce_integrations;
  o       public.commerce_orders;
  ny      boolean := false;
  t       jsonb;
  c       public.commerce_order_contributions;
  resultat jsonb := '[]'::jsonb;
  anvendt jsonb;
  medlem  uuid;
  udloebet boolean := false;
  opd_ts  timestamptz := (p_order ->> 'updated_at')::timestamptz;
begin
  select * into integ from public.commerce_integrations
   where id = p_integration;
  if integ.id is null or integ.status <> 'active' then
    return jsonb_build_object('ok', false, 'fejl', 'integration_inactive');
  end if;

  insert into public.commerce_orders (
    company_id, integration_id, external_order_id, external_order_number,
    order_status, payment_status, currency, order_created_at, order_updated_at,
    paid_at, observed_at, amounts, refunds, eligible_spend_minor,
    earning_qualified, external_customer_id, customer_email_norm, member_id,
    customer_resolution, state_hash, last_request_id
  ) values (
    integ.company_id, integ.id, p_order ->> 'external_order_id',
    p_order ->> 'external_order_number', p_order ->> 'order_status',
    p_order ->> 'payment_status', p_order ->> 'currency',
    (p_order ->> 'created_at')::timestamptz, opd_ts,
    (p_order ->> 'paid_at')::timestamptz, p_observed_at,
    p_order -> 'amounts', coalesce(p_order -> 'refunds', '[]'::jsonb),
    p_eligible, p_qualified, p_order ->> 'external_customer_id',
    case when p_member is null then p_order ->> 'email_norm' else null end,
    p_member, p_resolution, p_state_hash, p_request_id
  )
  on conflict (integration_id, external_order_id) do nothing
  returning * into o;

  if o.id is not null then
    ny := true;
  else
    select * into o from public.commerce_orders
     where integration_id = integ.id
       and external_order_id = p_order ->> 'external_order_id'
     for update;

    -- ÆLDRE TILSTAND ÆNDRER INTET. Svaret er den tilstand, der ER.
    if p_observed_at < o.observed_at or opd_ts < o.order_updated_at then
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', x.id, 'kind', case when x.point_program_id is null then 'stamps' else 'points' end,
               'program_id', coalesce(x.point_program_id, x.stamp_program_id),
               'target', x.target, 'foer', x.applied, 'efter', x.applied,
               'status', x.status)), '[]'::jsonb)
        into resultat
        from public.commerce_order_contributions x
       where x.order_id = o.id;
      return jsonb_build_object('ok', true, 'stale', true, 'order_id', o.id,
                                'member_id', o.member_id, 'bidrag', resultat);
    end if;

    -- ÉN GANG KNYTTET, ALTID KNYTTET: et medlem flyttes ikke af en senere
    -- tilstand, ellers kunne en ændret e-mail på ordren flytte optjente point.
    --
    -- EN UDLØBET IDENTITET (90 dage, commerce_oprydning) KOMMER IKKE TILBAGE AF
    -- EN GENSENDELSE. Pluginets periodiske afstemning sender den samme ordre
    -- igen; det er ikke kundens aktivitet, og uden denne regel ville
    -- sletningen kunne omgås af en natlig gensynkronisering. Kun en ordre, der
    -- faktisk er ÆNDRET på platformen (nyere updated_at), åbner igen.
    if o.member_id is null and o.customer_resolution = 'expired'
       and opd_ts <= o.order_updated_at then
      medlem := null;
      udloebet := true;
    else
      medlem := coalesce(o.member_id, p_member);
      udloebet := false;
    end if;

    update public.commerce_orders
       set external_order_number = p_order ->> 'external_order_number',
           order_status = p_order ->> 'order_status',
           payment_status = p_order ->> 'payment_status',
           order_updated_at = opd_ts,
           paid_at = (p_order ->> 'paid_at')::timestamptz,
           observed_at = p_observed_at,
           amounts = p_order -> 'amounts',
           refunds = coalesce(p_order -> 'refunds', '[]'::jsonb),
           eligible_spend_minor = p_eligible,
           earning_qualified = p_qualified,
           external_customer_id = p_order ->> 'external_customer_id',
           member_id = medlem,
           customer_email_norm = case when medlem is null and not udloebet
                                      then p_order ->> 'email_norm' else null end,
           customer_resolution = case when o.member_id is not null then o.customer_resolution
                                      when udloebet then 'expired'
                                      else p_resolution end,
           state_hash = p_state_hash,
           last_request_id = p_request_id,
           updated_at = now()
     where id = o.id
    returning * into o;
  end if;

  -- LÅSERÆKKEFØLGEN: reservationerne FØR pointkontoen. `commerce_commit()`
  -- tager dem i samme rækkefølge (reservation → konto), så en commit og en
  -- synkronisering af samme refunderede ordre ikke kan vente på hinanden i
  -- ring (deadlock).
  if o.payment_status = 'refunded' then
    perform public.commerce_tilbagefoer_beloenninger(integ.id, o.external_order_id);
  end if;

  for t in select * from jsonb_array_elements(coalesce(p_targets, '[]'::jsonb))
  loop
    if t ->> 'kind' = 'points' then
      insert into public.commerce_order_contributions (
        company_id, integration_id, order_id, external_order_id,
        point_program_id, member_id, target
      ) values (
        integ.company_id, integ.id, o.id, o.external_order_id,
        (t ->> 'program_id')::uuid, o.member_id, (t ->> 'target')::int
      )
      on conflict (order_id, point_program_id) where point_program_id is not null
      do update set target = excluded.target,
                    -- Et medlem sættes kun på et bidrag, der intet har
                    -- bogført endnu. Er medlemmet slettet efter en
                    -- bogføring, flyttes pointene ikke til en ny kunde.
                    member_id = case
                      when public.commerce_order_contributions.member_id is null
                       and public.commerce_order_contributions.applied = 0
                      then excluded.member_id
                      else public.commerce_order_contributions.member_id end,
                    last_calculated_at = now(),
                    updated_at = now()
      returning * into c;
    else
      insert into public.commerce_order_contributions (
        company_id, integration_id, order_id, external_order_id,
        stamp_program_id, member_id, target
      ) values (
        integ.company_id, integ.id, o.id, o.external_order_id,
        (t ->> 'program_id')::uuid, o.member_id, (t ->> 'target')::int
      )
      on conflict (order_id, stamp_program_id) where stamp_program_id is not null
      do update set target = excluded.target,
                    -- Et medlem sættes kun på et bidrag, der intet har
                    -- bogført endnu. Er medlemmet slettet efter en
                    -- bogføring, flyttes pointene ikke til en ny kunde.
                    member_id = case
                      when public.commerce_order_contributions.member_id is null
                       and public.commerce_order_contributions.applied = 0
                      then excluded.member_id
                      else public.commerce_order_contributions.member_id end,
                    last_calculated_at = now(),
                    updated_at = now()
      returning * into c;
    end if;

    if c.point_program_id is not null then
      anvendt := public.commerce_anvend_pointbidrag(c.id);
      resultat := resultat || jsonb_build_array(jsonb_build_object(
        'id', c.id, 'kind', 'points', 'program_id', c.point_program_id,
        'target', c.target, 'foer', anvendt -> 'foer', 'efter', anvendt -> 'efter',
        'status', anvendt ->> 'status', 'grund', anvendt ->> 'grund'));
    else
      resultat := resultat || jsonb_build_array(jsonb_build_object(
        'id', c.id, 'kind', 'stamps', 'program_id', c.stamp_program_id,
        'target', c.target, 'foer', c.applied, 'efter', c.applied,
        'status', c.status));
    end if;
  end loop;

  update public.commerce_integrations
     set last_successful_sync_at = now(), updated_at = now()
   where id = integ.id;

  return jsonb_build_object('ok', true, 'stale', false, 'ny', ny,
                            'order_id', o.id, 'member_id', o.member_id,
                            'bidrag', resultat);
end;
$$;

/**
 * GØR KRAV PÅ VENTENDE OPTJENING, når en kunde har bekræftet sin e-mail.
 *
 * Kun inden for SAMME virksomhed, og kun ordrer, der endnu ikke er knyttet
 * til nogen. Idempotent: anden gang er der ingen ordrer tilbage at knytte.
 * Pointbidragene bogføres her; stempelbidragene returneres, så koden kan
 * lade `giveStamp()` gøre dem.
 */
create or replace function public.commerce_goer_krav(
  p_company    uuid,
  p_member     uuid,
  p_email_norm text
)
returns jsonb
language plpgsql
as $$
declare
  medlem public.loyalty_members;
  ordre_ids uuid[];
  c public.commerce_order_contributions;
  stempler jsonb := '[]'::jsonb;
  point int := 0;
begin
  select * into medlem from public.loyalty_members
   where id = p_member and company_id = p_company;
  if medlem.id is null then
    return jsonb_build_object('ok', false, 'fejl', 'medlem-findes-ikke');
  end if;

  with knyttet as (
    update public.commerce_orders
       set member_id = p_member,
           customer_email_norm = null,
           customer_resolution = 'link',
           updated_at = now()
     where company_id = p_company
       and member_id is null
       and customer_email_norm = p_email_norm
    returning id
  )
  select coalesce(array_agg(id), '{}') into ordre_ids from knyttet;

  update public.commerce_order_contributions
     set member_id = p_member, updated_at = now()
   where order_id = any (ordre_ids) and member_id is null and applied = 0;

  for c in
    select * from public.commerce_order_contributions
     where order_id = any (ordre_ids) and member_id = p_member
  loop
    if c.point_program_id is not null then
      perform public.commerce_anvend_pointbidrag(c.id);
      point := point + 1;
    else
      stempler := stempler || to_jsonb(c.id);
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'ordrer', coalesce(array_length(ordre_ids, 1), 0),
                            'pointbidrag', point, 'stempelbidrag', stempler);
end;
$$;

/**
 * FIND KUNDEN PÅ E-MAIL — INDEN FOR ÉN VIRKSOMHED.
 *
 * Medlemmernes e-mail er gemt, som den blev tastet, og det unikke indeks
 * (0042) skelner mellem store og små bogstaver. Sammenligningen her gør ikke:
 * `Kunde@Example.com` er samme kunde som `kunde@example.com`. Derfor kan der
 * findes TO rækker, der passer — og så gættes der ikke: koden får begge id'er
 * og behandler ordren som tvetydig. `limit 2` er nok til at se forskel på
 * "én" og "flere".
 *
 * En SQL-funktion og ikke et `ilike` fra koden: i et mønster er `_` et
 * jokertegn, og det står i mange e-mailadresser.
 */
create or replace function public.commerce_find_medlemmer(p_company uuid, p_email_norm text)
returns setof uuid
language sql
stable
as $$
  select id from public.loyalty_members
   where company_id = p_company
     and lower(btrim(email)) = p_email_norm
   order by created_at
   limit 2;
$$;

/**
 * BRUGBAR SALDO — ÉN DEFINITION FOR AL POINTFORBRUG I LOYALSUM.
 *
 *   brugbar = saldo − point, der er holdt af til en kurv lige nu
 *
 * Kun `reserved` med `expires_at > now()` tæller. `committed` er allerede
 * trukket fra saldoen (at tælle den igen ville trække den to gange),
 * `released` og `expired` er givet fri.
 *
 * DEN GÆLDER OVERALT, HVOR POINT BRUGES: webshoppens reservation
 * (`commerce_reserver`), webshoppens commit (`commerce_commit`) og disken
 * (`point_indloes`, redefineret nedenfor). Uden det kunne en kunde med 620
 * point reservere 500 i webshoppen og derefter indløse 500 ved disken — og
 * webshoppens rabat, der allerede er givet i kurven, ville ikke kunne
 * betales. En kommende Shopify-adapter bruger de samme tabeller og får
 * reglen af sig selv.
 *
 * OPTJENING ER URØRT. Kun forbrug spørger her; en rettelse (adjust_remove,
 * annullering) er ikke forbrug og kan gå ned i det reserverede — så afviser
 * commit'en med `insufficient_points` i stedet for at gøre saldoen negativ.
 *
 * KALDES MED KONTOEN LÅST (`point_konto_laast`), når der skal besluttes noget:
 * reservationen og disken tager begge låsen FØR de tæller, så to forbrug på
 * samme konto kan ikke begge se de samme point som ledige.
 */
create or replace function public.point_reserverede(p_program uuid, p_member uuid)
returns int
language sql
stable
as $$
  select coalesce(sum(points_reserved), 0)::int
    from public.commerce_reward_reservations
   where point_program_id = p_program
     and member_id = p_member
     and status = 'reserved'
     and expires_at > now();
$$;

create or replace function public.point_brugbar_saldo(p_program uuid, p_member uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'saldo', coalesce(a.balance, 0),
    'reserveret', public.point_reserverede(p_program, p_member),
    'brugbar', greatest(0, coalesce(a.balance, 0) - public.point_reserverede(p_program, p_member))
  )
  from (select 1) x
  left join public.loyalty_point_accounts a
    on a.program_id = p_program and a.member_id = p_member;
$$;

/** Reserverede point pr. program for ét medlem — til kort og personalepanel. */
create or replace function public.point_reserverede_for_medlem(p_company uuid, p_member uuid)
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_object_agg(point_program_id, n), '{}'::jsonb)
    from (
      select point_program_id, sum(points_reserved)::int as n
        from public.commerce_reward_reservations
       where company_id = p_company
         and member_id = p_member
         and status = 'reserved'
         and expires_at > now()
       group by point_program_id
    ) x;
$$;

/**
 * INDLØSNING VED DISKEN — 0044's funktion med ÉN ændring: den trækker kun på
 * den BRUGBARE saldo. Alt andet (prisen læst i basen, ejerskabet i
 * forespørgslen, aftrykket, idempotensnøglen) er uændret.
 *
 * Fejlkoden skelner: `point-reserveret` betyder, at kunden HAR pointene, men
 * at de er holdt af til en webshopordre — personalet skal kunne sige det.
 */
create or replace function public.point_indloes(
  p_company   uuid,
  p_program   uuid,
  p_member    uuid,
  p_reward    uuid,
  p_reference text default null,
  p_employee  uuid default null,
  p_user      uuid default null
)
returns jsonb
language plpgsql
as $$
declare
  prog   public.loyalty_point_programs;
  bel    public.loyalty_point_rewards;
  konto  public.loyalty_point_accounts;
  ny_saldo int;
  txn_id uuid;
  eksisterende public.loyalty_point_transactions;
  reserveret int;
begin
  select * into prog
    from public.loyalty_point_programs
   where id = p_program and company_id = p_company;
  if not found then
    return jsonb_build_object('ok', false, 'fejl', 'program-findes-ikke');
  end if;
  if prog.status <> 'active' then
    return jsonb_build_object('ok', false, 'fejl', 'program-ikke-aktivt',
                              'status', prog.status);
  end if;

  select * into bel
    from public.loyalty_point_rewards
   where id = p_reward and program_id = p_program and company_id = p_company;
  if not found then
    return jsonb_build_object('ok', false, 'fejl', 'beloenning-findes-ikke');
  end if;
  if bel.status <> 'active' then
    return jsonb_build_object('ok', false, 'fejl', 'beloenning-ikke-aktiv');
  end if;

  konto := public.point_konto_laast(p_company, p_program, p_member);
  if konto.id is null then
    return jsonb_build_object('ok', false, 'fejl', 'konto-fejlede');
  end if;

  -- Tælles EFTER låsen: en reservation, der er ved at blive lavet, venter på
  -- samme lås og ser bagefter den nye saldo.
  reserveret := public.point_reserverede(p_program, p_member);

  begin
    update public.loyalty_point_accounts
       set balance = balance - bel.points_cost,
           updated_at = now()
     where id = konto.id
       and balance - bel.points_cost >= 0
       and balance - bel.points_cost >= reserveret
    returning balance into ny_saldo;

    if ny_saldo is null then
      return jsonb_build_object('ok', false,
                                'fejl', case when konto.balance >= bel.points_cost
                                             then 'point-reserveret' else 'for-faa-point' end,
                                'saldo', konto.balance,
                                'reserveret', reserveret,
                                'pris', bel.points_cost);
    end if;

    insert into public.loyalty_point_transactions (
      company_id, program_id, account_id, member_id, type, points,
      balance_after, reward_id, reward_navn, reward_point,
      performed_by, employee_id, reference
    ) values (
      p_company, p_program, konto.id, p_member, 'redeem', -bel.points_cost,
      ny_saldo, bel.id, bel.name, bel.points_cost,
      p_user, p_employee, p_reference
    ) returning id into txn_id;

  exception when unique_violation then
    select * into eksisterende
      from public.loyalty_point_transactions
     where account_id = konto.id and reference = p_reference;

    return jsonb_build_object(
      'ok', true, 'gentagelse', true,
      'saldo', (select balance from public.loyalty_point_accounts where id = konto.id),
      'txn', eksisterende.id,
      'pris', bel.points_cost,
      'navn', bel.name
    );
  end;

  return jsonb_build_object('ok', true, 'gentagelse', false,
                            'saldo', ny_saldo, 'txn', txn_id,
                            'pris', bel.points_cost, 'navn', bel.name);
end;
$$;

/**
 * RESERVÉR EN BELØNNING TIL ÉN KURV.
 *
 * Kontoen LÅSES (samme lås som `point_giv()`), og først derefter tælles de
 * aktive reservationer — så to samtidige checkouts ikke begge kan se de samme
 * point som ledige. Saldoen trækkes IKKE her; kun ved commit.
 *
 * Et gentaget klik (samme kurv, samme belønning) svarer med den reservation,
 * der allerede findes.
 */
create or replace function public.commerce_reserver(
  p_integration  uuid,
  p_customer_ref text,
  p_reward       uuid,
  p_cart_ref     text,
  p_cart_total   bigint,
  p_currency     text,
  p_ttl_seconds  int
)
returns jsonb
language plpgsql
as $$
declare
  integ  public.commerce_integrations;
  link   public.commerce_customer_links;
  bel    public.loyalty_point_rewards;
  prog   public.loyalty_point_programs;
  kanal  public.commerce_reward_channels;
  konto  public.loyalty_point_accounts;
  res    public.commerce_reward_reservations;
  reserveret int;
  rabat  bigint;
begin
  select * into integ from public.commerce_integrations where id = p_integration;
  if integ.id is null or integ.status <> 'active' then
    return jsonb_build_object('ok', false, 'fejl', 'integration_inactive');
  end if;

  select * into link from public.commerce_customer_links
   where customer_ref = p_customer_ref and integration_id = integ.id;
  if link.id is null or link.status <> 'verified' or link.member_id is null then
    return jsonb_build_object('ok', false, 'fejl', 'customer_not_linked');
  end if;

  -- BELØNNINGEN SKAL HØRE TIL SAMME VIRKSOMHED OG VÆRE SLÅET TIL I DENNE KANAL.
  select * into bel from public.loyalty_point_rewards
   where id = p_reward and company_id = integ.company_id;
  select * into kanal from public.commerce_reward_channels
   where point_reward_id = p_reward and provider = integ.provider and enabled;
  if bel.id is null or kanal.id is null or bel.status <> 'active' then
    return jsonb_build_object('ok', false, 'fejl', 'reward_unavailable');
  end if;

  select * into prog from public.loyalty_point_programs where id = bel.program_id;
  if prog.status <> 'active' or not exists (
       select 1 from public.commerce_program_channels
        where point_program_id = prog.id and provider = integ.provider and enabled) then
    return jsonb_build_object('ok', false, 'fejl', 'reward_unavailable');
  end if;

  if p_currency <> integ.currency then
    return jsonb_build_object('ok', false, 'fejl', 'unsupported_currency');
  end if;

  -- Et gentaget klik: samme reservation.
  select * into res from public.commerce_reward_reservations
   where integration_id = integ.id and external_cart_ref = p_cart_ref
     and point_reward_id = p_reward and status = 'reserved' and expires_at > now()
     and link_id = link.id;
  if res.id is not null then
    return jsonb_build_object('ok', true, 'gentagelse', true, 'reservation_id', res.id);
  end if;

  -- En udløbet reservation på samme kurv står i vejen for det unikke indeks.
  update public.commerce_reward_reservations
     set status = 'expired', expired_at = now(), updated_at = now()
   where integration_id = integ.id and external_cart_ref = p_cart_ref
     and point_reward_id = p_reward and status = 'reserved' and expires_at <= now();

  if kanal.discount_type = 'fixed_amount' then
    if kanal.currency <> p_currency then
      return jsonb_build_object('ok', false, 'fejl', 'unsupported_currency');
    end if;
    rabat := least(kanal.amount_minor, p_cart_total);
  else
    -- numeric, fordi beløb × basispoint kan overstige bigint.
    rabat := floor(p_cart_total::numeric * kanal.percentage_bp / 10000)::bigint;
  end if;
  if rabat <= 0 then
    return jsonb_build_object('ok', false, 'fejl', 'reward_unavailable');
  end if;

  konto := public.point_konto_laast(integ.company_id, prog.id, link.member_id);
  reserveret := public.point_reserverede(prog.id, link.member_id);
  if konto.balance - reserveret < bel.points_cost then
    return jsonb_build_object('ok', false, 'fejl', 'insufficient_points',
                              'saldo', konto.balance, 'reserveret', reserveret);
  end if;

  insert into public.commerce_reward_reservations (
    company_id, integration_id, link_id, member_id, point_program_id,
    point_reward_id, reward_navn, points_reserved, discount_type,
    discount_minor, currency, external_cart_ref, expires_at
  ) values (
    integ.company_id, integ.id, link.id, link.member_id, prog.id,
    bel.id, bel.name, bel.points_cost, kanal.discount_type,
    rabat, p_currency, p_cart_ref, now() + make_interval(secs => p_ttl_seconds)
  ) returning * into res;

  return jsonb_build_object('ok', true, 'gentagelse', false, 'reservation_id', res.id);
exception when unique_violation then
  -- En anden anmodning for samme kurv og belønning nåede det først. Svaret må
  -- KUN være den reservation, hvis den tilhører SAMME kunde — ellers ville en
  -- fremmed kurvreference give adgang til en andens reservation.
  select * into res from public.commerce_reward_reservations
   where integration_id = p_integration and external_cart_ref = p_cart_ref
     and point_reward_id = p_reward and status = 'reserved'
     and link_id = link.id;
  if res.id is null then
    return jsonb_build_object('ok', false, 'fejl', 'reservation_state_conflict');
  end if;
  return jsonb_build_object('ok', true, 'gentagelse', true, 'reservation_id', res.id);
end;
$$;

/** FRIGIV: reserved → released. Gentaget frigivelse er et svar, ikke en fejl. */
create or replace function public.commerce_frigiv(
  p_integration uuid,
  p_reservation uuid
)
returns jsonb
language plpgsql
as $$
declare
  res public.commerce_reward_reservations;
begin
  select * into res from public.commerce_reward_reservations
   where id = p_reservation and integration_id = p_integration
   for update;
  if res.id is null then
    return jsonb_build_object('ok', false, 'fejl', 'reservation_not_found');
  end if;
  if res.status = 'reserved' and res.expires_at <= now() then
    update public.commerce_reward_reservations
       set status = 'expired', expired_at = now(), updated_at = now()
     where id = res.id;
    return jsonb_build_object('ok', true, 'status', 'expired');
  end if;
  if res.status = 'reserved' then
    update public.commerce_reward_reservations
       set status = 'released', released_at = now(), updated_at = now()
     where id = res.id;
    return jsonb_build_object('ok', true, 'status', 'released');
  end if;
  if res.status in ('released','expired') then
    return jsonb_build_object('ok', true, 'status', res.status::text);
  end if;
  return jsonb_build_object('ok', false, 'fejl', 'reservation_state_conflict');
end;
$$;

/**
 * COMMIT: ordren er betalt — træk pointene i den EKSISTERENDE ledger som en
 * `redeem`-linje (samme type og samme aftryk af belønningen som ved disken)
 * og bind reservationen til ordren.
 *
 * Prisen er den RESERVEREDE, ikke belønningens pris nu: kunden fik rabatten
 * til den pris. Gentaget commit med samme ordre er den samme commit.
 */
create or replace function public.commerce_commit(
  p_integration uuid,
  p_reservation uuid,
  p_external_order_id text
)
returns jsonb
language plpgsql
as $$
declare
  res   public.commerce_reward_reservations;
  konto public.loyalty_point_accounts;
  ny_saldo int;
  txn_id uuid;
  andre int;
begin
  select * into res from public.commerce_reward_reservations
   where id = p_reservation and integration_id = p_integration
   for update;
  if res.id is null then
    return jsonb_build_object('ok', false, 'fejl', 'reservation_not_found');
  end if;

  if res.status = 'committed' then
    if res.external_order_id = p_external_order_id then
      return jsonb_build_object('ok', true, 'gentagelse', true);
    end if;
    return jsonb_build_object('ok', false, 'fejl', 'reservation_state_conflict');
  end if;

  if res.status = 'reserved' and res.expires_at <= now() then
    update public.commerce_reward_reservations
       set status = 'expired', expired_at = now(), updated_at = now()
     where id = res.id;
    return jsonb_build_object('ok', false, 'fejl', 'reservation_expired');
  end if;
  if res.status <> 'reserved' then
    return jsonb_build_object('ok', false, 'fejl', 'reservation_expired');
  end if;

  konto := public.point_konto_laast(res.company_id, res.point_program_id, res.member_id);
  -- De ANDRE aktive reservationer (denne er selv aktiv og tælles med i
  -- summen). Commit'en må trække sine egne point, men ikke dem, der er
  -- holdt af til en anden kurv.
  andre := public.point_reserverede(res.point_program_id, res.member_id) - res.points_reserved;

  update public.loyalty_point_accounts
     set balance = balance - res.points_reserved,
         updated_at = now()
   where id = konto.id
     and balance - res.points_reserved >= 0
     and balance - res.points_reserved >= greatest(andre, 0)
  returning balance into ny_saldo;

  if ny_saldo is null then
    return jsonb_build_object('ok', false, 'fejl', 'insufficient_points',
                              'saldo', konto.balance);
  end if;

  insert into public.loyalty_point_transactions (
    company_id, program_id, account_id, member_id, type, points,
    balance_after, reward_id, reward_navn, reward_point, reference, reason
  ) values (
    res.company_id, res.point_program_id, konto.id, res.member_id, 'redeem',
    -res.points_reserved, ny_saldo, res.point_reward_id, res.reward_navn,
    res.points_reserved, 'commerce-reservation:' || res.id::text,
    'Webshopordre ' || p_external_order_id
  ) returning id into txn_id;

  update public.commerce_reward_reservations
     set status = 'committed', committed_at = now(),
         external_order_id = p_external_order_id,
         redeem_txn_id = txn_id, updated_at = now()
   where id = res.id;

  -- Er ordren allerede synkroniseret som fuldt refunderet, gives pointene
  -- tilbage med det samme.
  if exists (select 1 from public.commerce_orders
              where integration_id = p_integration
                and external_order_id = p_external_order_id
                and payment_status = 'refunded') then
    perform public.commerce_tilbagefoer_beloenninger(p_integration, p_external_order_id);
  end if;

  return jsonb_build_object('ok', true, 'gentagelse', false, 'txn', txn_id);
end;
$$;

/** Natkørslen: udløbne reservationer og gamle request-id'er. */
create or replace function public.commerce_oprydning()
returns jsonb
language plpgsql
as $$
declare
  -- VENTENDE WEBSHOPIDENTITET (V1-beslutning, 2026-09-30): en e-mail fra en
  -- ordre, der endnu ikke er knyttet til en kunde, og en ubekræftet
  -- kundekobling, gemmes 90 dage fra SENESTE aktivitet for den identitet.
  -- Står også i FRISTER (src/lib/opbevaring.ts), som /privatliv viser.
  frist_webshop_ventende constant interval := '90 days';
  udloebne int;
  anmodninger int;
  vinduer int;
  identiteter int;
  koblinger int;
begin
  update public.commerce_reward_reservations
     set status = 'expired', expired_at = now(), updated_at = now()
   where status = 'reserved' and expires_at <= now();
  get diagnostics udloebne = row_count;

  delete from public.commerce_request_ids where received_at < now() - interval '1 hour';
  get diagnostics anmodninger = row_count;

  delete from public.commerce_rate_windows where window_start < now() - interval '1 hour';
  get diagnostics vinduer = row_count;

  -- VENTENDE IDENTITETER. "Seneste aktivitet" er den nyeste af
  --   * platformens `updated_at` på en ventende ordre med e-mailen (en ny
  --     ordre eller en rigtig ændring — IKKE vores egen `updated_at`, som
  --     flyttes af hver gensendelse), og
  --   * seneste bekræftelsesmail til en ubekræftet kobling med e-mailen.
  -- En kunde, der handler igen, holder altså sin optjening åben.
  with aktivitet as (
    select company_id, customer_email_norm as email, max(order_updated_at) as senest
      from public.commerce_orders
     where member_id is null and customer_email_norm is not null
     group by 1, 2
    union all
    select company_id, email_norm, max(coalesce(verification_sent_at, created_at))
      from public.commerce_customer_links
     where status = 'pending' and member_id is null
     group by 1, 2
  ),
  udloebet as (
    select company_id, email
      from aktivitet
     group by 1, 2
    having max(senest) < now() - frist_webshop_ventende
  ),
  ordrer as (
    update public.commerce_orders o
       set customer_email_norm = null,
           customer_resolution = 'expired',
           updated_at = now()
      from udloebet u
     where o.company_id = u.company_id
       and o.customer_email_norm = u.email
       and o.member_id is null
    returning o.id
  ),
  bidrag as (
    update public.commerce_order_contributions c
       set status = 'identity_expired', updated_at = now()
     where c.order_id in (select id from ordrer)
       and c.member_id is null
    returning c.id
  ),
  links as (
    delete from public.commerce_customer_links l
     using udloebet u
     where l.company_id = u.company_id
       and l.email_norm = u.email
       and l.status = 'pending'
       and l.member_id is null
    returning l.id
  )
  select (select count(*) from ordrer), (select count(*) from links)
    into identiteter, koblinger;

  -- Ubrugte parringskoder er værdiløse efter udløb; brugte bevares som spor.
  delete from public.commerce_pairing_codes
   where used_at is null and expires_at < now() - interval '1 day';

  return jsonb_build_object('reservationer_udloebet', udloebne,
                            'request_ids_slettet', anmodninger,
                            'vinduer_slettet', vinduer,
                            'identiteter_udloebet', identiteter,
                            'koblinger_slettet', koblinger);
end;
$$;

-- --------------------------------------------------------------- rettigheder
-- Service-role-only. En funktion er kørbar for `public`, indtil nogen siger
-- noget andet — se 0043.
do $$
declare f text;
begin
  foreach f in array array[
    'public.commerce_godkend(uuid,uuid,int,int,int)',
    'public.commerce_par(text,commerce_provider,text,text,text,text,text,text,text)',
    'public.commerce_afbryd(uuid,uuid)',
    'public.commerce_anvend_pointbidrag(uuid)',
    'public.commerce_tilbagefoer_beloenninger(uuid,text)',
    'public.commerce_synk_ordre(uuid,jsonb,timestamptz,text,bigint,boolean,uuid,text,jsonb,uuid)',
    'public.commerce_goer_krav(uuid,uuid,text)',
    'public.point_reserverede(uuid,uuid)',
    'public.point_brugbar_saldo(uuid,uuid)',
    'public.point_reserverede_for_medlem(uuid,uuid)',
    'public.point_indloes(uuid,uuid,uuid,uuid,text,uuid,uuid)',
    'public.commerce_find_medlemmer(uuid,text)',
    'public.commerce_reserver(uuid,text,uuid,text,bigint,text,int)',
    'public.commerce_frigiv(uuid,uuid)',
    'public.commerce_commit(uuid,uuid,text)',
    'public.commerce_oprydning()'
  ]
  loop
    execute format('revoke all on function %s from public', f);
    execute format('revoke all on function %s from anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- =========================================================================
-- SLETNINGEN SKAL KENDE DE NYE TABELLER
--
-- `slet_virksomhedens_data()` STANDSER, hvis en tabel med `company_id` hverken
-- står blandt dem, der slettes, eller dem, der bevares. Kopien er taget fra
-- 0044, som er den seneste udgave; kun commerce-tabellerne er lagt til, og de
-- slettes FØRST, fordi de peger på ledgeren, medlemmerne og programmerne.
-- =========================================================================

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
    'eksterne_profiler', 'omdoemme_snapshots',
    'loyalty_point_transactions', 'loyalty_point_accounts',
    'loyalty_point_rewards', 'loyalty_point_programs',
    'commerce_reward_reservations', 'commerce_customer_links',
    'commerce_order_contributions', 'commerce_orders',
    'commerce_reward_channels', 'commerce_program_channels',
    'commerce_pairing_codes', 'commerce_integrations'
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

  -- Webshopdelen først: den peger på ledgeren, medlemmerne og programmerne.
  -- (commerce_request_ids og commerce_rate_windows følger integrationen via
  -- on delete cascade og har intet company_id.)
  delete from public.commerce_reward_reservations where company_id = p_company_id;
  delete from public.commerce_customer_links      where company_id = p_company_id;
  delete from public.commerce_order_contributions where company_id = p_company_id;
  delete from public.commerce_orders              where company_id = p_company_id;
  delete from public.commerce_reward_channels     where company_id = p_company_id;
  delete from public.commerce_program_channels    where company_id = p_company_id;
  delete from public.commerce_pairing_codes       where company_id = p_company_id;
  delete from public.commerce_integrations        where company_id = p_company_id;

  -- Pointprogrammet: ledgeren peger på konti, belønninger og program.
  delete from public.loyalty_point_transactions where company_id = p_company_id;
  delete from public.loyalty_point_accounts     where company_id = p_company_id;
  delete from public.loyalty_point_rewards      where company_id = p_company_id;
  delete from public.loyalty_point_programs     where company_id = p_company_id;

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

comment on table public.commerce_integrations is
  'LoyalSum Commerce API v1 (0049). Én forbundet webshop; identitet = provider + external_store_id.';
comment on table public.commerce_order_contributions is
  'Hvad en webshopordre har bidraget med pr. program: target − applied = det, der bogføres.';
