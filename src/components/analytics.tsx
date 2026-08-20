"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Script from "next/script";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import {
  CONSENT_KEY,
  CONSENT_ID_KEY,
  CONSENT_VERSION,
  CONSENT_CATEGORIES,
  parseConsent,
  serializeConsent,
  shouldAskForConsent,
  hasSomethingToAskAbout,
  mayLoadStatistics,
  mayLoadMarketing,
  type Consent,
  type ConsentCategory,
} from "@/lib/consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const IDS = { ga: GA_ID, ads: ADS_ID };

/** Besked om at valget er ændret i DENNE fane. */
const AENDRET = "loyalsum:samtykke";

/**
 * Serveren kan ikke se localStorage. Havde den svaret "intet valgt", ville
 * banneret blive tegnet på serveren og først forsvinde efter hydrering — altså
 * blinke frem hos alle, også dem der for længst har taget stilling.
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

/**
 * Et tilfældigt id for denne browser, så en senere ændring kan ses som samme
 * besøgende og ikke som en ny. Det siger intet om, hvem personen er.
 */
function samtykkeId(): string {
  const gemt = window.localStorage.getItem(CONSENT_ID_KEY);
  if (gemt) return gemt;
  const nyt = crypto.randomUUID();
  window.localStorage.setItem(CONSENT_ID_KEY, nyt);
  return nyt;
}

function gem(valg: Pick<Consent, "statistics" | "marketing">): void {
  const raw = serializeConsent(valg);
  window.localStorage.setItem(CONSENT_KEY, raw);
  window.dispatchEvent(new Event(AENDRET));

  // Valget skal også registreres hos os: GDPR kræver, at et samtykke kan
  // PÅVISES, og en post i den besøgendes egen browser er ikke bevis, vi råder
  // over. Kaldet er bevidst uden await — valget gælder med det samme, uanset om
  // loggen svarer, og en fejl her må aldrig stå i vejen for brugeren.
  const decidedAt = JSON.parse(raw).decidedAt as string;
  void fetch("/api/samtykke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      consentId: samtykkeId(),
      version: CONSENT_VERSION,
      statistics: valg.statistics,
      marketing: valg.marketing,
      decidedAt,
      // Kun stien — aldrig hele URL'en, som kan indeholde parametre.
      path: window.location.pathname,
    }),
  }).catch(() => {
    // Netværksfejl er uinteressant for den besøgende. Serverens egen log
    // fanger de fejl, vi kan gøre noget ved.
  });
}

/**
 * Statistik, annoncering og samtykke.
 *
 * Vercel Analytics kører altid: cookiefri, sætter intet på enheden. Google
 * Analytics og Google Ads rendres slet ikke, før den enkelte kategori er sagt
 * ja til — så der sendes ingenting til Google i mellemtiden.
 */
export function Analytics() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const kendt = raw !== UKENDT;
  const consent = kendt ? parseConsent(raw) : null;

  const statistik = kendt && mayLoadStatistics(GA_ID, consent);
  const marketing = kendt && mayLoadMarketing(ADS_ID, consent);

  // Begge tjenester bruger gtag.js, så biblioteket hentes kun én gang.
  const gtagId = statistik ? GA_ID : marketing ? ADS_ID : null;

  // Konfigurationen sker HER og ikke i et inline-script. next/script genbruger
  // et allerede indsat script med samme id, så en kunde, der først siger ja til
  // statistik og bagefter tilføjer marketing, ville aldrig få Ads konfigureret
  // uden at genindlæse siden. Set i browseren, inden det blev lavet om.
  //
  // gtag() må gerne kaldes, før biblioteket er hentet: kaldene lægges i
  // dataLayer og bliver afviklet, når det lander.
  const konfigureret = useRef<Set<string>>(new Set());
  useEffect(() => {
    const w = window as typeof window & {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };
    if (!statistik && !marketing) return;

    if (!w.gtag) {
      w.dataLayer = w.dataLayer ?? [];
      w.gtag = function gtag(...args: unknown[]) {
        w.dataLayer!.push(args);
      };
      w.gtag("js", new Date());
    }

    for (const id of [statistik ? GA_ID : null, marketing ? ADS_ID : null]) {
      if (id && !konfigureret.current.has(id)) {
        w.gtag("config", id);
        konfigureret.current.add(id);
      }
    }
  }, [statistik, marketing]);

  return (
    <>
      <VercelAnalytics />

      {gtagId ? (
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
          strategy="afterInteractive"
        />
      ) : null}

      {kendt && shouldAskForConsent(IDS, consent) ? <ConsentDialog /> : null}
    </>
  );
}

