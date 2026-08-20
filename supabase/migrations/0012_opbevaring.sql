-- ---------------------------------------------------------------------------
-- 0012 — Opbevaringsfrister
--
-- Sletter og anonymiserer efter faste frister. Kaldes én gang i døgnet fra
-- /api/cron/oprydning.
--
-- HVORFOR I DATABASEN OG IKKE I KODEN: "sidste aktivitet" for et medlem er en
-- sammenligning på tværs af fem tabeller. Hentet ud i JavaScript ville det
-- være mange rundture og en halvfærdig oprydning, hvis en af dem fejler. Her
-- er hele kørslen én transaktion: enten sker den, eller også sker den ikke.
--
-- FRISTERNE STÅR TO STEDER: her og i src/lib/opbevaring.ts, som er dét,
-- privatlivspolitikken og databehandleraftalen viser. Ændrer du en frist, skal
-- BEGGE rettes — ellers lover vi kunderne noget andet, end vi gør. Testen
-- opbevaring.test.ts holder de to lister op mod hinanden.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

create or replace function public.ryd_op_efter_frister(p_toerloeb boolean default true)
returns jsonb
language plpgsql
as $$
declare
  -- Fristerne. Se kommentaren øverst, før du ændrer et tal her.
  frist_feedback_navn      constant interval := '12 months';
  frist_feedback_kommentar constant interval := '24 months';
  frist_medlem_inaktiv     constant interval := '24 months';
  frist_samtykkelog        constant interval := '3 years';
  frist_revisionslog       constant interval := '24 months';

  inaktive uuid[];
  n_navn      int := 0;
  n_kommentar int := 0;
  n_medlemmer int := 0;
  n_samtykke  int := 0;
  n_revision  int := 0;
begin
  -- 1) Feedback: navn og e-mail efter 12 måneder.
  --    Bedømmelsen og datoen bliver liggende — uden navn peger de ikke på
  --    nogen, og butikkens udvikling over tid overlever.
  if p_toerloeb then
    select count(*) into n_navn
      from public.feedback
     where created_at < now() - frist_feedback_navn
       and (customer_name is not null or customer_email is not null);
  else
    with ryddet as (
      update public.feedback
         set customer_name = null, customer_email = null
       where created_at < now() - frist_feedback_navn
         and (customer_name is not null or customer_email is not null)
      returning 1
    )
    select count(*) into n_navn from ryddet;
  end if;

  -- 2) Feedback: selve kommentaren efter 24 måneder.
  --    Fritekst kan indeholde oplysninger om både kunden og personalet, og
  --    den kan derfor ikke blive liggende, blot fordi navnet er væk.
  if p_toerloeb then
    select count(*) into n_kommentar
      from public.feedback
     where created_at < now() - frist_feedback_kommentar
       and comment is not null;
  else
    with ryddet as (
      update public.feedback
         set comment = null
       where created_at < now() - frist_feedback_kommentar
         and comment is not null
      returning 1
    )
    select count(*) into n_kommentar from ryddet;
  end if;

  -- 3) Stempelkort uden aktivitet i 24 måneder.
  --
  --    SIDSTE AKTIVITET ER DEN SENESTE AF ALT, HVAD DER KAN SKE PÅ ET KORT.
  --    Kun at kigge på stempler ville slette en kunde, der fik en rabat efter
  --    sin feedback og aldrig nåede at bruge den — der ER sket noget på det
  --    kort. Oprettelsen tæller med, så et helt nyt kort uden bevægelser ikke
  --    ryger med det samme.
  with sidste_aktivitet as (
    select m.id,
           greatest(
             m.created_at,
             coalesce((select max(t.created_at)
                         from public.loyalty_transactions t
                        where t.member_id = m.id), '-infinity'::timestamptz),
             coalesce((select max(ms.enrolled_at)
                         from public.loyalty_memberships ms
                        where ms.member_id = m.id), '-infinity'::timestamptz),
             coalesce((select max(greatest(cr.earned_at, coalesce(cr.redeemed_at, cr.earned_at)))
                         from public.customer_rewards cr
                        where cr.member_id = m.id), '-infinity'::timestamptz),
             coalesce((select max(greatest(cd.granted_at, coalesce(cd.redeemed_at, cd.granted_at)))
                         from public.customer_discounts cd
                        where cd.member_id = m.id), '-infinity'::timestamptz)
           ) as sidst
      from public.loyalty_members m
  )
  select coalesce(array_agg(id), '{}'::uuid[])
    into inaktive
    from sidste_aktivitet
   where sidst < now() - frist_medlem_inaktiv;

  n_medlemmer := coalesce(array_length(inaktive, 1), 0);

  -- Medlemsrækken er ophænget: medlemskaber, posteringer, belønninger,
  -- rabatter og samtykker hænger på den med `on delete cascade` og følger med.
  if not p_toerloeb and n_medlemmer > 0 then
    delete from public.loyalty_members where id = any(inaktive);
  end if;

  -- 4) Samtykkeloggen efter 3 år. Den indeholder intet personhenførbart, men
  --    dokumentationspligten rækker ikke længere end forældelsen.
  if p_toerloeb then
    select count(*) into n_samtykke
      from public.consent_log
     where created_at < now() - frist_samtykkelog;
  else
    with ryddet as (
      delete from public.consent_log
       where created_at < now() - frist_samtykkelog
      returning 1
    )
    select count(*) into n_samtykke from ryddet;
  end if;

  -- 5) Revisionsloggen efter 24 måneder — samme frist som kortene, den
  --    handler jo om, hvad der er sket på dem.
  if p_toerloeb then
    select count(*) into n_revision
      from public.loyalty_audit_log
     where created_at < now() - frist_revisionslog;
  else
    with ryddet as (
      delete from public.loyalty_audit_log
       where created_at < now() - frist_revisionslog
      returning 1
    )
    select count(*) into n_revision from ryddet;
  end if;

  return jsonb_build_object(
    'toerloeb',            p_toerloeb,
    'feedback_navn',       n_navn,
    'feedback_kommentar',  n_kommentar,
    'medlemmer',           n_medlemmer,
    'samtykkelog',         n_samtykke,
    'revisionslog',        n_revision
  );
end;
$$;

-- PostgREST udstiller funktioner i public-skemaet, og uden dette ville enhver
-- besøgende kunne kalde /rest/v1/rpc/ryd_op_efter_frister og tømme databasen.
-- Kun service-role må kalde den.
revoke all on function public.ryd_op_efter_frister(boolean) from public;
revoke all on function public.ryd_op_efter_frister(boolean) from anon, authenticated;
grant execute on function public.ryd_op_efter_frister(boolean) to service_role;

comment on function public.ryd_op_efter_frister(boolean) is
  'Sletter og anonymiserer efter opbevaringsfristerne. p_toerloeb=true tæller kun. Kaldes fra /api/cron/oprydning.';
