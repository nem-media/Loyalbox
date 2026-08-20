-- ---------------------------------------------------------------------------
-- PRØVE af ryd_op_efter_frister() — kør i Supabase → SQL Editor
--
-- Nul rækker i et tørløb beviser ingenting, når al data er nyere end den
-- korteste frist. Denne prøve planter fire daterede rækker, kører oprydningen
-- OVEN PÅ dem og kontrollerer, at netop de rigtige forsvandt.
--
-- DEN KAN IKKE EFTERLADE NOGET. Hele prøven ligger i en DO-blok, der slutter
-- med at kaste en fejl — og en fejl ruller transaktionen tilbage. Resultatet
-- vises som fejlbeskeden. "ERROR" er her det forventede udfald.
--
-- Den er ikke en del af migrationerne og behøver kun køres én gang.
-- ---------------------------------------------------------------------------

do $$
declare
  firma uuid; stand uuid; program uuid;
  a uuid; b uuid; c uuid; d uuid;
  toer jsonb; rigtig jsonb;
  gammel constant timestamptz := now() - interval '30 months';
  mellem constant timestamptz := now() - interval '18 months';
  rapport text := '';

  a_slettet boolean; b_tilbage boolean;
  c_navn text; c_kommentar text; d_navn text; d_kommentar text;
begin
  select c1.id, s.id, p.id into firma, stand, program
    from public.companies c1
    join public.stands s on s.company_id = c1.id
    join public.loyalty_programs p on p.company_id = c1.id
   limit 1;

  if firma is null then
    raise exception 'Fandt ingen virksomhed med både en stander og et program at plante prøven i.';
  end if;

  -- A: kort oprettet for 30 mdr. siden, aldrig brugt        → skal slettes
  insert into public.loyalty_members (company_id, name, email, created_at)
  values (firma, 'PRØVE A', 'a@proeve.test', gammel) returning id into a;

  -- B: lige så gammelt kort, men tilmeldt et program i går   → skal BLIVE
  insert into public.loyalty_members (company_id, name, email, created_at)
  values (firma, 'PRØVE B', 'b@proeve.test', gammel) returning id into b;
  insert into public.loyalty_memberships (company_id, program_id, member_id, enrolled_at, created_at)
  values (firma, program, b, now() - interval '1 day', now() - interval '1 day');

  -- C: feedback fra for 30 mdr. siden  → både navn og kommentar skal væk
  insert into public.feedback (company_id, stand_id, rating, comment, customer_name, customer_email, created_at)
  values (firma, stand, 5, 'PRØVE C', 'C', 'c@proeve.test', gammel) returning id into c;

  -- D: feedback fra for 18 mdr. siden  → navnet væk, kommentaren bliver
  insert into public.feedback (company_id, stand_id, rating, comment, customer_name, customer_email, created_at)
  values (firma, stand, 4, 'PRØVE D', 'D', 'd@proeve.test', mellem) returning id into d;

  toer   := public.ryd_op_efter_frister(true);
  rigtig := public.ryd_op_efter_frister(false);

  select not exists (select 1 from public.loyalty_members where id = a) into a_slettet;
  select exists     (select 1 from public.loyalty_members where id = b) into b_tilbage;
  select customer_name, comment into c_navn, c_kommentar from public.feedback where id = c;
  select customer_name, comment into d_navn, d_kommentar from public.feedback where id = d;

  rapport :=
    E'\n\n=== PRØVE AF OPBEVARINGSFRISTERNE ===\n\n'
    || 'Tørløb:        ' || toer::text   || E'\n'
    || 'Rigtig kørsel: ' || rigtig::text || E'\n\n'
    || case when a_slettet then 'BESTÅET' else 'FEJLET ' end              || ' — inaktivt kort på 30 mdr. blev slettet' || E'\n'
    || case when b_tilbage then 'BESTÅET' else 'FEJLET ' end              || ' — lige så gammelt kort med aktivitet i går blev BEVARET' || E'\n'
    || case when c_navn is null then 'BESTÅET' else 'FEJLET ' end         || ' — feedback (30 mdr.): navnet er væk' || E'\n'
    || case when c_kommentar is null then 'BESTÅET' else 'FEJLET ' end    || ' — feedback (30 mdr.): kommentaren er væk' || E'\n'
    || case when d_navn is null then 'BESTÅET' else 'FEJLET ' end         || ' — feedback (18 mdr.): navnet er væk' || E'\n'
    || case when d_kommentar is not null then 'BESTÅET' else 'FEJLET ' end|| ' — feedback (18 mdr.): kommentaren er BEVARET' || E'\n'
    || case when (toer->>'medlemmer')::int = (rigtig->>'medlemmer')::int then 'BESTÅET' else 'FEJLET ' end
                                 || ' — tørløbet talte det samme, som kørslen gjorde' || E'\n\n'
    || E'Alt ovenstående er nu rullet tilbage. Databasen er urørt.\n';

  raise exception '%', rapport;
end $$;
