"use client";

import { useEffect } from "react";

/**
 * Registrerer den minimale service worker (`public/sw.js`). Uden en registreret
 * service worker tilbyder Chrome på Android ikke "Installér app" — kunden kan
 * kun bruge menuens "Føj til startskærm". Workeren cacher intet.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registrering er en ren forbedring — fejler den, virker sitet uændret.
    });
  }, []);

  return null;
}
