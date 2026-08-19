"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import {
  CONSENT_KEY,
  parseConsent,
  serializeConsent,
  shouldAskForConsent,
  mayLoadAnalytics,
} from "@/lib/consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/** Besked om at valget er ændret i DENNE fane. */
const AENDRET = "loyalsum:samtykke";

/**
 * Serveren kan ikke se localStorage. Havde vi ladet den svare "intet valgt",
 * ville banneret blive tegnet på serveren og først forsvinde efter hydrering
 * — altså blinke frem hos alle, også dem der for længst har taget stilling.
 * Derfor et selvstændigt "ved det ikke endnu".
 */
const UKENDT = "?";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(AENDRET, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(AENDRET, onChange);
  };
}

// Skal returnere en STABIL værdi mellem kald — derfor den rå streng og ikke et
// nyt objekt, som React ville se som en ændring hver eneste gang.
function getSnapshot(): string {
  return window.localStorage.getItem(CONSENT_KEY) ?? "";
}

function getServerSnapshot(): string {
  return UKENDT;
}

function vaelg(analytics: boolean): void {
  window.localStorage.setItem(CONSENT_KEY, serializeConsent(analytics));
  window.dispatchEvent(new Event(AENDRET));
}

/**
 * Statistik og samtykke.
 *
 * Vercel Analytics kører altid: den er cookiefri og sætter intet på enheden.
 * Google Analytics rendres slet ikke, før der er sagt ja — så der sendes
 * ingenting til Google i mellemtiden. Det er derfor vi ikke bruger Consent
 * Mode: dér ville scriptet køre først og spørge bagefter.
 */
export function Analytics() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const kendt = raw !== UKENDT;
  const consent = kendt ? parseConsent(raw) : null;

  return (
    <>
      <VercelAnalytics />

      {kendt && mayLoadAnalytics(GA_ID, consent) ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});`}
          </Script>
        </>
      ) : null}

      {kendt && shouldAskForConsent(GA_ID, consent) ? <ConsentBanner /> : null}
    </>
  );
}

function ConsentBanner() {
  return (
    <div
      role="dialog"
      aria-label="Samtykke til statistik"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed">
          Vi tæller besøg uden cookies. Må vi også bruge Google Analytics? Det
          sætter cookies og hjælper os med at se, hvilke annoncer der virker.{" "}
          <a href="/privatliv" className="font-medium text-accent underline">
            Læs mere
          </a>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => vaelg(false)}
            className="btn-shape h-10 border border-border px-4 text-sm font-medium hover:bg-muted-bg"
          >
            Nej tak
          </button>
          <button
            type="button"
            onClick={() => vaelg(true)}
            className="btn-shape h-10 bg-accent px-4 text-sm font-medium text-accent-fg hover:bg-accent-hover"
          >
            Ja tak
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Lader en besøgende ombestemme sig. Et samtykke skal kunne trækkes tilbage
 * lige så let, som det blev givet.
 *
 * GA_ID er en NEXT_PUBLIC-variabel og kendes derfor både på server og klient —
 * så den kan afgøres direkte i render uden risiko for hydreringsfejl.
 */
export function ConsentSettingsLink() {
  if (!GA_ID) return null;

  return (
    <button
      type="button"
      className="hover:text-accent"
      onClick={() => {
        window.localStorage.removeItem(CONSENT_KEY);
        window.dispatchEvent(new Event(AENDRET));
      }}
    >
      Cookieindstillinger
    </button>
  );
}
