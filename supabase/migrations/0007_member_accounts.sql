-- ---------------------------------------------------------------------------
-- 0007 — Kundekonti for slutkunder
--
-- Indtil nu har en butiks slutkunde (`loyalty_members`) ingen konto: kortet
-- tilgås udelukkende via den hemmelige URL `/kort/<public_token>`. Mister
-- kunden linket, er kortet reelt væk, og det kan ikke bruges på en ny telefon.
--
-- Denne migration tilføjer en FRIVILLIG konto oven på den eksisterende model:
--   * token-URL'en virker præcis som før for walk-in-kunder uden konto,
--   * en kunde kan knytte sit kort til en almindelig e-mail+adgangskode-konto
--     og finder det derefter igen på /mine-kort fra en hvilken som helst enhed.
--
-- Sikkerhedsmodel: BESIDDELSE AF TOKENET er beviset. Et kort kan kun knyttes
-- til en konto, hvis man står på kortets egen URL. Der knyttes ALDRIG på
-- e-mail-match alene — e-mails er ikke verificerede ved signup.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

alter table public.loyalty_members
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.loyalty_members
  add column if not exists claimed_at timestamptz;

create index if not exists loyalty_members_user_id_idx
  on public.loyalty_members(user_id);

-- Kunden må læse sit eget kort. Alle writes sker fortsat via service-role EFTER
-- validering i app-laget — policyen åbner udelukkende læsning af egne rækker.
drop policy if exists loyalty_members_self_select on public.loyalty_members;
create policy loyalty_members_self_select on public.loyalty_members
  for select using (user_id = auth.uid());
