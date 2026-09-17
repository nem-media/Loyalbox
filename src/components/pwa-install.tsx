"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

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

// Server-snapshots: på serveren er intet installeret og ingen platform kendt.
// Så matcher første klient-render serverens HTML, og hydreringen er ren.
const falseSnapshot = () => false;

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

  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);
  const [visTrin, setVisTrin] = useState(false);

  useEffect(() => {
    // Browseren fyrer eventet, når siden opfylder installationskravene. Vi
    // gemmer det, så kunden kan installere på sit eget tidspunkt via knappen.
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Kører kunden allerede kortet fra hjemmeskærmen, er der intet at tilbyde.
  if (isStandalone || installed) return null;

  return (
    <div
      className={`box-shape border border-accent/30 bg-accent/5 p-5 text-center ${className ?? ""}`}
    >
      <p className="font-bold tracking-tight">Hav {hvad} på telefonen</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
        Læg {hvad} på hjemmeskærmen, så er stemplerne ét tryk væk — også uden at
        finde linket frem igen.
      </p>

      <Button
        className="mt-4 w-full sm:w-auto"
        onClick={() => {
          // Har browseren givet os sin egen dialog, er den altid bedre end en
          // vejledning: ét tryk, og ikonet ligger der.
          if (installEvent) void installEvent.prompt();
          else setVisTrin((v) => !v);
        }}
        aria-expanded={installEvent ? undefined : visTrin}
      >
        Læg {hvad} på min telefon
      </Button>

      {!installEvent && visTrin ? (
        <div className="mt-4 border-t border-accent/20 pt-4 text-left text-sm text-muted">
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
  );
}
