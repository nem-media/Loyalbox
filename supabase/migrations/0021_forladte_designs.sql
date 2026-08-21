-- ---------------------------------------------------------------------------
-- 0021 — Oprydning af forladte designs
--
-- HVORFOR: designet oprettes FØR betalingen, fordi prisen afhænger af valgene
-- og skal stå på fakturaen. Går kunden fra checkout, bliver designet liggende
-- — med en logofil i lageret, som ingen nogensinde skal bruge.
--
-- Efter få uger roder de i kundens designliste og i lageret. En kunde, der
-- fortrød tre gange, ville se fire designs og ikke vide hvilket der gjaldt.
--
-- HVAD DER TÆLLER SOM FORLADT: et design, der er ældre end nådeperioden, og
-- som INGEN ordre henviser til med en anden status end 'new'. Status 'new'
-- betyder "oprettet, aldrig betalt" — webhooken flytter den til
-- needs_onboarding, når pengene er hjemme.
--
-- ORDREN BEVARES. Kun designet og dets logofil ryddes. Den ubetalte ordre er
-- det eneste spor af, at nogen begyndte og ikke blev færdig, og det er dét
-- tal, admin-oversigten viser.
--
-- BEMÆRK AT DETTE IKKE ER EN OPBEVARINGSFRIST. Der slettes ingen
-- personoplysninger: et logo og et farvevalg tilhører virksomheden, ikke en
-- person. Konstanten hedder derfor bevidst ikke `frist_` — den regime, som
-- opbevaring.test.ts håndhæver, dækker det kunderne får at vide i
-- privatlivspolitikken, og en halvfærdig kladde hører ikke hjemme dér.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

create or replace function public.ryd_forladte_designs(p_toerloeb boolean default true)
returns jsonb
language plpgsql
as $$
declare
  -- Rundeligt sat. Stripes checkout-session udløber selv efter et døgn, så et
  -- design, der er ældre end det, kan ikke længere føre til en betaling.
  naadeperiode constant interval := '24 hours';

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
          and o.status <> 'new'
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
