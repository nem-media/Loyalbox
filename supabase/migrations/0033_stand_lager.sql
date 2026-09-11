-- Internt lager over fysiske standere, opdelt på farve.
--
-- KUN TIL INTERNT BRUG. Kunder ser ALDRIG lageret, og et køb spærres ALDRIG
-- af det — vi sælger videre, selv når hylden er tom (antal må gå i minus, det
-- betyder blot restordre). Derfor er der ingen kobling til koebSpaerre; kun
-- admin læser og skriver, og webhooken trækker fra ved et køb.
--
-- Køres MANUELT i Supabase → SQL Editor. Idempotent.

create table if not exists public.stand_lager (
  farve      text primary key check (farve in ('sort', 'hvid')),
  antal      int not null default 0,
  updated_at timestamptz not null default now()
);

-- Startbeholdning oplyst af ejeren 2026-09-11: 29 sorte, 32 hvide.
-- `do nothing`, så en gentaget kørsel ikke nulstiller et lager, der er i drift.
insert into public.stand_lager (farve, antal) values
  ('sort', 29),
  ('hvid', 32)
on conflict (farve) do nothing;

alter table public.stand_lager enable row level security;

-- Kun admin må røre lageret gennem en brugerklient. Service-role (webhook og
-- admin-handlinger) omgår RLS og rammer derfor altid — men politikken lukker
-- enhver anden vej ind, hvis en almindelig bruger nogensinde forsøger.
drop policy if exists stand_lager_admin on public.stand_lager;
create policy stand_lager_admin on public.stand_lager
  for all using (public.is_admin()) with check (public.is_admin());

-- ATOMISK JUSTERING. PostgREST kan ikke skrive `antal = antal + n`, og en
-- læs-så-skriv fra koden ville tabe et samtidigt køb. En SQL-funktion gør det
-- i ét udtryk, så to webhooks, der rammer samtidig, ikke overskriver hinanden.
-- p_delta er negativ ved et køb og positiv/negativ ved en manuel rettelse.
-- Returnerer den nye beholdning.
create or replace function public.juster_lager(p_farve text, p_delta int)
returns int
language sql
security definer
set search_path = public
as $$
  update public.stand_lager
     set antal = antal + p_delta,
         updated_at = now()
   where farve = p_farve
  returning antal;
$$;
