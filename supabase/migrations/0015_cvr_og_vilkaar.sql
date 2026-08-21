-- ---------------------------------------------------------------------------
-- 0015 — CVR-nummer og accept af handelsbetingelserne
--
-- TO HULLER, SAMME ÅRSAG: betingelserne forudsatte ting, systemet ikke
-- registrerede.
--
-- 1) CVR. Handelsbetingelserne forudsætter et erhvervskøb — priser uden moms,
--    ingen fortrydelsesret — men der blev kun spurgt om et firmanavn som fri
--    tekst. En privatperson kunne købe, og så gælder forbrugerreglerne uanset
--    hvad betingelserne siger. Nummeret hører desuden på fakturaen i et dansk
--    B2B-salg.
--
-- 2) Accept af betingelserne. Databehandleraftalens accept blev gemt med sin
--    version (0010), men handelsbetingelsernes blev ikke gemt overhovedet.
--    Ændres et vilkår, kan vi ikke vise, hvad kunden sagde ja til.
--
-- KOLONNERNE ER FRIVILLIGE I DATABASEN. De tre nuværende butikker er oprettet
-- før kravet og må ikke låses ude af det, de allerede har købt. Kravet
-- håndhæves dér, hvor det betyder noget: ved oprettelse og ved køb.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

alter table public.companies
  -- Otte cifre, uden mellemrum og uden DK-præfiks. Kontrolleres med modulus 11
  -- i src/lib/cvr.ts, før den når hertil.
  add column if not exists cvr text,
  -- Accept af handelsbetingelserne, med den version der blev accepteret.
  -- Samme mønster som dpa_accepted_at/dpa_version.
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

-- Formatkontrollen ligger OGSÅ i databasen. Koden er den, der giver kunden en
-- læselig fejl, men en tabel, der kun er rigtig så længe al kode husker at
-- spørge, er ikke rigtig. Modulus 11 hører hjemme i koden; her fanges det
-- åbenlyse.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_cvr_format'
  ) then
    alter table public.companies
      add constraint companies_cvr_format
      check (cvr is null or cvr ~ '^[0-9]{8}$');
  end if;
end $$;

-- To virksomheder må ikke kunne dele CVR-nummer. Det er ikke en teoretisk
-- finesse: sker det, står der to konti bag samme juridiske køber, og hverken
-- fakturaer eller en sletningsanmodning kan holdes fra hinanden.
create unique index if not exists companies_cvr_unik
  on public.companies(cvr)
  where cvr is not null;
