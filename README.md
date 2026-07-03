# ReviewStand.dk

SaaS-platform hvor en fysisk NFC-/QR-stander indsamler anmeldelser, privat
feedback og kundedata. Dette er **Sprint 1 (MVP)**.

## Teknologi

- Next.js 16 (App Router) · TypeScript · Tailwind CSS v4
- Supabase (Postgres, Auth, Storage) med Row Level Security
- `qrcode` til QR-generering
- Klar til Vercel-deployment
- Forberedt til Sprint 2: Stripe (betaling) og Resend (e-mail)

## Kom i gang

### 1. Opret et Supabase-projekt

På [supabase.com](https://supabase.com) → nyt projekt. Find derefter:

- Project URL og `anon` key under **Project Settings → API**
- `service_role` key samme sted (hemmelig — kun server)

### 2. Miljøvariabler

Kopiér `.env.local.example` til `.env.local` og udfyld:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Kør database-migrationerne

Åbn **SQL Editor** i Supabase og kør i rækkefølge:

1. `supabase/migrations/0001_init.sql` — tabeller, enums, RLS, triggers
2. `supabase/migrations/0002_storage.sql` — `logos` storage-bucket

Trigger `on_auth_user_created` opretter automatisk en `public.users`-række med
rollen `customer`, når nogen registrerer sig.

### 4. Gør en bruger til admin

Registrér en konto via `/signup`, og kør derefter i SQL Editor:

```sql
update public.users set role = 'admin' where email = 'dig@eksempel.dk';
```

### 5. Start udviklingsserveren

```bash
npm install
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000).

## Struktur

```
src/
  app/
    (auth)/            Login, signup, auth-actions
    dashboard/         Kunde: oversigt, standere, feedback, profil
    admin/             Admin: oversigt, virksomheder, ordrer, feedback
    r/[slug]/          Offentligt review-flow (scan + rating + feedback)
    bestil/            Webshop-oversigt (Stripe-checkout kommer i Sprint 2)
  components/          UI-bibliotek + delte komponenter
  lib/
    supabase/          Browser-, server-, admin- og proxy-klienter
    types/database.ts  Typede tabeldefinitioner (spejler migrationen)
  proxy.ts             Auth-session-refresh + route-beskyttelse
supabase/migrations/   SQL-schema
```

## Review-flow

`/r/[slug]` registrerer et scan, viser virksomhedens logo/navn og beder om
1–5 stjerner:

- **4–5 stjerner:** primær knap → offentlig anmeldelse, sekundær → privat feedback
- **1–3 stjerner:** primær knap → privat feedback, sekundær → offentlig anmeldelse

Negative kunder blokeres aldrig fra at skrive en offentlig anmeldelse.

## Roller

- **Admin:** ser alle virksomheder, ordrer, standere, feedback; opretter/redigerer
  virksomheder; ændrer kundens links; markerer ordrestatus.
- **Kunde:** ser egen virksomhed, uploader logo, sætter review-links, ser
  scanninger/klik/feedback og ændrer stander-destination.

## Næste sprint

Stripe-checkout på `/bestil`, ordre-oprettelse via webhook, og Resend-mail
("Færdiggør din stander" → onboarding). Datamodellen (`orders`,
`subscriptions`) er allerede på plads.
