-- 0047 — ÉN MAIL PR. HÆNDELSE, OGSÅ NÅR STRIPE SIGER DET TO GANGE
--
-- HVORFOR. Webhooken sender nu kunden en mail, når abonnementet opsiges,
-- når en opsigelse fortrydes, og når abonnementet stopper. Stripe lover
-- "mindst én" levering, ikke "præcis én": en leverance kan komme to gange,
-- og serverfunktionen kører i mange eksemplarer. Et opslag efterfulgt af en
-- skrivning er ikke en spærre — det er præcis fejlen fra `alarm_daempning`
-- (0039), hvor ti samtidige fejl gav ti mails.
--
-- GREBET er en primærnøgle. Den, der får rækken indsat, sender mailen; den,
-- der rammer `23505`, ved at en anden nåede det først. Én sætning, ingen
-- tidslomme.
--
-- EN SPÆRRE OG IKKE EN LOG. Nøglen er hændelsens art + Stripes eget id (fx
-- `opsagt:evt_…`), og der står ingen persondata og intet `company_id` her.
-- Derfor rører den heller ikke sikkerhedsnettet i
-- `slet_virksomhedens_data()`, der standser, hvis en tabel med kundedata
-- ikke er gjort rede for.
--
-- KAN KØRES FØR ELLER EFTER UDRULNINGEN. Findes tabellen ikke, sender koden
-- alligevel (se `src/lib/abonnementsmail-udsendelse.ts`): en sjælden dublet
-- er bedre end en opsigelse, kunden aldrig får bekræftet.
--
-- IDEMPOTENT: `if not exists`. Kan køres igen uden virkning.

create table if not exists public.kundemail_spaerre (
  noegle text primary key,
  sendt  timestamptz not null default now()
);

-- Kun service-role rører den. Ingen politik betyder ingen adgang for nogen
-- anden — og der er intet herinde, en bruger skal kunne se.
alter table public.kundemail_spaerre enable row level security;

comment on table public.kundemail_spaerre is
  'Spærre mod dobbelte kundemails fra webhooken. Én række pr. sendt hændelse; ingen persondata.';
