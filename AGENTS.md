<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LoyalBox — projektkonventioner

- **Sprog:** produktet er dansk. Al UI-tekst, fejlbeskeder, blog og indhold skrives på dansk.
- **React Compiler er slået til.** Undgå manuel `useMemo`/`useCallback` — de udløser lint-fejl (`react-hooks/preserve-manual-memoization`), og compileren memoiserer selv. Beregn direkte i render. Synkron `setState` i en `useEffect` giver også lint-fejl; til klient-kun-detektion (fx `navigator.canShare`) brug `useSyncExternalStore` med et server-snapshot, ikke `useEffect`+`setState`.
- **Design-system:** tokens i `src/app/globals.css` — grøn `#1b916a` (accent), gul `#ffb700` (secondary), navy `#19375c` (dark), råhvid `#f6f4ee`. Signatur-form er `.box-shape`/`.btn-shape` (radius `0 6px 6px 6px` — skarpt øverste venstre hjørne). Skrifttype: Geist. Genbrug `src/components/ui/*` (Button/Badge/Card/Input/Stars).
- **Priser & produkter** redigeres ét sted: `src/lib/constants.ts`, blokken **"PRODUKTER & PRISER — REDIGÉR HER"**. 3 varer. `price` = pris pr. stander (ganges med antal 1–30 + `VOLUME_DISCOUNTS`-mængderabat); `monthlyPrice` = fast abonnement; `setupPrice` = fast opsætning (begge uafhængige af antal). Beregning i `priceFor()`.
- **DB-migrationer** (`supabase/migrations/*.sql`) køres MANUELT i Supabase → SQL Editor — der er ingen automatisk migrationskørsel i deploy. Gør dem idempotente (`add column if not exists` osv.). Verificér at en ny kolonne findes (service-role `select`-test), før kode der skriver til den, deployes.
- **Supabase:** ét projekt bruges til BÅDE lokal udvikling og produktion — lokal `npm run dev` skriver derfor i live-data. Env-nøglerne er markeret *Sensitive* i Vercel (kan ikke `vercel env pull`'es i klartekst; udfyld `.env.local` manuelt fra Supabase → Project Settings → API).
- **Etisk regel (håndhæves i koden):** belønninger/stempler/rabatter må ALDRIG betinges af en offentlig anmeldelse. Review- og loyalitets-flows holdes adskilt (se `REVIEW_INDEPENDENCE_NOTICE` i constants).
