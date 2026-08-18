-- ---------------------------------------------------------------------------
-- 0008 — hvilket produkt virksomheden har købt
--
-- `plan` (basic/premium/pro) fortæller hvilke REVIEW-funktioner virksomheden
-- har adgang til. Den kan derimod ikke skelne Reviewstander Pro fra LoyalSum
-- Komplet: begge giver de samme review-funktioner og lander derfor på `pro`.
-- Forskellen er stempelkortet — og den fandtes indtil nu kun i produktdata,
-- ikke på virksomheden. Resultatet var, at ENHVER virksomhed kunne oprette et
-- stempelkortprogram, også dem der ikke havde betalt for det.
--
-- `product_slug` peger på slug'en i src/lib/constants.ts (PRODUCTS). Feltet
-- bruges til to ting: at afgøre om stempelkortet er låst op, og at kunne regne
-- den præcise pris for at opgradere. Stripe-webhooken skal skrive samme felt,
-- når betalingen åbner.
--
-- BACKFILL: virksomheder der allerede HAR et stempelkortprogram, sættes til
-- loyalsum-komplet. Ellers ville spærringen tage adgangen fra kunder, der
-- bruger funktionen i dag — herunder demovirksomheden Testcafe.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

alter table public.companies
  add column if not exists product_slug text;

comment on column public.companies.product_slug is
  'Slug fra PRODUCTS i src/lib/constants.ts. Styrer adgang til stempelkort og bruges til opgraderingspris. Sættes af Stripe-webhooken, når betaling er åben.';

-- Backfill: bevar adgangen for dem der allerede er i gang.
update public.companies c
set product_slug = 'loyalsum-komplet'
where c.product_slug is null
  and exists (
    select 1 from public.loyalty_programs p
    where p.company_id = c.id
  );

create index if not exists companies_product_slug_idx
  on public.companies(product_slug);
