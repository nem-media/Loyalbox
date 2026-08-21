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
-- Kør manuelt i Supabase → SQL Editor. Idempotent (opdaterer kun hvor cvr er
-- tom, så et rettet nummer ikke bliver overskrevet ved en genkørsel).
--
-- SEKS AF SYV får et nummer. Frisør Nielsine står bevidst uden — se
-- begrundelsen ved hendes navn nedenfor.
-- ---------------------------------------------------------------------------

-- --------------------------------------------------------- rigtige kunder --

-- Vores eget selskab.
update public.companies
   set cvr = '37811769'
 where name = 'Nem Media ApS'
   and cvr is null;

-- FRISØR NIELSINE FÅR BEVIDST INTET CVR. Hun ligger i Grønland
-- (+299, Nuuk), og vi sender kun til Danmark. Hun kan derfor ikke købe
-- gennem selvbetjeningen alligevel, og et nummer ville ikke låse noget op.
--
-- Det går ikke ud over hende: CVR-spærren rammer kun NYE køb. Hendes stander,
-- hendes stempelkort og hendes dashboard kører uændret videre.
--
-- TO TING AT HUSKE, HVIS HUN EN DAG SKAL BETALE GENNEM SYSTEMET:
--
--   1. Momsen ville blive forkert. Momslovens afgiftsområde omfatter ikke
--      Grønland. Standeren er udførsel efter momsloven § 34, stk. 1, nr. 5
--      og skal være 0 %; abonnementet er en B2B-ydelse til en kunde uden for
--      EU, hvor leveringsstedet er hos hende. Koden lægger 25 % på begge.
--   2. Leveringslandet er låst til DK (se LEVERINGSLANDE i constants.ts), så
--      checkout ville afvise hende ved adressen. Det er i dag en fordel: det
--      spærrer for momsfejlen frem for at begå den.
--
-- Skal Grønland med en dag, er det ikke en linje her — det er en momssats
-- mere, et landefelt på virksomheden og fragt, og alle tre skal bygges først.

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
-- Kør denne bagefter. Seks skal have et nummer, ingen må være ens, og den
-- eneste uden skal være Frisør Nielsine.
--
--   select name, cvr from public.companies order by name;
--   select name from public.companies where cvr is null;
