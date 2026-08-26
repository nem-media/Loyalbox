-- ===========================================================================
-- 0023 — Kundens egen accentfarve på skiltet
--
-- Skiltet har TRE farveroller, ikke to:
--   1. Standerens farve  → emnet, sort eller hvidt akryl   (stander_farve)
--   2. Baggrunden        → det printede felt, mod betaling (front_hex)
--   3. ACCENTEN          → stjerner, ring og "Scan eller tap"  ← NY
--
-- Accenten er GRATIS at vælge. Den koster ingen ekstra opsætning i trykken:
-- det er den samme fil med en anden farvekode. Frontfarven koster, fordi
-- baggrunden er et selvstændigt tryk.
--
-- NULL betyder "brug LoyalSums egen farve" (#4ea4ad). Kolonnen er derfor
-- nullable uden standardværdi — så eksisterende designs beholder præcis det
-- udtryk, de blev bestilt med, uden at vi skriver en farve ind på deres
-- vegne.
--
-- INGEN PERSONOPLYSNING. Kolonnen er med vilje ikke føjet til
-- sletterutinerne (0014, 0017, 0018): en hexkode siger intet om et menneske,
-- og en oprydning, der rører flere felter end nødvendigt, er sværere at
-- gennemskue, når den en dag skal forklares.
-- ===========================================================================

alter table public.designs
  add column if not exists accent_hex text;

-- Samme prøve som front_hex: seks hexcifre med foranstillet #, eller intet.
-- Står den ikke i basen, kan en hånd-rettet række sende en ugyldig værdi
-- videre i trykfilen, og et skilt kan ikke kaldes tilbage.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'designs_accent_hex_format'
  ) then
    alter table public.designs
      add constraint designs_accent_hex_format
      check (accent_hex is null or accent_hex ~* '^#[0-9a-f]{6}$');
  end if;
end $$;

comment on column public.designs.accent_hex is
  'Kundens egen farve på stjerner, ring og "Scan eller tap". NULL = LoyalSums #4ea4ad. Gratis tilvalg.';
