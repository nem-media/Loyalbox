-- ---------------------------------------------------------------------------
-- 0043 — Standeren fra et afbrudt køb blev liggende
--
-- `/bestil/uden-konto` opretter virksomhed, design, STANDER og ordre FØR
-- betalingen, fordi prisen afhænger af valgene. Går kunden fra hos Stripe,
-- rydder `ryd_forladte_designs()` kladden og dens logofil — men standeren blev
-- stående med sit slug, sin destination og sit `is_active`. Hvert afbrudt
-- forsøg efterlod en.
--
-- DET ER IKKE PERSONOPLYSNINGER, og det er derfor det ikke står i
-- `opbevaring.ts`: en QR-adresse og et link til butikkens egen Google-side
-- tilhører virksomheden, ikke en person. Det er rod — men rod, der optager et
-- slug for evigt og gør enhver optælling af "hvor mange adresser findes der"
-- til noget andet end svaret på "hvor mange adresser bruges der".
--
-- FIRE VAGTER, OG DE ER ALLE FIRE NØDVENDIGE. Standeren er ikke som designet,
-- der kun kan komme ét sted fra:
--
--   1. DEN SKAL VÆRE KOMMET AF EN BESTILLING UDEN KONTO. Det er kun DÉR,
--      standeren oprettes af selve bestillingen, og altså kun dér, et afbrudt
--      forsøg efterlader en. En butik opretter også selv adresser i
--      dashboardet (`createStand`), og admin kan give en væk
--      (`createStandAdmin`) — sådan en har ingen ordre og må aldrig røres.
--   2. INGEN ANDEN SLAGS ORDRE MÅ PEGE PÅ DEN. Dette led er ikke pynt på det
--      første, og det var det, der manglede i første udkast: en INDLOGGET
--      butik, der bestiller flere skilte til en adresse, de allerede har
--      (`/bestil?stand=…`), og fortryder hos Stripe, efterlader en ubetalt
--      ordre på en adresse, de bruger hver dag. Med kun led 1 og 3 ville vi
--      have slettet den syv dage senere — deres egen QR-adresse, fordi de
--      fortrød et køb.
--   3. INGEN AF ORDRERNE MÅ VÆRE BETALT. Samme to spor som 0037: statussen er
--      det normale, og `stripe_payment_intent` fanger den ordre, hvis status
--      er sat tilbage i hånden i admin.
--   4. DER MÅ IKKE VÆRE SKET NOGET PÅ DEN. `scans` og `feedback` hænger på
--      standeren med `on delete cascade`, så en sletning ville tage dem med
--      UDEN at sige det. En stander med en scanning har været i brug, og så er
--      den ikke forladt, uanset hvad ordrerne siger.
--
-- ORDREN BEVARES. `orders.stand_id` er `on delete set null` (0022), fordi
-- ordren er et regnskabsbilag — samme grund som `design_id` i 0018.
--
-- NÅDEPERIODEN ER DEN SAMME SOM DESIGNETS og har samme undergrænse: den skal
-- dække Stripes forsøgsvindue for webhooks på TRE DØGN og ikke checkout-
-- sessionens levetid på ét. I det vindue betyder status `new` ikke "aldrig
-- betalt", men "betalt, ikke registreret endnu". Det var netop den forveksling,
-- der kostede en betalende kunde sit logo i 0037. Usymmetrien er den samme:
-- rydder vi for sent, ligger der en tom adresse en uge længere, og det koster
-- ingenting; rydder vi for tidligt, sletter vi QR-adressen på et skilt, der er
-- trykt og sendt.
--
-- ANDET LED I DENNE MIGRATION: `ryd_forladte_designs` FÅR SINE RETTIGHEDER.
-- Funktionen blev aldrig lukket, sådan som `ryd_op_efter_frister` blev det i
-- 0012, og en funktion er som udgangspunkt kørbar for `public`. MÅLT MOD
-- PRODUKTIONEN 2026-09-18 med den ANON-nøgle, der ligger i browserens bundt:
--
--   POST /rest/v1/rpc/ryd_forladte_designs  →  200 {"forladte": 0, ...}
--   POST /rest/v1/rpc/ryd_op_efter_frister  →  401 permission denied
--
-- Der skete ingen skade — funktionen kører som den, der kalder den, så RLS
-- gjorde SELECT'en tom, og nul rækker blev slettet. Men typefilen siger "Kun
-- service-role" om noget, der svarer enhver med den offentlige nøgle, og det
-- er præcis den slags påstand, der får den næste til at holde op med at kigge.
-- Én permissiv politik på `designs`, og en fremmed kunne kalde vores egen
-- oprydning. Alle kaldesteder i `src/` bruger admin-klienten, så der er intet
-- at miste ved at lukke den.
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

