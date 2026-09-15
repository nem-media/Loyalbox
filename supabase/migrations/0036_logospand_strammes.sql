-- LOGOSPANDEN VAR ET ÅBENT FILDEPOT.
--
-- FUNDET VED EN GENNEMGANG 2026-09-15 OG BEVIST UDNYTTELIGT: logget ind som
-- `kunde@loyalbox.test` — en SLUTKUNDE med et stempelkort, uden virksomhed,
-- uden køb — kunne en vilkårlig fil lægges i spanden og hentes offentligt:
--
--     POST /storage/v1/object/logos/hvadsomhelst/vilkaarlig.txt   ->  200
--     GET  /storage/v1/object/public/logos/hvadsomhelst/...       ->  indholdet
--
-- TRE TING GJORDE DET MULIGT PÅ ÉN GANG:
--
--  1. Politikken sagde kun `bucket_id = 'logos'` for enhver `authenticated`.
--     Ingen sti, ingen ejer, ingen filtype.
--  2. Spanden havde hverken `file_size_limit` eller `allowed_mime_types`.
--  3. `validerLogo()` — som kender de 5 MB og de to tilladte typer — kaldes
--     fra en KLIENTkomponent. Browseren kan springes over; storage-API'et kan
--     kaldes direkte med et almindeligt login.
--
-- Den offentlige bestilling uden konto var IKKE ramt: den validerer på
-- serveren og uploader med service-role (se `bestilUdenKonto`).
--
-- KONSEKVENSEN var ikke en datalækage — logoer er offentlige med vilje — men
-- gratis filhosting på projektets eget domæne, uden loft og uden filtype.
--
-- TO LAG, OG BEGGE ER NØDVENDIGE. Spandens egne grænser gælder uanset
-- politik, og politikken gælder uanset hvad browseren sender. Hverken det ene
-- eller det andet er nok alene.
--
-- Køres MANUELT i Supabase → SQL Editor. Idempotent.

-- ---------------------------------------------------------------- lag 1: spanden
-- 5 MB og de to typer er PRÆCIS dem, `LOGO_KRAV` i src/lib/logo.ts kender.
-- Ændres tallene dér, skal de ændres her — ellers afviser de to led forskelligt,
-- og kunden får en fejl, formularen ikke kunne forudse.
update storage.buckets
   set file_size_limit    = 5242880,                            -- 5 MB
       allowed_mime_types = array['image/png', 'image/svg+xml']
 where id = 'logos';

-- ---------------------------------------------------------------- lag 2: politikken
-- Begge indloggede uploadveje skriver til `<virksomheds-id>/fil`
-- (`stander-designer.tsx` og `profil/profile-form.tsx`). Første mappeled skal
-- derfor være en virksomhed, brugeren FAKTISK ejer.
--
-- `uden-konto/` mangler med vilje: den sti skrives kun af service-role, som
-- går uden om RLS, og den må ikke kunne rammes af et almindeligt login.

drop policy if exists "logos auth write" on storage.objects;
create policy "logos auth write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] in (
      select c.id::text from public.companies c where c.user_id = auth.uid()
    )
  );

-- Profilens logo uploades med `upsert: true` og kræver derfor også update.
drop policy if exists "logos auth update" on storage.objects;
create policy "logos auth update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] in (
      select c.id::text from public.companies c where c.user_id = auth.uid()
    )
  );

-- Sletning hører til samme mappe. En butik må rydde op i sit eget og intet andet.
drop policy if exists "logos auth delete" on storage.objects;
create policy "logos auth delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] in (
      select c.id::text from public.companies c where c.user_id = auth.uid()
    )
  );

-- Offentlig LÆSNING er uændret og skal være det: logoet står på kundens kort
-- og på den offentlige anmeldelsesside.
drop policy if exists "logos public read" on storage.objects;
create policy "logos public read" on storage.objects
  for select using (bucket_id = 'logos');
