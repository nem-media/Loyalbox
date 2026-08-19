-- ---------------------------------------------------------------------------
-- 0010 — Databehandleraftale: hvornår og hvilken version kunden accepterede
--
-- Accepten gemmes MED versionsnummeret og ikke som et blot ja/nej. Ændres
-- aftalen materielt, hæves versionen, og så kan vi se præcis hvilken tekst den
-- enkelte kunde faktisk sagde ja til — og hvem der mangler at godkende den nye.
-- Et rent boolesk felt ville se ud som om alle havde accepteret den nyeste.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

alter table public.companies
  add column if not exists dpa_accepted_at timestamptz,
  add column if not exists dpa_version text;

comment on column public.companies.dpa_accepted_at is
  'Tidspunkt for accept af databehandleraftalen. Null = ikke accepteret.';
comment on column public.companies.dpa_version is
  'Hvilken version af aftalen der blev accepteret, fx "1.0".';
