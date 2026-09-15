-- ---------------------------------------------------------------------------
-- 0037 — Oprydningen slettede et BETALT køb
--
-- HVAD DER SKETE, MÅLT I DRIFTSLOGGEN. Ordre `bd2e2e24…` blev oprettet
-- 31. august kl. 16:03. Natten til den 2. september kl. 03:05 noterede
-- oprydningen `forladte_designs=1, slettede_logoer=1`. I dag står ordren som
-- `needs_onboarding` — altså BETALT — med `design_id: null` og en virksomhed,
-- hvis `logo_url` peger på en fil, der ikke findes mere (HTTP 400).
--
-- Kunden havde betalt. Vi slettede deres logo og deres farvevalg, og filen er
-- væk fra lageret — der er ikke noget at gendanne fra. Admin får ikke engang
-- at vide, at der mangler noget: uden et design tegnes hverken trykfilen eller
-- linket til den, og ordren ser bare ud, som om den aldrig havde trykvalg.
--
-- DET VAR DENNE ENE LINJE I 0021:
--
--     naadeperiode constant interval := '24 hours';
--     -- "Stripes checkout-session udløber selv efter et døgn, så et design,
--     --  der er ældre end det, kan ikke længere føre til en betaling."
--
-- Begrundelsen er sand og måler bare det forkerte. Et døgn er, hvor længe der
-- kan STARTES en betaling. Faren er, hvor længe der kan gå, før en betaling,
-- der ALLEREDE er sket, står skrevet i vores egen database — og dét er et helt
-- andet tal: **Stripe prøver en webhook igen i op til tre døgn.** Er endepunktet
-- nede, en hemmelighed skiftet eller en udrulning gået galt hen over en
-- weekend, står ordren som `new`, længe efter at pengene er hjemme. `new`
-- betyder "oprettet, aldrig betalt" — men i det vindue betyder det i
-- virkeligheden "betalt, ikke registreret endnu", og de to kan ikke skelnes
-- fra databasen alene.
--
-- USYMMETRIEN AFGØR TALLET. Rydder vi for sent, ligger der en kladde en uge
-- længere; det koster ingenting. Rydder vi for tidligt, mister en betalende
-- kunde sit logo for altid. Nådeperioden skal derfor ligge KOMFORTABELT over
-- Stripes forsøgsvindue og ikke lige på det: **7 døgn.**
--
-- ANDET LED: `stripe_payment_intent`. Statussen kan sættes i hånden i admin, og
-- en ordre, der bliver sat tilbage til `new`, ville ellers blive forladt igen.
-- Betalingens id skrives af webhooken i SAMME opdatering som statussen og er et
-- aftryk af, at der faktisk er flyttet penge. Har ordren et, er designet aldrig
-- forladt — uanset hvad der står i statusfeltet.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

create or replace function public.ryd_forladte_designs(p_toerloeb boolean default true)
returns jsonb
language plpgsql
as $$
declare
  -- SKAL LIGGE OVER STRIPES FORSØGSVINDUE PÅ TRE DØGN — ikke over checkout-
  -- sessionens levetid på ét. Se hovedet i 0037 for hvad et døgn kostede.
  naadeperiode constant interval := '7 days';

  forladte uuid[];
  logoer text[];
  n int := 0;
begin
  select
    coalesce(array_agg(d.id), '{}'::uuid[]),
    coalesce(array_agg(d.logo_url) filter (where d.logo_url is not null), '{}'::text[])
    into forladte, logoer
    from public.designs d
   where d.created_at < now() - naadeperiode
     and not exists (
       select 1
         from public.orders o
        where o.design_id = d.id
          -- To spor af en betaling, og ét er nok. Statussen er det normale;
          -- betalings-id'et fanger den ordre, hvis status er sat tilbage i
          -- hånden.
          and (o.status <> 'new' or o.stripe_payment_intent is not null)
     );

  n := coalesce(array_length(forladte, 1), 0);

  if not p_toerloeb and n > 0 then
    -- Ordrerne beholder deres række; design_id nulstilles af fremmednøglens
    -- `on delete set null`.
    delete from public.designs where id = any(forladte);
  end if;

  return jsonb_build_object(
    'toerloeb', p_toerloeb,
    'forladte', n,
    -- Adresserne med, så ruten kan fjerne filerne bagefter. De ligger i en
    -- offentlig lagerbøtte og er ikke personoplysninger.
    'logoer', to_jsonb(logoer)
  );
end;
$$;
