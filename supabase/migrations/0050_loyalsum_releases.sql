-- ============================================================================
-- 0050 — PRIVAT SPAND TIL LOYALSUMS EGNE UDGIVELSER (WooCommerce-pluginet)
--
-- Pluginet er inkluderet i LoyalSum Komplet og LoyalSum Komplet Online og må
-- KUN kunne hentes af dem. Derfor ligger ZIP'en i en PRIVAT spand og aldrig
-- under /public: downloadruten (`/api/integrationer/woocommerce/download`)
-- afgør adgangen server-side og henter selv filen med service-role.
--
-- INGEN POLICIES PÅ storage.objects FOR DENNE SPAND, MED VILJE. Uden en
-- policy kan hverken anon eller authenticated læse, liste eller skrive i den;
-- kun service-role (som går uden om RLS) kan. Tilføj aldrig en læse-policy
-- her — så kan enhver indlogget bruger hente filen uden om planen.
--
-- IDEMPOTENT: kan køres igen; en senere kørsel gør spanden privat igen, hvis
-- nogen har slået den offentlig i dashboardet. Køres MANUELT i Supabase →
-- SQL Editor (se AGENTS.md).
--
-- Filen selv uploades bagefter (Supabase → Storage → loyalsum-releases) til
-- `woocommerce/<version>/<filnavn>` — se `src/lib/woocommerce-plugin/release.ts`.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'loyalsum-releases',
  'loyalsum-releases',
  false,
  20971520, -- 20 MB; pluginet er under 100 KB
  array['application/zip', 'application/x-zip-compressed', 'application/octet-stream']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
