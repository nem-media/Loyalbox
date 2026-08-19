-- ---------------------------------------------------------------------------
-- 0011 — Log over cookiesamtykker fra hjemmesidens besøgende
--
-- FORVEKSL IKKE MED `consent_records` fra 0004: den handler om butikkens egne
-- kunders samtykke til markedsføring FRA butikken, er knyttet til company_id og
-- member_id, og gemmer bl.a. IP. Denne tabel handler om cookies på vores egen
-- hjemmeside og indeholder ingen personoplysninger.
--
-- Artikel 7 kræver, at den dataansvarlige kan PÅVISE et samtykke. Valget lå
-- indtil nu kun i den besøgendes egen browser — altså hos dem, ikke hos os.
-- Rydder de deres browser, står vi uden noget at pege på.
--
-- Loggen er bevidst så tom som muligt: der gemmes INGEN IP-adresse, ingen
-- user-agent og intet der peger på en person. `consent_id` er et tilfældigt id,
-- browseren selv laver, og som kun bruges til at se, at senere ændringer kommer
-- fra samme besøgende. Det er selv en behandling af data, og jo mindre den
-- indeholder, jo mindre er der at gå galt med.
--
-- RLS slås til UDEN policies: så kan hverken anon- eller bruger-nøglen læse
-- eller skrive. Kun service-role (som omgår RLS) kan, og den bruges alene i
-- /api/samtykke efter validering.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

create table if not exists public.consent_log (
  id          uuid primary key default gen_random_uuid(),
  consent_id  text not null,
  version     int not null,
  statistics  boolean not null,
  marketing   boolean not null,
  decided_at  timestamptz not null,
  -- Hvilken side valget blev truffet på. Kun stien, aldrig hele URL'en med
  -- eventuelle parametre.
  path        text,
  created_at  timestamptz not null default now()
);

create index if not exists consent_log_consent_id_idx on public.consent_log(consent_id);
create index if not exists consent_log_created_at_idx on public.consent_log(created_at);

alter table public.consent_log enable row level security;

comment on table public.consent_log is
  'Dokumentation af cookiesamtykker (GDPR art. 7). Indeholder ingen personhenførbare oplysninger.';
