-- ---------------------------------------------------------------------------
-- 0039 — DÆMPNINGEN AF ALARMER SKAL AFGØRES AF DATABASEN, IKKE AF ET OPSLAG
--
-- `noterFejl()` har altid haft den rigtige BEGRUNDELSE skrevet ind:
--
--     "DÆMPNINGEN LIGGER I DATABASEN og ikke i en variabel i processen. En
--      serverfunktion kan køre i mange eksemplarer samtidig, og hver af dem
--      ville have sin egen tæller: en fejl, der rammer hundrede gange på et
--      minut, ville blive til hundrede mails."
--
-- Men den var implementeret som et OPSLAG efterfulgt af en indsættelse, og det
-- er ikke det samme som at databasen afgør det. Alle eksemplarer læser
-- "ingen alarm sendt endnu", FØR nogen af dem har skrevet sin linje.
--
-- MÅLT 2026-09-15: ti samtidige fejl i samme opgave gav **ti mails**. Præcis
-- det tal, kommentaren lover, at designet forhindrer. Sekventielt virker
-- dæmpningen upåklageligt — tre fejl efter hinanden gav nul ekstra mails — og
-- det er derfor, fejlen har kunnet stå: den almindelige dag ligner en succes.
--
-- HVORNÅR DET SKER I VIRKELIGHEDEN: når noget FÆLLES går ned. Er databasen
-- eller Stripe utilgængelig, fejler hver webhook, hver cron og hver
-- serverhandling på én gang — og det er netop dér, indbakken skal kunne bruges
-- til at finde ud af hvad der er galt, i stedet for at være fyldt med den
-- samme besked halvtreds gange.
--
-- LØSNINGEN ER ET ATOMISK "MÅ JEG?" — samme greb som `juster_lager()`, hvor
-- to samtidige køb heller ikke må overskrive hinandens træk. `on conflict do
-- update ... where` er én sætning: PostgreSQL låser rækken, og præcis ét kald
-- får en række tilbage. De øvrige får ingen og sender derfor ikke.
--
-- TABELLEN ER IKKE EN LOG. Driftsloggen bliver ved at være den fulde historik
-- — hver eneste fejl skrives dér, også de dæmpede. Her står kun ÉN række pr.
-- opgavenavn med tidspunktet for den seneste alarm, og den må ikke indeholde
-- andet: ingen besked, ingen persondata, intet at rydde op i efter en frist.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

create table if not exists public.alarm_daempning (
  opgave          text primary key,
  sidst_alarmeret timestamptz not null default now()
);

-- Kun service-role rører den. Ingen politik betyder ingen adgang for nogen
-- anden — og der er intet herinde, en bruger skal kunne se.
alter table public.alarm_daempning enable row level security;

/**
 * Må der sendes en alarm for `p_opgave` lige nu?
 *
 * Svarer true til PRÆCIS ÉT kald inden for vinduet, også når hundrede kalder
 * samtidig. `on conflict do update ... where` er sætningen, der gør det:
 * rækken låses, betingelsen prøves mod den GEMTE værdi, og kun hvis den er
 * gammel nok, opdateres den og gives tilbage.
 *
 * Er der ingen række i forvejen, vinder indsættelsen — første alarm for en
 * opgave går altid igennem.
 */
create or replace function public.maa_alarmere(
  p_opgave text,
  p_minutter int default 60
)
returns boolean
language sql
as $$
  insert into public.alarm_daempning (opgave, sidst_alarmeret)
  values (p_opgave, now())
  on conflict (opgave) do update
     set sidst_alarmeret = now()
   where alarm_daempning.sidst_alarmeret < now() - make_interval(mins => p_minutter)
  returning true;
$$;

-- `slet_virksomhedens_data()` har et sikkerhedsnet, der standser sletningen,
-- hvis en tabel med `company_id` ikke står på en af listerne. Tabellen her har
-- INGEN `company_id` — den hører til driften og ikke til en kunde — så den
-- skal ikke tilføjes dér.
--
-- I `scripts/backup.mjs` SKAL den derimod med, og `backup.test.ts` fangede
-- netop, at den manglede. Det var fristende at undtage den, fordi den er ren
-- øjebliksdata — men reglen "hver eneste tabel eksporteres" er mere værd end
-- den sparede linje, og en undtagelsesliste ville før eller siden blive brugt
-- til noget, der betød noget. Det værste, en gendannet række koster, er en
-- alarm, der holdes tilbage i op til en time.
