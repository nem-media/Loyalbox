-- ---------------------------------------------------------------------------
-- 0027 — Offentlig kundescore (frivillig, slået fra som standard)
--
-- HVAD DEN GØR: lader virksomheden vælge, at dens LoyalSum Kundescore må vises
-- på den offentlige side, kunderne lander på. Ét felt, ét valg.
--
-- SLÅET FRA SOM STANDARD, og det er ikke en teknikalitet. Et tal om en
-- virksomhed, der offentliggøres uden at nogen har sagt ja, er ikke
-- virksomhedens eget — og en default på `true` ville betyde, at hver eneste
-- eksisterende kunde fik sin score offentliggjort den dag, migrationen kørte.
--
-- KUN KUNDESCOREN, ALDRIG REPUTATION SCORE. De to er forskellige ting:
-- Kundescoren er kundernes egne stjerner og kan stå offentligt, mens
-- Reputation Score er LoyalSums egen sammenvejning — herunder eksterne
-- ratings, virksomheden selv har oplyst. Sidstnævnte ville ligne en
-- karaktergivning fra os, og den skal blive i dashboardet. Feltet hedder
-- derfor `offentlig_kundescore` og ikke `offentlig_score`: navnet skal ikke
-- kunne misforstås af den næste, der bygger ovenpå.
--
-- INGEN NY TABEL, altså heller ingen ændring af slet_virksomhedens_data():
-- feltet ligger på `companies`, som bevares ved en sletning. Det er
-- ufarligt, fordi al feedback slettes med resten — uden kundeoplevelser er
-- der ingen score at vise, uanset hvad flaget står på.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

alter table public.companies
  add column if not exists offentlig_kundescore boolean not null default false;

comment on column public.companies.offentlig_kundescore is
  'Må LoyalSum Kundescore vises på den offentlige side? Frivilligt tilvalg, slået fra som standard. Gælder ALDRIG Reputation Score.';

-- Opslaget sker pr. stander på den offentlige side og går gennem companies.id,
-- så der er ikke brug for et indeks på feltet selv.
