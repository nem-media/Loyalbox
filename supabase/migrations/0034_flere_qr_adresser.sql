-- FLERE QR-ADRESSER PÅ ÉT ABONNEMENT — én butik mere, ikke ét abonnement mere.
--
-- HVORFOR EN KOLONNE OG IKKE ET OPSLAG HOS STRIPE. Antallet spørges der om
-- hver gang /dashboard/standere vises, og hver gang `createStand()` kører.
-- Stripe er sandheden om penge, men et opslag dér ville lægge en netværkstur
-- ind foran en side, kunden venter på — og gøre den afhængig af, at Stripe
-- svarer. Kolonnen er et AFTRYK af antallet på abonnementets månedslinje:
-- købet skriver den, og `customer.subscription.updated` retter den, hvis de
-- skulle komme i utakt.
--
-- HVORFOR IKKE BARE TÆLLE `stands`. Fordi de to tal svarer på hver sit
-- spørgsmål: `stands` er hvad butikken HAR, og denne kolonne er hvad de har
-- BETALT for. Grænsen er forskellen mellem dem, og uden begge tal kan man
-- hverken spærre eller sælge.
--
-- DER BACKFILLES IKKE, OG DET ER DET VIGTIGSTE VALG I FILEN.
--
-- To virksomheder nåede at oprette mere end én adresse, før grænsen kom, og
-- det ligner noget, der skal rettes op. Det skal det ikke. Skrev vi deres
-- FAKTISKE antal ind her, ville kolonnen sige 2, mens abonnementet hos Stripe
-- stadig står på 1 — og så ville de to tal, der skal holde hinanden i skak,
-- lyve hver sin vej: et køb ville hæve Stripe til 2 og kolonnen til 3, altså
-- betaling for noget, de allerede havde stående i butikken.
--
-- Kolonnen holdes derfor lig med Stripe for ALLE, og `adresseSpaerre()`
-- håndterer de to som det, de er: nogen med flere adresser end de har betalt
-- for. De beholder hver eneste af dem — en grænse må aldrig fjerne noget, der
-- står ude i en butik — men adresse nummer tre er en samtale og ikke en knap.
--
-- Køres MANUELT i Supabase → SQL Editor. Idempotent.

alter table public.companies
  add column if not exists adresser_tilladt int not null default 1;

-- Mindst én. Nul ville lukke en betalende kundes egen adresse ude, og
-- negative tal er ikke en tilstand, nogen kode skal kunne komme i.
alter table public.companies
  drop constraint if exists companies_adresser_tilladt_positiv;
alter table public.companies
  add constraint companies_adresser_tilladt_positiv
  check (adresser_tilladt >= 1);

comment on column public.companies.adresser_tilladt is
  'Hvor mange QR-adresser abonnementet dækker. Skal altid svare til antallet '
  'på abonnementets månedslinje hos Stripe. Se src/lib/abonnement.ts.';
