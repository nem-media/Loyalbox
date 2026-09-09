-- ============================================================================
-- 0032 — Butikken kan tilføje sine egne anmeldelsesplatforme
-- ============================================================================
-- Kør MANUELT i Supabase → SQL Editor. Idempotent.
--
-- HVORFOR:
--
-- Standeren kunne pege på tre anmeldelsesplatforme: Google, Trustpilot og
-- Facebook, hver med sin kolonne. `custom_url` er IKKE en fjerde plads — det
-- er butikkens eget link (menukort, booking, webshop), som står med deres
-- egen label ved siden af anmeldelsesvalgene og aldrig hedder "Anmeld os på".
--
-- En tandlæge vil på jameda, en håndværker på Trustpilot OG en brancheportal,
-- en autoværksted på bilbasen. Dem kan vi ikke forudse, og en kolonne pr.
-- platform ville betyde en migration hver gang.
--
-- HVORFOR JSONB OG IKKE EN TABEL: højst to rækker pr. stander. En tabel ville
-- koste RLS-policyer, en plads i backuppens `TABELLER` og en i
-- `slet_virksomhedens_data()`, hvis sikkerhedsnet standser enhver sletning,
-- når en tabel med `company_id` mangler på listen. Meget maskineri for to
-- rækker.
--
-- SLETTERUTINEN RØRES IKKE. `stands` står allerede på `haandterede` og
-- slettes HELT, når en virksomhed slettes — kolonnen følger med af sig selv.
-- Det er forskellen fra 0029-0031, hvor felterne lå på `companies`, som
-- BEVARES og derfor skal nulstilles felt for felt.
--
-- FORMEN: [{"navn": "…", "url": "https://…"}], højst to. Indholdet valideres
-- i koden (`laesEgnePlatforme` i src/lib/stands.ts), fordi navnet vises
-- offentligt og adressen skal være http/https. Her håndhæves kun, at det ER
-- et array — en fejlformet værdi ville ellers vælte anmeldelsessiden for
-- butikkens kunder.
-- ---------------------------------------------------------------------------

alter table public.stands
  add column if not exists egne_platforme jsonb not null default '[]'::jsonb;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'stands_egne_platforme_array'
  ) then
    alter table public.stands
      add constraint stands_egne_platforme_array
      check (jsonb_typeof(egne_platforme) = 'array'
             and jsonb_array_length(egne_platforme) <= 2);
  end if;
end $$;
