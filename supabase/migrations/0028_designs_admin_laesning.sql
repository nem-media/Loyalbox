-- ---------------------------------------------------------------------------
-- 0028 — Admin må LÆSE designs
--
-- HVAD DEN RETTER: TRYK-kolonnen i /admin/ordrer stod tom for hver eneste
-- ordre — også dem med både farve og logo. Kolonnen findes præcis for at man
-- på et blik kan se, hvad der skal laves; i stedet skulle hver ordre åbnes.
--
-- HVORFOR DET SKETE: `designs` fik i 0018 kun ÉN policy, ejerens. Alle de
-- øvrige tabeller, admin læser — orders, feedback, scans, companies — har
-- `public.is_admin() or company_id in (...)`. Den klausul blev aldrig skrevet
-- for designs, og listesiden læser med brugerens egen klient.
--
-- OG DEN FEJLEDE TAVST. PostgREST kaster ikke på et blokeret join; det
-- returnerer `null` for den indlejrede tabel. Siden fik altså en ordre uden
-- design og tegnede sin tomme-tilstand — nøjagtig samme klasse fejl som
-- "Markér som fulgt op", der skrev nul rækker uden at sige det. Detaljesiden
-- virkede hele tiden, fordi den læser med service-role; derfor så det ud som
-- om oplysningen var der, og kun oversigten var "tom".
--
-- KUN LÆSNING. Admin skal kunne SE, hvad der skal trykkes — ikke ændre det.
-- Designet er kundens valg og det, de har betalt for; en admin, der kunne
-- skrive i det, ville kunne ændre, hvad der bliver trykt, uden at kunden ved
-- det. Derfor en selvstændig `for select`-policy frem for en udvidelse af
-- ejerens `for all`. Policies lægges sammen med OR, så ejeren beholder præcis
-- den adgang, hun har i dag.
--
-- Rører ikke slet_virksomhedens_data(): `designs` står allerede på listen fra
-- 0018, og en policy ændrer ikke, hvilke tabeller der ryddes.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

drop policy if exists designs_admin_select on public.designs;
create policy designs_admin_select on public.designs
  for select
  using (public.is_admin());

comment on policy designs_admin_select on public.designs is
  'Admin må læse alle designs, så ordreoversigten kan vise, hvad der skal trykkes. Kun læsning: designet er kundens eget valg.';
