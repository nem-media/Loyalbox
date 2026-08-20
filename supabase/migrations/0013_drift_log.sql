-- ---------------------------------------------------------------------------
-- 0013 — Driftslog
--
-- Otte steder i koden skriver en fejl, og ingen ser dem: de lander i Vercels
-- logs, som ingen kigger i. Den natlige oprydning er det værste eksempel —
-- holder den op med at køre, opdages det først den dag, nogen spørger, hvorfor
-- der ligger to år gamle kort.
--
-- Tabellen løser to ting på én gang:
--   1. En fejl kan ses ét sted i stedet for at forsvinde i en logstrøm.
--   2. Oprydningen efterlader et SPOR AF, AT DEN HAR KØRT. Det er ikke kun
--      drift — det er dokumentation for, at opbevaringsfristerne rent faktisk
--      håndhæves, og den slags skal kunne fremvises.
--
-- Indeholder ingen personoplysninger: kun opgavens navn, om den gik godt, og
-- ANTAL berørte rækker. Aldrig hvem eller hvad der blev slettet.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

create table if not exists public.drift_log (
  id         uuid primary key default gen_random_uuid(),
  -- Hvilken opgave. Fx 'oprydning', 'stripe-webhook', 'samtykke'.
  opgave     text not null,
  ok         boolean not null,
  -- Tal og status. ALDRIG personoplysninger.
  resultat   jsonb,
  -- Fejlbeskeden, når noget gik galt.
  besked     text,
  -- Blev der sendt en alarm? Bruges til at dæmpe gentagelser.
  alarmeret  boolean not null default false,
  created_at timestamptz not null default now()
);

-- Opslaget er altid "seneste for én opgave", derfor denne sammensætning.
create index if not exists drift_log_opgave_idx
  on public.drift_log(opgave, created_at desc);

alter table public.drift_log enable row level security;

-- Ingen policies med vilje: kun service-role (som omgår RLS) læser og skriver.
-- Loggen fortæller, hvornår systemet fejler, og det rager ikke en butiksejer.

comment on table public.drift_log is
  'Driftslog: hvornår baggrundsopgaver kørte, og om de gik godt. Ingen personoplysninger.';