create or replace function public.ryd_forladte_standere(p_toerloeb boolean default true)
returns jsonb
language plpgsql
as $$
declare
  -- SKAL LIGGE OVER STRIPES FORSØGSVINDUE PÅ TRE DØGN. Se hovedet i 0037 for
  -- hvad et døgn kostede, dengang designet havde den forkerte begrundelse.
  naadeperiode constant interval := '7 days';

  forladte uuid[];
  n int := 0;
begin
  select coalesce(array_agg(s.id), '{}'::uuid[])
    into forladte
    from public.stands s
   where s.created_at < now() - naadeperiode
     -- (1) Kom den af en bestilling UDEN KONTO? Det er den eneste vej, hvor
     --     standeren oprettes af bestillingen selv. En adresse fra dashboardet
     --     har ingen ordre og rammes derfor aldrig.
     and exists (
       select 1
         from public.orders o
        where o.stand_id = s.id
          and o.uden_konto is true
     )
     -- (2) + (3) Er hver eneste ordre på den BÅDE ubetalt OG uden konto?
     --     Den sidste halvdel freder den indloggede butik, der bestiller
     --     flere skilte til en adresse, de allerede bruger, og fortryder.
     and not exists (
       select 1
         from public.orders o
        where o.stand_id = s.id
          and (
            o.status <> 'new'
            or o.stripe_payment_intent is not null
            or o.uden_konto is not true
          )
     )
     -- (4) Er der aldrig sket noget på den? Begge tabeller ville følge med i
     --     stilhed på en cascade.
     and not exists (
       select 1 from public.scans sc where sc.stand_id = s.id
     )
     and not exists (
       select 1 from public.feedback f where f.stand_id = s.id
     );

  n := coalesce(array_length(forladte, 1), 0);

  if not p_toerloeb and n > 0 then
    -- Ordrerne beholder deres række; stand_id nulstilles af fremmednøglens
    -- `on delete set null`.
    delete from public.stands where id = any(forladte);
  end if;

  return jsonb_build_object(
    'toerloeb', p_toerloeb,
    'forladte', n
  );
end;
$$;

-- --------------------------------------------------------------- rettigheder
-- Begge oprydninger er service-role-only, præcis som 0012's. Idempotent:
-- revoke på noget, der allerede er væk, er en no-op.

revoke all on function public.ryd_forladte_standere(boolean) from public;
revoke all on function public.ryd_forladte_standere(boolean) from anon, authenticated;
grant execute on function public.ryd_forladte_standere(boolean) to service_role;

revoke all on function public.ryd_forladte_designs(boolean) from public;
revoke all on function public.ryd_forladte_designs(boolean) from anon, authenticated;
grant execute on function public.ryd_forladte_designs(boolean) to service_role;

comment on function public.ryd_forladte_standere(boolean) is
  'Sletter QR-adresser fra afbrudte køb UDEN KONTO (0043). Kun standere, hvor '
  'hver ordre er både ubetalt og uden konto, og hvor der hverken er '
  'scanninger eller feedback. Kun service-role.';
