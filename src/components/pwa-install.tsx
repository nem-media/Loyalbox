"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  INSTALL_GLOBAL,
  INSTALL_HAENDELSE,
  INSTALLERET_GLOBAL,
} from "@/components/pwa-fang";
import Image from "next/image";

/**
 * "Læg kortet på din telefon" — stempelkortet på hjemmeskærmen.
 *
 * DER ER ALTID EN KNAP. Før viste komponenten en rigtig knap i Chrome og ren
 * vejledningstekst i Safari — altså intet at trykke på for enhver iPhone, og
 * det er præcis dér, kunderne er. Nu er der ét fast element i bunden af kortet:
 * en knap, der enten installerer med browserens egen dialog eller folder de
 * to skridt ud, browseren ikke vil gøre for os.
 *
 * TEKSTEN SIGER IKKE "DOWNLOAD". Der er ingen app i App Store eller Google
 * Play, og et ord som "download" ville sende kunden hen for at lede efter en.
 * "Læg kortet på din telefon" beskriver præcis det, der sker: sitet lægges på
 * hjemmeskærmen med sit eget ikon.
 *
 * Tre tilstande, fordi browserne kan noget forskelligt:
 *   - Allerede lagt på (kører i standalone) → intet vises; kortet ER appen.
 *   - Chrome/Edge (Android + desktop) → browserens egen installationsdialog
 *     via `beforeinstallprompt`.
 *   - iOS og alt andet → ingen API findes; knappen folder skridtene ud.
 *
 * VEJLEDNINGEN MÅ IKKE NÆVNE ÉN BROWSER. På iOS er ALLE browsere WebKit, og
 * ingen af dem fyrer `beforeinstallprompt` — så hver eneste iPhone-kunde ser
 * skridtene her, uanset om de bruger Safari, Chrome eller Firefox. Teksten
 * sagde "Del-ikonet nederst i Safari", og det er forkert på to måder for en
 * Chrome-bruger: den nævner en browser, de ikke er i, og knappen sidder ikke
 * dér. Meldt af brugeren 2026-09-17.
 *
 * DET FÆLLES ER IKONET OG MENUPUNKTET, ikke placeringen: alle tre går gennem
 * iOS' egen delingsflade, hvor punktet hedder det samme. Derfor beskrives
 * ikonet (firkanten med pilen op) frem for hvor det sidder — og placeringen
 * nævnes kun som den korte forskel, den er.
 */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribeDisplayMode(onChange: () => void) {
  const mql = window.matchMedia(STANDALONE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function isStandaloneSnapshot() {
  return (
    window.matchMedia(STANDALONE_QUERY).matches ||
    // iOS kender ikke display-mode og sætter sit eget flag i stedet. Det
    // gælder alle browsere dér, fordi de alle er WebKit.
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function subscribeNever() {
  return () => {};
}

function isIosSnapshot() {
  const ua = window.navigator.userAgent;
  // iPadOS melder sig som Mac, men har touch — derfor det ekstra tjek.
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (/macintosh/i.test(ua) && window.navigator.maxTouchPoints > 1)
  );
}

/**
 * INSTALLATIONSDIALOGEN ER EKSTERN TILSTAND — og skal derfor læses som det.
 *
 * Første udgave hentede den i en `useEffect` og lagde den i `useState`. Det
 * er ikke bare en lint-fejl (React Compiler afviser synkron `setState` i en
 * effekt, se AGENTS.md); det er også den forkerte model. Værdien ejes af
 * browseren, fanges af `PwaFang` under parsingen og ændrer sig uafhængigt af
 * React — præcis dét, `useSyncExternalStore` findes til, og præcis som
 * `display-mode` og platformen lige ovenfor.
 *
 * SNAPSHOTTET SKAL VÆRE STABILT: det returnerer selve eventet eller `null`,
 * altså den samme reference indtil den faktisk skifter. Byggede det et nyt
 * objekt hver gang, ville React gengive i en løkke.
 */
function subscribeInstall(onChange: () => void) {
  window.addEventListener(INSTALL_HAENDELSE, onChange);
  return () => window.removeEventListener(INSTALL_HAENDELSE, onChange);
}

function installSnapshot(): InstallPromptEvent | null {
  return (
    (window as unknown as Record<string, InstallPromptEvent | null>)[
      INSTALL_GLOBAL
    ] ?? null
  );
}

function installeretSnapshot() {
  return (
    (window as unknown as Record<string, boolean | undefined>)[
      INSTALLERET_GLOBAL
    ] === true
  );
}

// Server-snapshots: på serveren er intet installeret og ingen platform kendt.
// Så matcher første klient-render serverens HTML, og hydreringen er ren.
const falseSnapshot = () => false;
const nullSnapshot = () => null;

export function PwaInstall({
  className,
  /** "kortet" på ét kort, "kortene" på /mine-kort. */
  hvad = "kortet",
}: {
  className?: string;
  hvad?: string;
}) {
  const isStandalone = useSyncExternalStore(
    subscribeDisplayMode,
    isStandaloneSnapshot,
    falseSnapshot,
  );
  const isIos = useSyncExternalStore(
    subscribeNever,
    isIosSnapshot,
    falseSnapshot,
  );

  const installEvent = useSyncExternalStore(
    subscribeInstall,
    installSnapshot,
    nullSnapshot,
  );
  const installed = useSyncExternalStore(
    subscribeInstall,
    installeretSnapshot,
    falseSnapshot,
  );
  const [visTrin, setVisTrin] = useState(false);

  // Kører kunden allerede kortet fra hjemmeskærmen, er der intet at tilbyde.
  if (isStandalone || installed) return null;

  return (
    /*
      KORTET SER UD SOM RESTEN AF HUSET.
      Her stod `bg-accent/5` med en `accent/30`-kant — 5 % teal, som var nok
      på den gamle varme creme, men som på den kølige grund bare ER grå. Det
      er den fælde, AGENTS.md beskriver ved `.app-flade`. Et fremhævet kort
      er `bg-card` + `border-accent/25` + `.teal-skaer`, og tinten er blandet
      ét sted, så den er den samme farve uanset hvad der ligger under.

      OG DET VISER RESULTATET. Ikonet til venstre er den FAKTISKE fil, der
      lander på hjemmeskærmen (`/icon-192.png`) — ikke et symbol for den.
      Kunden kan altså se, hvad hun får, før hun trykker; det er samme
      tanke som previewet i standerdesigneren. Afrundingen er OS'ets egen
      form, så feltet ligner en hjemmeskærm og ikke et billede på et kort.
    */
    <div
      className={`box-shape teal-skaer flex items-start gap-4 border border-accent/25 bg-card p-5 text-left ${className ?? ""}`}
    >
      <span
        aria-hidden="true"
        className="shrink-0 overflow-hidden rounded-[22%] shadow-[var(--hoejde-2)]"
      >
        <Image
          src="/icon-192.png"
          alt=""
          width={56}
          height={56}
          className="block h-14 w-14"
        />
      </span>

      <div className="min-w-0 flex-1">
      <p className="font-bold tracking-tight">Hav {hvad} på telefonen</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Læg {hvad} på hjemmeskærmen, så er stemplerne ét tryk væk — også uden at
        finde linket frem igen.
      </p>

      <Button
        className="mt-4 w-full sm:w-auto"
        onClick={() => {
          // Har browseren givet os sin egen dialog, er den altid bedre end en
          // vejledning: ét tryk, og ikonet ligger der.
          if (!installEvent) {
            setVisTrin((v) => !v);
            return;
          }
          void installEvent.prompt();
          /* EN DIALOG KAN KUN ÅBNES ÉN GANG. Bruges den samme igen, kaster
             browseren — så globalen ryddes, og beskeden får komponenten til
             at læse den igen. Knappen falder dermed tilbage til skridtene,
             indtil browseren tilbyder en ny dialog. */
          (window as unknown as Record<string, unknown>)[INSTALL_GLOBAL] = null;
          window.dispatchEvent(new Event(INSTALL_HAENDELSE));
        }}
        aria-expanded={installEvent ? undefined : visTrin}
      >
        Læg {hvad} på min telefon
      </Button>

      {!installEvent && visTrin ? (
        <div className="mt-4 border-t border-border pt-4 text-left text-sm text-muted">
          {isIos ? (
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                Tryk på <span className="font-medium">Del</span> (firkanten med
                pilen op) — nederst i Safari, i &#8943;-menuen i Chrome og
                Firefox.
              </li>
              <li>
                Vælg{" "}
                <span className="font-medium">&laquo;Føj til hjemmeskærm&raquo;</span>{" "}
                og tryk <span className="font-medium">Tilføj</span>.
              </li>
            </ol>
          ) : (
            <ol className="list-decimal space-y-1 pl-5">
              <li>Åbn browserens menu (de tre prikker).</li>
              <li>
                Vælg{" "}
                <span className="font-medium">
                  &laquo;Føj til startskærm&raquo;
                </span>{" "}
                eller <span className="font-medium">&laquo;Installér&raquo;</span>
                .
              </li>
              <li>Bekræft — så ligger {hvad} sammen med dine apps.</li>
            </ol>
          )}
          <p className="mt-3 text-xs">
            Der er ingen app at hente i App Store eller Google Play. Ikonet åbner
            den samme side, du står på nu.
          </p>
        </div>
      ) : null}
      </div>
    </div>
  );
}
