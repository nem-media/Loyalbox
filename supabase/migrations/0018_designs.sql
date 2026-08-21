-- ---------------------------------------------------------------------------
-- 0018 — Designs
--
-- Et DESIGN er de trykvalg, en butik har gjort én gang: standerens farve,
-- frontens farve og logoet. Det er ikke det samme som en stander — standeren
-- er QR-adressen og siden bag den. Samme design kan trykkes på flere
-- standere, og samme stander kan få et nyt design.
--
-- HVORFOR DET ER SIN EGEN TABEL: kunden skal kunne bestille flere af noget,
-- de allerede har fået lavet, uden at betale for opsætningen igen. Lå valgene
-- kun på ordren, ville en genbestilling være en ny ordre med de samme valg —
-- og så ville tillægget for egen frontfarve blive opkrævet forfra.
--
-- `frontfarve_betalt` sidder derfor på DESIGNET og ikke på ordren. Se
-- src/lib/design.ts for reglen.
--
-- ORIGINALFILEN OVERSKRIVES ALDRIG. Previewet gemmes ikke som fil: det kan
-- genskabes fuldstændigt af originalen plus farve, hex og skabelonversion, og
-- en gemt preview-fil ville være en anden sandhed, der kan komme i utakt med
-- originalen — hvor den forkerte er den, der bliver trykt.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

create table if not exists public.designs (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  navn              text not null,

  -- Standeren er sort eller hvidt akryl. Fronten er BLOT det printede felt;
  -- sider, bagside og fod beholder standerens farve.
  stander_farve     text not null default 'sort'
                      check (stander_farve in ('sort', 'hvid')),
  front_type        text not null default 'matcher'
                      check (front_type in ('matcher', 'egen')),
  -- Normaliseret hex med havelåge. Kun sat når front_type = 'egen'.
  front_hex         text
                      check (front_hex is null or front_hex ~ '^#[0-9a-f]{6}$'),

  -- Logoet som kunden uploadede det. Målene og transparensen gemmes, fordi de
  -- er dyre at læse igen og afgørende for, om trykket bliver godt.
  logo_url          text,
  logo_filnavn      text,
  logo_mime         text,
  logo_bytes        integer,
  logo_bredde       integer,
  logo_hoejde       integer,
  logo_transparent  boolean,

  -- Hvilken trykskabelon designet blev lavet til. Savnes først den dag
  -- skabelonen laves om, og en kunde vil have et skilt magen til sit gamle.
  print_skabelon    text not null default 'v1',

  -- Er tillægget for egen frontfarve betalt for DETTE design? Sættes af
  -- webhooken, når ordren er gennemført.
  frontfarve_betalt boolean not null default false,

  created_at        timestamptz not null default now()
);

create index if not exists designs_company_id_idx on public.designs(company_id);

-- ---------------------------------------------------------------------------
-- Ordren peger på designet, den blev trykt efter.
--
-- `on delete set null`: sletter kunden et design, må ordrehistorikken ikke
-- forsvinde med — bogføringsloven kræver den i fem år.
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists design_id uuid
    references public.designs(id) on delete set null,
  -- Antallet og prisen står allerede på ordren. Dette er det, der er særligt
  -- for TRYKKET, og som skal kunne læses uden at slå designet op — også
  -- efter designet er slettet.
  add column if not exists frontfarve_beloeb numeric(10,2) not null default 0;

create index if not exists orders_design_id_idx on public.orders(design_id);

-- ---------------------------------------------------------------------------
-- Sletningen skal kende den nye tabel
--
-- Sikkerhedsnettet i slet_virksomhedens_data() FEJLER, hvis en tabel med
-- company_id ikke står på en af listerne. Det er meningen: uden det ville en
-- sletning se ud til at lykkes, mens kundens logoer og trykvalg blev
-- liggende. Funktionen genskabes derfor her med 'designs' på listen.
--
-- Rækkefølgen er børn før forældre: orders peger på designs, men beholdes —
-- derfor nulstilles design_id, før designs slettes, så en bevaret ordre ikke
-- efterlades med en henvisning til noget, der ikke findes.
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
    'locations', 'subscriptions', 'designs'
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

-- ---------------------------------------------------------------------------
-- Adgang
--
-- Ejeren læser og skriver sine egne designs. Skrivning fra brugerfladen sker
-- gennem server-actions med service-role EFTER kontrol af ejerskab, men
-- policyen findes, så et direkte kald med brugerens egen nøgle ikke kan nå
-- en anden butiks designs.
-- ---------------------------------------------------------------------------

alter table public.designs enable row level security;

drop policy if exists designs_owner_all on public.designs;
create policy designs_owner_all on public.designs
  for all
  using (
    company_id in (
      select id from public.companies where user_id = auth.uid()
    )
  )
  with check (
    company_id in (
      select id from public.companies where user_id = auth.uid()
    )
  );
