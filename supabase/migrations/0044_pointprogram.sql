-- ---------------------------------------------------------------------------
-- 0044 — LoyalSum Pointprogram (V1)
--
-- Den anden loyalitetsform ved siden af stempelkortet. Stempelkortet er FAST
-- progression (10 køb → én belønning); pointprogrammet er en SALDO, kunden
-- bruger på dét, hun vil, blandt flere belønninger. De to lever side om side.
--
-- HVORFOR EGNE TABELLER OG IKKE `program_type` PÅ `loyalty_programs`.
-- Det var det første, jeg prøvede at regne hjem, og modellen siger nej to
-- steder, hvor det ville koste noget:
--
--   1. `loyalty_rewards` har `required_stamps int not null default 10` og
--      `is_primary`, og 0042 lagde et UNIKT indeks på ÉN primær belønning pr.
--      program — fordi `giveStamp()` slår netop den op med `.maybeSingle()`.
--      Et pointprogram har pr. definition FLERE ligestillede belønninger med
--      hver sin pris. De to invarianter kan ikke være sande i samme tabel.
--   2. `loyalty_programs` bærer tyve stempel-specifikke kolonner (stamps_per_earn,
--      keep_overflow, max_stamps_per_txn, stamps_expire …), alle NOT NULL med
--      defaults. Et pointprogram ville arve dem alle som meningsløs støj, og
--      hver eneste eksisterende forespørgsel — `/kort/[token]`, `report.ts`,
--      `member-account.ts`, medarbejderfladen — ville skulle lære at filtrere
--      en type fra, den ikke kendte i går. Glemmes ét sted, blander point sig
--      ind i et stempelkort, og dét ses først hos en kunde.
--
-- DET, DER SKAL DELES, DELES: `loyalty_members` ER kundeuniverset. Et
-- pointprogram opretter ALDRIG en ny kunde-identitet — samme medlem, samme
-- `public_token`, samme `/kort/<token>`, samme konto på `/mine-kort`. Det
-- samme gælder `companies`, `employees` og rettighederne i `getCompanyAccess()`.
--
-- LEDGEREN ER SANDHEDEN, saldoen er en materialisering. Begge skrives i SAMME
-- sætning inde i funktionerne nedenfor, så de ikke kan komme fra hinanden ved
-- et kapløb — og `point_afstem()` kan FINDE det, hvis de alligevel gør.
--
-- INGEN POINT FOR ANMELDELSER. Det er ikke en regel, koden husker at spørge om:
-- der findes ikke et felt, en optjeningsmodel eller en vej i disse tabeller,
-- der kan knytte point til en anmeldelse eller en bedømmelse. Samme princip
-- som `reviewChoices()`, der ikke får stjernerne at vide.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

-- --------------------------------------------------------------------- typer
-- Statussen genbruger `loyalty_program_status` (draft/active/paused/archived),
-- så de to loyalitetsformer bruger de samme ord om det samme.

