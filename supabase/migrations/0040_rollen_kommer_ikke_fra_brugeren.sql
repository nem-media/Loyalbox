-- ---------------------------------------------------------------------------
-- 0040 — ENHVER KUNNE OPRETTE SIG SOM ADMIN
--
-- ALVORLIGSTE FUND I GENNEMGANGEN. `handle_new_user()` tog rollen fra den nye
-- brugers EGEN metadata:
--
--     coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'customer')
--
-- `raw_user_meta_data` er dét, klienten sender med i `options.data` ved en
-- oprettelse. Vores egen kode sender altid `{ role: "customer" }` — men
-- anon-nøglen ligger i browserens bundt og er offentlig med vilje, og
-- selvbetjent oprettelse er slået til. Enhver kunne derfor kalde
-- Supabases eget endpoint direkte:
--
--     POST /auth/v1/signup
--     { "email": "…", "password": "…", "data": { "role": "admin" } }
--
-- AFPRØVET 2026-09-15 MOD PRODUKTIONSPROJEKTET: brugeren blev oprettet, og
-- `public.users.role` stod bagefter på **admin**. Prøvebrugeren blev slettet
-- igen med det samme.
--
-- HVAD DET GAV: `getCurrentUser()` læser rollen i `public.users`, og det samme
-- gør `is_admin()`, som RLS-politikkerne på tværs af hele skemaet bygger på.
-- En sådan konto ville altså have haft admin-panelet, alle virksomheder, alle
-- ordrer, al feedback og hver eneste butiks kundeliste.
--
-- DER ER INGEN TEGN PÅ, AT DET ER SKET. Alle tre admin-konti er oprettet af os
-- selv i juli 2026, og ingen anden bruger har en rolle i sin metadata.
--
-- HVORFOR DET IKKE BLEV OPDAGET FØR: alt i lagene ovenover er rigtigt.
-- `users` kan kun SKRIVES af en admin (`users_admin_all`), der er ingen
-- selvbetjent rolleskifter, og hver eneste kaldesti i appen sender
-- `"customer"`. Hullet lå ét sted, hvor en værdi fra brugeren blev behandlet
-- som en oplysning fra systemet — og dét er netop det mønster, en trigger
-- gør usynligt, fordi den kører uden for al koden.
--
-- KUREN: rollen kommer ALDRIG fra brugeren. Den er `customer` for alle, og en
-- admin oprettes bevidst bagefter med service-role (`scripts/create-admin.mjs`
-- gør allerede præcis dét med en eksplicit `update`, og
-- `setup-test-users.mjs` ligeså — derfor knækker de ikke af denne ændring).
--
-- Kør manuelt i Supabase → SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (
    new.id,
    new.email,
    -- FAST 'customer'. Der stod før en coalesce over
    -- `new.raw_user_meta_data ->> 'role'`, altså en værdi, den nye bruger selv
    -- havde sendt. En rolle er en beslutning, systemet træffer — aldrig en
    -- oplysning, den, der oprettes, kommer med.
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Triggeren peger allerede på funktionen; den genskabes for en sikkerheds
-- skyld, så migrationen kan køres på et projekt, hvor den er faldet væk.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- OPRYDNING: metadataen er ikke længere farlig, men den er misvisende — en
-- fremtidig læser kunne tro, at den betyder noget. Feltet fjernes fra de
-- brugere, der har det, UNDTAGEN at rollen i `public.users` ikke røres: den er
-- sandheden og skal blive, hvor den er.
--
-- Der er bevidst ingen `update public.users set role = 'customer'` her. To af
-- de tre admin-konti er i brug, og en migration, der nedgraderede dem, ville
-- lukke os selv ude.
-- ---------------------------------------------------------------------------
update auth.users
   set raw_user_meta_data = raw_user_meta_data - 'role'
 where raw_user_meta_data ? 'role';
