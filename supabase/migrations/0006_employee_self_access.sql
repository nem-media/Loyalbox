-- ============================================================================
-- LoyalBox — medarbejder-login: læse-adgang til egen employees-række
-- ============================================================================
-- I 0004 kunne KUN virksomhedsejeren/admin læse `employees` (policy
-- `employees_owner_all`). Det betød at en medarbejder ikke kunne slå sin EGEN
-- aktive række op — så `getCompanyAccess()` (src/lib/loyalty/access.ts) aldrig
-- genkendte dem som personale, og personale-panelet på kortet forblev skjult.
--
-- Denne politik åbner PRÆCIS den ene række der tilhører den indloggede bruger
-- (`user_id = auth.uid()`) — ikke resten af virksomhedens medarbejdere. Flere
-- permissive SELECT-politikker OR'es sammen, så dette udvider blot synligheden
-- oven på `employees_owner_all` uden at røre ejer-/admin-adgangen.
--
-- Writes (stemple/indløse) sker fortsat udelukkende via service-role EFTER
-- app-validering i service-laget, så denne politik åbner kun LÆSNING.
--
-- Kør i Supabase → SQL Editor. Idempotent.
-- ============================================================================

drop policy if exists employees_self_select on public.employees;
create policy employees_self_select on public.employees
  for select
  using (user_id = auth.uid());