do $$ begin
  create type point_earn_model as enum ('per_amount','per_visit','manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type point_txn_type as enum
    ('earn','redeem','adjust_add','adjust_remove','reversal');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------------ programmet
create table if not exists public.loyalty_point_programs (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  description text,
  status      loyalty_program_status not null default 'draft',
  earn_model  point_earn_model not null default 'per_amount',
  -- Ét tal, og betydningen følger modellen: kroner pr. point (per_amount)
  -- eller point pr. besøg (per_visit). `manual` bruger det ikke, men feltet er
  -- not null, så en modelskift aldrig efterlader et hul.
  earn_value  numeric(10,2) not null default 10 check (earn_value > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ÉT LEVENDE POINTPROGRAM PR. VIRKSOMHED.
-- Datamodellen kan bære flere (alt hænger på `program_id`), men V1's
-- brugerflade skal ikke lære en café at vælge mellem to pointprogrammer.
-- Grænsen ligger i BASEN og ikke i en if-sætning, fordi to faner ellers kan
-- oprette hver sit. Arkiverede tæller ikke med — ellers kunne man aldrig
-- starte forfra efter en arkivering.
create unique index if not exists loyalty_point_programs_et_levende_idx
  on public.loyalty_point_programs (company_id)
  where status <> 'archived';

-- ----------------------------------------------------------------- belønninger
create table if not exists public.loyalty_point_rewards (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  program_id  uuid not null references public.loyalty_point_programs(id) on delete cascade,
  name        text not null,
  description text,
  points_cost int not null check (points_cost > 0),
  -- Typen genbruger stempelkortets `loyalty_reward_type`, så de to former
  -- beskriver den samme slags belønning med de samme ord.
  type        loyalty_reward_type not null default 'free_product',
  sort_order  int not null default 0,
  -- Kun 'active' og 'archived' bruges. En belønning med historik må ALDRIG
  -- slettes (kravet er arkivering), og status er stedet, det siges.
  status      loyalty_program_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists loyalty_point_rewards_program_idx
  on public.loyalty_point_rewards (program_id, status, sort_order, points_cost);

-- --------------------------------------------------------------------- saldoen
create table if not exists public.loyalty_point_accounts (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  program_id uuid not null references public.loyalty_point_programs(id) on delete cascade,
  member_id  uuid not null references public.loyalty_members(id) on delete cascade,
  -- MATERIALISERET SALDO. Ledgeren er sandheden; dette er summen, så et
  -- kundekort ikke skal lægge tusind rækker sammen ved hver visning.
  -- `>= 0` er en DB-garanti og ikke en høflighed: kravet om at en saldo
  -- aldrig kan gå i minus skal holde, også hvis en fremtidig vej glemmer det.
  balance    int not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, member_id)
);

create index if not exists loyalty_point_accounts_member_idx
  on public.loyalty_point_accounts (member_id);
create index if not exists loyalty_point_accounts_company_idx
  on public.loyalty_point_accounts (company_id);

-- --------------------------------------------------------------------- ledgeren
create table if not exists public.loyalty_point_transactions (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  program_id  uuid not null references public.loyalty_point_programs(id) on delete cascade,
  account_id  uuid not null references public.loyalty_point_accounts(id) on delete cascade,
  member_id   uuid not null references public.loyalty_members(id) on delete cascade,
  type        point_txn_type not null,
  -- FORTEGNET ER EN DEL AF TALLET: optjening er positiv, indløsning negativ.
  -- Saldoen er summen, præcis som stempelkortets ledger.
  points      int not null check (points <> 0),
  balance_after int not null check (balance_after >= 0),
  -- Købets beløb, når optjeningen kom af et beløb. Kun til historik og
  -- kvittering; pointtallet er allerede regnet ud.
  purchase_amount numeric(10,2) check (purchase_amount is null or purchase_amount >= 0),
  -- BELØNNINGEN GEMMES SOM ET AFTRYK. Ændrer butikken prisen på "Gratis
  -- kaffe" fra 50 til 75 point i morgen, skal historikken stadig sige 50 —
  -- ellers ville kvitteringen for et køb ændre sig bagefter. `reward_id` kan
  -- blive null (arkivering/sletning af et program), navnet og prisen kan ikke.
  reward_id   uuid references public.loyalty_point_rewards(id) on delete set null,
  reward_navn text,
  reward_point int,
  -- Modposten peger på originalen. Unikt indeks nedenfor: én annullering pr.
  -- transaktion, afgjort af basen og ikke af et opslag.
  reversal_of uuid references public.loyalty_point_transactions(id) on delete set null,
  -- HVEM. Brugeren er den, der trykkede (ejer, medarbejder eller admin i
  -- support); `employee_id` findes kun, når det var en medarbejder.
  performed_by uuid references public.users(id) on delete set null,
  employee_id  uuid references public.employees(id) on delete set null,
  -- Idempotensnøgle pr. konto — samme greb som stempelkortets `reference`.
  reference   text,
  reason      text,
  created_at  timestamptz not null default now()
);

-- DOBBELT-INDSENDELSE GIVER IKKE DOBBELT POINT. Nøglen laves på serveren pr.
-- visning; rammer den to gange, er det samme transaktion.
create unique index if not exists loyalty_point_txn_reference_idx
  on public.loyalty_point_transactions (account_id, reference)
  where reference is not null;

-- ÉN ANNULLERING PR. TRANSAKTION. Partielt, ellers ville indekset kræve, at
-- der kun fandtes én annullering i hele tabellen — samme fælde som 0041.
create unique index if not exists loyalty_point_txn_en_annullering_idx
  on public.loyalty_point_transactions (reversal_of)
  where reversal_of is not null;

create index if not exists loyalty_point_txn_konto_idx
  on public.loyalty_point_transactions (account_id, created_at desc);
create index if not exists loyalty_point_txn_firma_idx
  on public.loyalty_point_transactions (company_id, created_at desc);
create index if not exists loyalty_point_txn_medlem_idx
  on public.loyalty_point_transactions (member_id, created_at desc);

-- ------------------------------------------------------------------------ RLS
alter table public.loyalty_point_programs     enable row level security;
alter table public.loyalty_point_rewards      enable row level security;
alter table public.loyalty_point_accounts     enable row level security;
alter table public.loyalty_point_transactions enable row level security;

-- Samme mønster som 0004: konfiguration er ejerens, ledger og saldo er
-- læseadgang — alle skrivninger går gennem service-role efter en kontrol i
-- `getCompanyAccess()`.
do $$
declare t text;
begin
  foreach t in array array['loyalty_point_programs','loyalty_point_rewards']
  loop
    execute format('drop policy if exists %I_owner_all on public.%I', t, t);
    execute format(
      'create policy %I_owner_all on public.%I for all using (public.is_admin() or company_id in (select id from public.companies where user_id = auth.uid())) with check (public.is_admin() or company_id in (select id from public.companies where user_id = auth.uid()))',
      t, t
    );
  end loop;

  foreach t in array array['loyalty_point_accounts','loyalty_point_transactions']
  loop
    execute format('drop policy if exists %I_owner_select on public.%I', t, t);
    execute format(
      'create policy %I_owner_select on public.%I for select using (public.is_admin() or company_id in (select id from public.companies where user_id = auth.uid()))',
      t, t
    );
  end loop;
end $$;

-- =========================================================================
-- FUNKTIONERNE
--
-- Hvorfor de ligger i basen og ikke i TypeScript: en serverfunktion kører i
-- mange eksemplarer, så "læs saldo, beslut, skriv" er ikke en regel — det er
-- en formodning. Det kostede projektet otte kapløb i stempel-ledgeren (0038,
-- 0041, 0042). Her er saldoændringen og ledger-linjen ÉN transaktion, og
-- kontoen låses, mens det sker.
-- =========================================================================

-- Sikrer en konto og låser den. Intern hjælper.
create or replace function public.point_konto_laast(
  p_company uuid,
  p_program uuid,
  p_member  uuid
)
returns public.loyalty_point_accounts
language plpgsql
as $$
declare
  konto public.loyalty_point_accounts;
begin
  -- `on conflict do nothing` frem for et opslag først: to samtidige
  -- tilmeldinger må ikke kunne give kunden to saldi.
  insert into public.loyalty_point_accounts (company_id, program_id, member_id)
  values (p_company, p_program, p_member)
  on conflict (program_id, member_id) do nothing;

  select * into konto
    from public.loyalty_point_accounts
   where program_id = p_program and member_id = p_member
   for update;

  return konto;
end;
$$;

/**
 * Optjening og manuel justering.
 *
 * `p_points` bærer fortegnet: +25 ved et køb, -20 ved en fejlrettelse. Et nul
 * afvises af tabellens egen check — en transaktion, der ikke flytter noget,
 * er ikke en hændelse.
 */
create or replace function public.point_giv(
  p_company   uuid,
  p_program   uuid,
  p_member    uuid,
  p_points    int,
  p_type      point_txn_type,
  p_purchase_amount numeric default null,
  p_reference text default null,
  p_employee  uuid default null,
  p_user      uuid default null,
  p_reason    text default null
)
returns jsonb
language plpgsql
as $$
declare
  prog   public.loyalty_point_programs;
  konto  public.loyalty_point_accounts;
  ny_saldo int;
  txn_id uuid;
  eksisterende public.loyalty_point_transactions;
begin
  if p_points = 0 then
    return jsonb_build_object('ok', false, 'fejl', 'nul-point');
  end if;
  if p_type not in ('earn','adjust_add','adjust_remove') then
    return jsonb_build_object('ok', false, 'fejl', 'forkert-type');
  end if;

  select * into prog
    from public.loyalty_point_programs
   where id = p_program and company_id = p_company;

  if not found then
    return jsonb_build_object('ok', false, 'fejl', 'program-findes-ikke');
  end if;
  -- PAUSET OG ARKIVERET GIVER INGEN POINT. Saldo og historik bevares; det er
  -- kun bevægelsen, der stopper.
  if prog.status <> 'active' then
    return jsonb_build_object('ok', false, 'fejl', 'program-ikke-aktivt',
                              'status', prog.status);
  end if;

  konto := public.point_konto_laast(p_company, p_program, p_member);
  if konto.id is null then
    return jsonb_build_object('ok', false, 'fejl', 'konto-fejlede');
  end if;

  begin
    -- SALDOEN MÅ ALDRIG I MINUS. Betingelsen ligger i sætningen, så to
    -- samtidige fradrag ikke begge kan se en saldo, der rækker.
    update public.loyalty_point_accounts
       set balance = balance + p_points,
           updated_at = now()
     where id = konto.id
       and balance + p_points >= 0
    returning balance into ny_saldo;

    if ny_saldo is null then
      return jsonb_build_object('ok', false, 'fejl', 'for-faa-point',
                                'saldo', konto.balance);
    end if;

    insert into public.loyalty_point_transactions (
      company_id, program_id, account_id, member_id, type, points,
      balance_after, purchase_amount, performed_by, employee_id,
      reference, reason
    ) values (
      p_company, p_program, konto.id, p_member, p_type, p_points,
      ny_saldo, p_purchase_amount, p_user, p_employee,
      p_reference, p_reason
    ) returning id into txn_id;

  exception when unique_violation then
    -- DOBBELT-INDSENDELSE. Den første gik igennem; saldoændringen i denne
    -- blok rulles tilbage af undtagelsen (plpgsql sætter et savepoint), så
    -- kunden får ikke point to gange. Svaret er den tilstand, der ER.
    select * into eksisterende
      from public.loyalty_point_transactions
     where account_id = konto.id and reference = p_reference;

    return jsonb_build_object(
      'ok', true, 'gentagelse', true,
      'saldo', (select balance from public.loyalty_point_accounts where id = konto.id),
      'txn', eksisterende.id,
      'point', eksisterende.points
    );
  end;

  return jsonb_build_object('ok', true, 'gentagelse', false,
                            'saldo', ny_saldo, 'txn', txn_id,
                            'point', p_points);
end;
$$;

/**
 * Indløsning af en belønning.
 *
 * Prisen læses HER og ikke fra klienten, og den skrives med ind i ledgeren som
 * et aftryk: ændrer butikken prisen i morgen, står kvitteringen fast.
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

  -- BELØNNINGEN SKAL HØRE TIL PROGRAMMET OG FIRMAET. Ejerskabet er en del af
  -- forespørgslen, så et id fra en anden butik ikke engang kan læses.
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

  begin
    update public.loyalty_point_accounts
       set balance = balance - bel.points_cost,
           updated_at = now()
     where id = konto.id
       and balance - bel.points_cost >= 0
    returning balance into ny_saldo;

    if ny_saldo is null then
      return jsonb_build_object('ok', false, 'fejl', 'for-faa-point',
                                'saldo', konto.balance,
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
 * Annullering — en MODPOST, aldrig en sletning.
 *
 * Originalen bliver stående, og modposten peger på den. Det unikke indeks på
 * `reversal_of` afgør i basen, at en transaktion kun kan annulleres én gang.
 */
create or replace function public.point_annuller(
  p_company  uuid,
  p_txn      uuid,
  p_employee uuid default null,
  p_user     uuid default null,
  p_reason   text default null
)
returns jsonb
language plpgsql
as $$
declare
  org    public.loyalty_point_transactions;
  prog   public.loyalty_point_programs;
  konto  public.loyalty_point_accounts;
  ny_saldo int;
  txn_id uuid;
begin
  select * into org
    from public.loyalty_point_transactions
   where id = p_txn and company_id = p_company;
  if not found then
    return jsonb_build_object('ok', false, 'fejl', 'transaktion-findes-ikke');
  end if;
  if org.type = 'reversal' then
    return jsonb_build_object('ok', false, 'fejl', 'kan-ikke-annullere-modpost');
  end if;

  select * into prog
    from public.loyalty_point_programs where id = org.program_id;
  if prog.status <> 'active' then
    return jsonb_build_object('ok', false, 'fejl', 'program-ikke-aktivt',
                              'status', prog.status);
  end if;

  select * into konto
    from public.loyalty_point_accounts where id = org.account_id for update;

  begin
    update public.loyalty_point_accounts
       set balance = balance - org.points,
           updated_at = now()
     where id = konto.id
       and balance - org.points >= 0
    returning balance into ny_saldo;

    if ny_saldo is null then
      -- Kunden har brugt de point, der skal trækkes tilbage. Saldoen må ikke
      -- i minus, så annulleringen afvises frem for at efterlade en gæld,
      -- kunden ville skulle optjene sig ud af uden at kunne se hvorfor.
      return jsonb_build_object('ok', false, 'fejl', 'saldo-raekker-ikke',
                                'saldo', konto.balance,
                                'kraever', org.points);
    end if;

    insert into public.loyalty_point_transactions (
      company_id, program_id, account_id, member_id, type, points,
      balance_after, reward_id, reward_navn, reward_point,
      reversal_of, performed_by, employee_id, reason
    ) values (
      p_company, org.program_id, konto.id, org.member_id, 'reversal', -org.points,
      ny_saldo, org.reward_id, org.reward_navn, org.reward_point,
      org.id, p_user, p_employee, p_reason
    ) returning id into txn_id;

  exception when unique_violation then
    -- Allerede annulleret — af en anden fane eller et gentaget klik.
    return jsonb_build_object('ok', false, 'fejl', 'allerede-annulleret');
  end;

  return jsonb_build_object('ok', true, 'saldo', ny_saldo, 'txn', txn_id);
end;
$$;

/**
 * AFSTEMNING: kan saldoen og ledgeren være kommet fra hinanden?
 *
 * Kravet er ikke, at det aldrig sker — det er, at det kan OPDAGES. Funktionen
 * svarer med de konti, hvor summen af ledgeren ikke er saldoen, og bruges af
 * driftssiden. Den RETTER ikke af sig selv: en uenighed er et symptom, og en
 * stille selvhelbredelse ville skjule årsagen.
 */
create or replace function public.point_afstem(p_company uuid default null)
returns jsonb
language plpgsql
as $$
declare
  afvigende jsonb;
  antal int;
begin
  select coalesce(jsonb_agg(x), '[]'::jsonb), count(*)
    into afvigende, antal
    from (
      select a.id,
             a.company_id,
             a.member_id,
             a.balance as saldo,
             coalesce(sum(t.points), 0) as ledger
        from public.loyalty_point_accounts a
        left join public.loyalty_point_transactions t on t.account_id = a.id
       where p_company is null or a.company_id = p_company
       group by a.id, a.company_id, a.member_id, a.balance
      having a.balance <> coalesce(sum(t.points), 0)
    ) x;

  return jsonb_build_object('afvigende', antal, 'konti', afvigende);
end;
$$;

-- --------------------------------------------------------------- rettigheder
-- Service-role-only, som alle andre funktioner der flytter noget. En funktion
-- er kørbar for `public`, indtil nogen siger noget andet — se 0043.

do $$
declare f text;
begin
  foreach f in array array[
    'public.point_giv(uuid,uuid,uuid,int,point_txn_type,numeric,text,uuid,uuid,text)',
    'public.point_indloes(uuid,uuid,uuid,uuid,text,uuid,uuid)',
    'public.point_annuller(uuid,uuid,uuid,uuid,text)',
    'public.point_afstem(uuid)',
    'public.point_konto_laast(uuid,uuid,uuid)'
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
-- `slet_virksomhedens_data()` har et sikkerhedsnet: den STANDSER enhver
-- sletning, hvis der findes en tabel med `company_id`, som hverken står på
-- listen over dem, der slettes, eller dem, der bevares. Uden dette afsnit
-- ville de fire pointtabeller altså ikke bare blive glemt — de ville BLOKERE
-- hver eneste sletning, og databehandleraftalens § 13 ville ikke kunne
-- opfyldes.
--
-- KOPIEN ER TAGET FRA 0031, som er den seneste udgave (0014 → 0017 → 0018 →
-- 0025 → 0026 → 0029 → 0030 → 0031). Første udkast tog den fra 0025, og
-- prøverne fangede det med det samme: `adresse.test.ts` og
-- `aktivering.test.ts` læser den SENESTE definition og kræver, at
-- leveringsadressen, kontaktpersonen og aktiveringstokenet nulstilles. En
-- kopi fra en ældre udgave ruller de felter stille tilbage, og virkningen
-- er, at en slettet virksomheds adresse bliver stående.
--
-- RÆKKEFØLGEN FØLGER FREMMEDNØGLERNE: ledgeren peger på konti, belønninger og
-- programmet, så den skal væk først.
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
    'loyalty_point_rewards', 'loyalty_point_programs'
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

  -- Pointprogrammet først: ledgeren peger på konti, belønninger og program.
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

comment on table public.loyalty_point_programs is
  'LoyalSum Pointprogram (0044). Ét levende program pr. virksomhed; '
  'kundeidentiteten er den fælles loyalty_members.';
comment on table public.loyalty_point_transactions is
  'Pointledgeren — sandheden om saldoen. Uforanderlig: fejl rettes med en '
  'modpost (reversal_of), aldrig med en sletning.';
