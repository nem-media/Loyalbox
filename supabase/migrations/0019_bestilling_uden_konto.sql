-- ---------------------------------------------------------------------------
-- 0019 — Bestilling uden konto
--
-- BAGGRUND: en Basic-kunde køber ét skilt og skal ikke administrere noget
-- bagefter. De fik alligevel en konto, et dashboard uden indhold og en
-- LoyalSum-side, der indsamlede feedback, de ALDRIG kunne læse —
-- `feedbackInbox` er slået fra på Basic. Deres kunder skrev navn, e-mail og en
-- kommentar ind i et system, butikken ikke havde adgang til. Det er indsamling
-- uden formål, og det var grunden til, at de skulle have en
-- databehandleraftale overhovedet.
--
-- Efter denne ændring er Basic et trykt skilt uden en LoyalSum-side bagved:
-- ingen konto, ingen data, ingen aftale.
--
-- `companies.user_id` er nullable i forvejen (0001), så en virksomhed uden
-- login kræver ingen skemaændring. Det, der mangler, er to ting.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1) Standere, der kun viderestiller
--
-- QR-koden peger stadig på en LoyalSum-adresse og ikke direkte på kundens
-- link. Det er med vilje: det trykte skilt er permanent, og skal kunden en dag
-- opgradere eller skifte anmeldelsesplatform, kan samme skilt pege et nyt sted
-- hen. Pegede QR'en direkte på Google, ville et skift kræve nye skilte.
--
-- Men der VISES ingen side: adressen svarer med en viderestilling, og der
-- indsamles ingen feedback.
--
-- FLAGET ER EKSPLICIT og ikke udledt af `plan`. To grunde: de eksisterende
-- Basic-konti (oprettet før denne ændring) skal blive ved med at virke som de
-- gør, og en opgradering må ikke stiltiende ændre, hvad et trykt skilt gør.
-- ---------------------------------------------------------------------------

alter table public.stands
  add column if not exists kun_viderestilling boolean not null default false;

comment on column public.stands.kun_viderestilling is
  'Sandt = /r/<slug> viderestiller uden at vise en side og uden at indsamle feedback. Sættes ved bestilling uden konto.';

-- ---------------------------------------------------------------------------
-- 2) Kontaktoplysninger på ordren
--
-- Uden en konto er ordren det eneste sted, vi ved hvem der skal have skiltet.
-- Mailen står også hos Stripe, men en ordre skal kunne ekspederes uden at
-- skulle slå op i et andet system.
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists kontakt_email text,
  -- Sat når ordren kom fra bestillingen uden konto. Adskiller den fra en
  -- ordre lagt af en indlogget kunde, hvor kontoen er kilden.
  add column if not exists uden_konto boolean not null default false;

-- ---------------------------------------------------------------------------
-- 3) En virksomhed uden bruger skal kunne findes på sit CVR
--
-- Bestillingen uden konto slår op på CVR, så et afbrudt køb ikke spærrer for
-- det næste forsøg: CVR er unikt, og en ny række ville blive afvist. Indekset
-- findes allerede fra 0015 (unikt, delvist) — her tilføjes kun opslaget på
-- virksomheder UDEN bruger, som er dem, bestillingen må genbruge.
-- ---------------------------------------------------------------------------

create index if not exists companies_uden_bruger_idx
  on public.companies(cvr)
  where user_id is null and cvr is not null;
