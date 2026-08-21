-- ---------------------------------------------------------------------------
-- 0016 — CVR på de virksomheder, der fandtes før kravet
--
-- HVORFOR DEN ER NØDVENDIG NU: efter 0015 kræver købsspærren et gyldigt CVR
-- (se koebSpaerre() i src/lib/commerce.ts). Alle syv eksisterende
-- virksomheder har `cvr = null`, så INGEN kan starte en betaling — heller
-- ikke testkontiene, som er dem, betalingsflowet afprøves med.
--
-- Numrene herunder består modulus 11-kontrollen. De fiktive er valgt, fordi
-- de skal kunne bruges i testtilstand, hvor der aldrig udstedes en rigtig
-- faktura. Bemærk at et nummer, der består kontrollen, godt kan tilhøre en
-- virkelig virksomhed — derfor må de kun stå på testkonti.
--
-- SKAL UDFYLDES FØR KØRSEL: Frisør Nielsine er en rigtig kunde, og hendes
-- rigtige CVR-nummer skal ind. Linjen fejler med vilje, hvis den ikke rettes.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent (opdaterer kun hvor cvr er
-- tom, så et rettet nummer ikke bliver overskrevet ved en genkørsel).
-- ---------------------------------------------------------------------------

-- --------------------------------------------------------- rigtige kunder --

-- Vores eget selskab.
update public.companies
   set cvr = '37811769'
 where name = 'Nem Media ApS'
   and cvr is null;

-- RIGTIG KUNDE — udskift 'UDFYLD' med hendes CVR-nummer, før du kører.
-- Står der stadig UDFYLD, afvises linjen af formatkontrollen fra 0015, og
-- resten af scriptet rulles tilbage. Det er med vilje: et gæt på en rigtig
-- kundes CVR ender på en rigtig faktura.
update public.companies
   set cvr = 'UDFYLD'
 where name = 'Frisør Nielsine'
   and cvr is null;

-- ------------------------------------------------------------- testkonti --
-- Fiktive numre, kun til testtilstand. Må aldrig ende på en rigtig faktura.

update public.companies
   set cvr = '12345674'
 where name = 'Testcafe (demo)'
   and cvr is null;

update public.companies
   set cvr = '11111114'
 where name = 'Testkiosk Basic'
   and cvr is null;

update public.companies
   set cvr = '22222228'
 where name = 'Testsalon Pro'
   and cvr is null;

update public.companies
   set cvr = '10101018'
 where name = 'Testfirma'
   and cvr is null;

update public.companies
   set cvr = '55555559'
 where name = 'Test Café Aarhus'
   and cvr is null;

-- ------------------------------------------------------------- kontrollen --
-- Kør denne bagefter. Alle syv skal have et nummer, og ingen må være ens.
--
--   select name, cvr from public.companies order by name;
--   select count(*) as uden_cvr from public.companies where cvr is null;
