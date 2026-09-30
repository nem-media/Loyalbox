# Commerce: staging og udvikling mod en separat Supabase

**Produktionsbasen må aldrig bruges til plugin-udvikling eller WooCommerce-E2E.**
I dag deler lokal udvikling og produktion ét Supabase-projekt (se `AGENTS.md`).
Det duer ikke til webshopintegrationen: et testplugin, der sender ordrer, ville
give point til rigtige kunder og skrive i rigtige kunders ledger.

```
PRODUKTION        LoyalSum (Vercel Production)        → Supabase: produktion
STAGING / E2E     LoyalSum (Vercel Preview/staging)   → Supabase: staging (separat projekt)
LOKALT            npm test                            → PGlite (Postgres i WASM, i hukommelsen)
                  npm run dev (til E2E)               → Supabase: staging — aldrig produktion
```

## Ingen kodeændring — kun andre værdier

Koden læser Supabase-forbindelsen fra miljøet og har ingen projekt-id'er
skrevet ind (`staging-konfiguration.test.ts` holder fast i det). Staging bruger
**de samme variabelnavne** som produktion, med staging-projektets værdier.

| Variabel | Staging-værdi | Bemærkning |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | staging-projektets URL | også billedværten i `next.config.ts` udledes heraf |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | staging-projektets anon-nøgle | |
| `SUPABASE_SERVICE_ROLE_KEY` | staging-projektets service-role-nøgle | markér *Sensitive* |
| `LOYALSUM_COMMERCE_ENCRYPTION_KEY` | en **egen** nøgle til staging | 32 tilfældige bytes i base64 — aldrig produktionens |
| `LOYALSUM_COMMERCE_ENCRYPTION_KEY_ID` | udelades (`k1`) | kun ved rotation |
| `NEXT_PUBLIC_SITE_URL` | staging-adressen | bekræftelsesmails til kunder linker hertil |
| `STRIPE_SECRET_KEY` | en **test**nøgle (`sk_test_…`) | aldrig live på staging |
| `STRIPE_WEBHOOK_SECRET` | staging-endpointets hemmelighed | eller udelad, hvis staging ikke skal have betalinger |
| `RESEND_API_KEY` | udelad, eller en nøgle til testadresser | sat, sendes der RIGTIGE mails |
| `CRON_SECRET` | valgfri | Vercel Cron kører kun på Production-deployments |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID` | udelad | |

Nøglen laves fx med `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
Den må aldrig stå i repoet, i en sag eller i en chat.

**Vercel:** Preview-variabler deles af ALLE preview-deployments. Brug
branch-specifikke Preview-variabler (fx for en `staging`-branch) eller et
separat Vercel-projekt til staging, så en tilfældig preview ikke rammer
staging-basen — og så ingen preview nogensinde får produktionens nøgler.

## Sæt staging op

1. **Opret et nyt Supabase-projekt** til staging i samme region som produktion
   (`eu-west-1`, se `vercel.json`/`dub1`). Ingen data kopieres fra produktion.
2. **Konfigurér miljøet** i Vercel som i tabellen ovenfor, og i en lokal
   `.env.local`, hvis der skal udvikles mod staging. En `.env.local` med
   produktionens værdier må ikke bruges til commerce-arbejde.
3. **Kør migrationerne 0001 → 0049 i rækkefølge** i staging-projektets
   SQL Editor. De er idempotente. `auth`, `storage` og rollerne `anon`,
   `authenticated` og `service_role` findes i et Supabase-projekt i forvejen.
4. **Efterprøv migrationen** med service-role-nøglen, fx:
   - tabellerne findes: `select count(*) from commerce_integrations;`
   - funktionerne findes og er lukket: et kald til
     `POST /rest/v1/rpc/commerce_oprydning` med **anon**-nøglen skal svare
     401/403, med service-role 200;
   - `select public.point_brugbar_saldo(gen_random_uuid(), gen_random_uuid());`
     svarer `{"saldo": 0, "reserveret": 0, "brugbar": 0}`.
   Samme kæde køres i PGlite af `npm test` (`src/test-db/`), så en fejl i
   selve SQL'en er fanget, før den når staging.
5. **Opret testdata** i staging: en virksomhed med LoyalSum Komplet, et
   pointprogram og/eller et stempelkort, og slå dem til under
   *Integrationer → Programmer i webshoppen*.
6. **WooCommerce-E2E** kører mod staging-adressen
   (`https://<staging>/api/v1/commerce/`): hent en parringskode i
   staging-dashboardet, par pluginet, send ordrer.
7. **Produktion** får migration 0049 først, når staging-E2E er gennemført, og
   aldrig som en del af plugin-udviklingen.

## Hvad der IKKE skal gøres

- Pege et testplugin mod `loyalsum.dk`.
- Kopiere produktionens `SUPABASE_SERVICE_ROLE_KEY` eller
  `LOYALSUM_COMMERCE_ENCRYPTION_KEY` til staging (eller omvendt): en
  integrationsnøgle krypteret med den ene kan ikke læses med den anden, og
  sådan skal det være.