function ConsentDialog() {
  // Kun kategorier, der faktisk er sat op, kan vælges. Ellers ville folk sige
  // ja til noget, der ikke findes.
  const tilgaengelige = CONSENT_CATEGORIES.filter((c) =>
    c.key === "statistics" ? Boolean(GA_ID) : Boolean(ADS_ID),
  );

  const [valgt, setValgt] = useState<Record<ConsentCategory, boolean>>({
    statistics: false,
    marketing: false,
  });

  const alle = () => gem({ statistics: Boolean(GA_ID), marketing: Boolean(ADS_ID) });
  const ingen = () => gem({ statistics: false, marketing: false });
  const valgte = () =>
    gem({
      statistics: Boolean(GA_ID) && valgt.statistics,
      marketing: Boolean(ADS_ID) && valgt.marketing,
    });

  return (
    // Dialogen er højere end en lille telefonskærm. Uden en grænse og en
    // rullebar midte blev toppen klippet af, og på en lav skærm kunne "Afvis"
    // havne uden for rækkevidde — man kunne ikke sige nej.
    //
    // dvh og ikke vh: på mobil skifter den synlige højde, når browserlinjen
    // glider væk, og vh regner med den STØRSTE højde. Med vh ville bunden
    // stikke ud under adresselinjen, netop hvor knapperne sidder.
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-dark/40 p-3 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="samtykke-titel"
        className="box-shape flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden border border-border bg-background shadow-xl sm:max-h-[calc(100dvh-2rem)]"
      >
        <div className="flex shrink-0 items-center justify-between bg-dark px-5 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/loyalsum-logo.png"
            alt="LoyalSum"
            width={1450}
            height={340}
            className="h-7 w-auto"
          />
          <span className="text-xs text-white/60">Cookies</span>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <h2 id="samtykke-titel" className="font-bold tracking-tight">
              Vi bruger cookies
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Vi bruger visse nødvendige cookies til at levere vores tjenester.
              Læs mere i vores{" "}
              <a href="/privatliv" className="font-medium text-accent underline">
                privatlivspolitik
              </a>
              .
            </p>
          </div>

          <ul className="divide-y divide-border border-y border-border">
            <li className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium">Nødvendige</p>
                <p className="text-xs leading-relaxed text-muted">
                  Kan ikke fravælges.
                </p>
              </div>
              <span className="shrink-0 pt-0.5 text-xs font-medium text-muted">
                Altid til
              </span>
            </li>

            {tilgaengelige.map((c) => (
              <li key={c.key} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs leading-relaxed text-muted">
                    {c.description}
                  </p>
                </div>
                <label className="relative inline-flex shrink-0 cursor-pointer items-center pt-0.5">
                  <span className="sr-only">{c.label}</span>
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={valgt[c.key]}
                    onChange={(e) =>
                      setValgt((v) => ({ ...v, [c.key]: e.target.checked }))
                    }
                  />
                  <span className="h-6 w-11 rounded-full bg-border transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2" />
                  <span className="pointer-events-none absolute left-1 top-1.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                </label>
              </li>
            ))}
          </ul>

        </div>

        {/* Knapperne står uden for det rullende felt, så de altid kan nås. */}
        <div className="shrink-0 border-t border-border p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={ingen}
              className="btn-shape h-10 flex-1 border border-border px-4 text-sm font-medium hover:bg-muted-bg"
            >
              Afvis
            </button>
            <button
              type="button"
              onClick={valgte}
              className="btn-shape h-10 flex-1 border border-border px-4 text-sm font-medium hover:bg-muted-bg"
            >
              Tillad valgte
            </button>
            <button
              type="button"
              onClick={alle}
              className="btn-shape h-10 flex-1 bg-accent px-4 text-sm font-medium text-accent-fg hover:bg-accent-hover"
            >
              Tillad alle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Lader en besøgende ombestemme sig. Et samtykke skal kunne trækkes tilbage
 * lige så let, som det blev givet.
 *
 * Id'erne er NEXT_PUBLIC-variabler og kendes derfor både på server og klient —
 * så det kan afgøres direkte i render uden risiko for hydreringsfejl.
 */
export function ConsentSettingsLink() {
  if (!hasSomethingToAskAbout(IDS)) return null;

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
