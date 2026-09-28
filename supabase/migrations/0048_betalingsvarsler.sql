-- 0048 — TRE VARSLER, FØR ADGANGEN LUKKER
--
-- HVORFOR. Adgangen faldt til basic ved FØRSTE fejlede betaling, mens
-- handelsbetingelsernes §7 lovede, at Stripe prøvede igen først. Ejeren
-- besluttede 28. september 2026: adgangen er urørt, mens betalingen prøves
-- igen, kunden får tre høflige varsler (dag 0, 4 og 8), og først efter elleve
-- dage lukker adgangen. Se `BETALINGSVARSEL_DAGE` i src/lib/abonnement.ts.
--
-- TO KOLONNER, OG DE ER BEGGE EN SPÆRRE:
--
--   betaling_fejlet_siden   hvornår sagen begyndte. Sættes KUN, hvis den er
--                           tom — Stripe sender flere opdateringer på vej
--                           gennem rykkerforløbet, og hver af dem ville ellers
--                           skubbe fristen foran sig. Samme greb som
--                           `suspenderet_siden`.
--   betalingsvarsler_sendt  0-3. Et varsel sendes af den, der vinder en
--                           BETINGET opdatering fra n-1 til n — så to
--                           samtidige kørsler ikke kan sende det samme varsel.
--
-- Nulstilles begge, så snart abonnementet betaler igen.
--
-- INGEN PERSONDATA: et tidspunkt og et tal. Sletningens sikkerhedsnet ser på
-- tabeller med `company_id`, og dette er kolonner på `companies` selv.
--
-- IDEMPOTENT: `add column if not exists`. Kan køres igen uden virkning.

alter table public.companies
  add column if not exists betaling_fejlet_siden timestamptz,
  add column if not exists betalingsvarsler_sendt smallint not null default 0;

comment on column public.companies.betaling_fejlet_siden is
  'Første fejlede betaling i den igangværende betalingssag (0048). Null når abonnementet betaler.';
comment on column public.companies.betalingsvarsler_sendt is
  'Antal betalingsvarsler sendt i den igangværende sag, 0-3 (0048).';
