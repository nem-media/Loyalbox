-- ---------------------------------------------------------------------------
-- 0045 — Op til fem pointprogrammer pr. virksomhed
--
-- 0044 tillod ÉT levende pointprogram, og begrundelsen var rigtig så langt,
-- den rakte: V1's brugerflade skulle ikke lære en café at vælge mellem to
-- programmer. Den holdt ikke i mødet med virkeligheden — en butik vil kunne
-- have fx en kaffeklub og en frokostklub, eller et program pr. sæson, uden at
-- skulle arkivere det ene for at prøve det andet.
--
-- HVORFOR IKKE BARE FJERNE GRÆNSEN. Hver kunde har én saldo PR. PROGRAM, og
-- personalet skal vælge program ved disken, hver gang der gives point. Uden en
-- grænse ville en butik kunne bygge en skærm, ingen kan betjene i en kø —
-- og kundens kort ville blive en liste af saldi, hun ikke kan holde styr på.
-- Fem er rundeligt til de tilfælde, nogen faktisk har, og lavt nok til at
-- flowet bliver ved med at være til at forstå.
--
-- HVORFOR EN TRIGGER OG IKKE ET INDEKS. Et partielt unikt indeks kan udtrykke
-- "højst ét" og ikke "højst fem" — der findes ikke en indekstype for en
-- optælling. Reglen ligger derfor i en trigger, og den LÅSER virksomheden
-- først: uden låsen kunne to samtidige oprettelser begge tælle fire og begge
-- indsætte. Samme greb som `giv_rabat()`, hvor en samlet grænse blev til tre
-- rabatter på en kampagne med plads til én.
--
-- RÆKKEN TÆLLER IKKE SIG SELV (`id <> new.id`). Uden det led ville en
-- statusændring på program nummer fem — fx "sæt på pause" — blive afvist,
-- fordi rækken allerede står i tabellen og tælles med.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

-- Ét-program-reglen fra 0044 er afløst af triggeren nedenfor.
drop index if exists public.loyalty_point_programs_et_levende_idx;

create or replace function public.point_program_graense()
returns trigger
language plpgsql
as $$
declare
  -- SKAL FØLGES AD MED `MAKS_POINTPROGRAMMER` i src/lib/loyalty/point.ts.
  -- `point-graense.test.ts` læser begge tal og kræver, at de er ens: en
  -- brugerflade, der lover seks, og en base, der giver fem, er en fejl,
  -- butikken møder midt i en opsætning.
  maks constant int := 5;
  levende int;
begin
  -- Låser virksomheden, så optællingen og indsættelsen er én beslutning.
  perform 1 from public.companies where id = new.company_id for update;

  select count(*)
    into levende
    from public.loyalty_point_programs
   where company_id = new.company_id
     and status <> 'archived'
     and id <> new.id;

  if levende >= maks then
    -- Koden i beskeden er stabil og oversættes i brugerfladen; teksten her er
    -- til den, der læser en driftslog.
    raise exception
      'for-mange-pointprogrammer: højst % pointprogrammer pr. virksomhed', maks;
  end if;

  return new;
end;
$$;

drop trigger if exists point_program_graense_trg on public.loyalty_point_programs;

-- Triggeren er også nødvendig ved UPDATE: at genåbne et arkiveret program er
-- lige så meget en oprettelse som en indsættelse, set fra grænsen.
create trigger point_program_graense_trg
  before insert or update of status on public.loyalty_point_programs
  for each row
  when (new.status <> 'archived')
  execute function public.point_program_graense();

revoke all on function public.point_program_graense() from public;
revoke all on function public.point_program_graense() from anon, authenticated;

comment on function public.point_program_graense() is
  'Højst fem ikke-arkiverede pointprogrammer pr. virksomhed (0045). Låser '
  'virksomheden, så to samtidige oprettelser ikke begge slipper forbi.';
