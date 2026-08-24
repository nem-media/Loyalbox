"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

/**
 * "Få kortet som app" — lægger stempelkortet på kundens hjemmeskærm.
 *
 * Der er ingen app at hente i en app-butik; det er sitet selv der installeres.
 * Teksten siger derfor "læg på hjemmeskærmen" og ikke "download", så kunden
 * ikke leder forgæves i App Store.
 *
 * Tre tilstande, fordi browserne kan noget forskelligt:
 *   - Allerede installeret → intet vises.
 *   - Chrome/Edge (Android + desktop) → rigtig installationsknap via
 *     `beforeinstallprompt`.
 *   - iOS Safari → ingen API findes; kunden guides gennem Del-menuen.
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
    // iOS Safari kender ikke display-mode og sætter sit eget flag i stedet.
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

export function PwaInstall({ className }: { className?: string }) {
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

  useEffect(() => {
    // Browseren fyrer eventet når siden opfylder installationskravene. Vi
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

  // Kører kunden allerede appen, er der intet at tilbyde.
  if (isStandalone || installed) return null;

  const box = `box-shape border border-border bg-card p-4 text-center ${className ?? ""}`;

  if (installEvent) {
    return (
      <div className={box}>
        <p className="text-sm font-medium">Få kortet som app</p>
        <p className="mt-1 text-xs text-muted">
          Læg det på hjemmeskærmen, så er stemplerne ét tryk væk.
        </p>
        <Button
          size="sm"
          className="mt-3"
          onClick={() => {
            void installEvent.prompt();
          }}
        >
          Installér app
        </Button>
      </div>
    );
  }

  if (isIos) {
    return (
      <div className={box}>
        <p className="text-sm font-medium">Få kortet som app</p>
        <p className="mt-1 text-xs text-muted">
          Tryk på Del-ikonet nederst i Safari, og vælg{" "}
          <span className="font-medium">&laquo;Føj til hjemmeskærm&raquo;</span>
          .
        </p>
      </div>
    );
  }

  return (
    <div className={box}>
      <p className="text-sm font-medium">Få kortet som app</p>
      <p className="mt-1 text-xs text-muted">
        Åbn browserens menu, og vælg{" "}
        <span className="font-medium">&laquo;Føj til startskærm&raquo;</span>.
      </p>
    </div>
  );
}
