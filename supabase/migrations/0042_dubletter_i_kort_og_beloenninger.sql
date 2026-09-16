-- ---------------------------------------------------------------------------
-- 0042 — TO DUBLETTER MERE: kundens kort og stempelkortets belønning
--
-- Fundet ved en fejning efter gennemgangen: mønsteret "læs-så-skriv uden en
-- vagt" gav fjorten kandidater, og disse to var ægte. Begge lå i områder, der
-- ikke var blevet kigget på — præcis som `redeemDiscount` i 0041.
--
-- MÅLT PÅ DEMODATA 2026-09-16:
--
--  1. `selfEnroll()` slår op, om der findes et medlem med samme e-mail eller
--     telefon, og opretter ellers et nyt. To samtidige tilmeldinger med SAMME
--     e-mail gav **to kort med hver sit token**. Kunden står med to, og kun
--     det ene kan findes igen — `selfEnroll` og `/kort/find` slår op med
--     `limit(1)` og rammer vilkårligt det ene. Stemplerne fordeler sig så på
--     to kort, uden at nogen kan se hvorfor.
--
--  2. `updateProgram()` læser den primære belønning og opretter den, hvis den
--     ikke findes. To samtidige redigeringer af samme stempelkort gav **to
--     primære belønninger** — og dét er værre, end det lyder. `giveStamp()`
--     slår den primære op med `.maybeSingle()`, og med to rækker svarer
--     PostgREST **406 / PGRST116**. Fejlen sluges, `reward` bliver null, og
--     der udstedes **aldrig en belønning igen**. Butikkens stempelkort holder
--     op med at virke, uden at noget fejler nogen steder.
--
-- INDEKSERNE MATCHER DE OPSLAG, KODEN LAVER. `selfEnroll` sammenligner
-- e-mailen, som den er skrevet (`.eq("email", email)`), så indekset gør det
-- samme. Et `lower(email)` ville være strengere end opslaget: den anden
-- tilmelding ville blive afvist af basen, men opslaget ville ikke kunne finde
-- den første, og kunden ville sidde fast.
--
-- `where ... is not null` på begge: en kunde må gerne oprettes med kun et
-- telefonnummer, og så er e-mailen tom. Uden filteret ville det andet
-- tomme felt kollidere med det første.
--
-- Efterprøvet før oprettelsen: ingen virksomhed har i dag to medlemmer med
-- samme e-mail eller telefon, og intet program har to primære belønninger.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

-- ------------------------------------------------- 1) ét kort pr. kunde pr. butik
create unique index if not exists loyalty_members_en_mail_pr_firma_idx
  on public.loyalty_members (company_id, email)
  where email is not null;

create unique index if not exists loyalty_members_et_tlf_pr_firma_idx
  on public.loyalty_members (company_id, phone)
  where phone is not null;

-- ------------------------------------------- 2) én primær belønning pr. program
-- `where is_primary` og ikke `where is_primary and status = 'active'`: en
-- ARKIVERET primær skal også tælle med. Ellers kunne "slå belønningen fra" og
-- "slå den til igen" ende med to rækker, hvoraf `giveStamp()` igen ikke kan
-- vælge — og det er netop dén vej, `rewardType === "none"` går.
create unique index if not exists loyalty_rewards_en_primaer_pr_program_idx
  on public.loyalty_rewards (program_id)
  where is_primary;
