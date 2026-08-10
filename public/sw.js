/*
 * Minimal service worker.
 *
 * Den cacher BEVIDST intet. Den findes udelukkende, fordi Chrome på Android
 * kræver en registreret service worker med en fetch-handler, før den tilbyder
 * "Installér app". Al netværkstrafik går uændret videre, så et stempelkort
 * aldrig kan blive vist med forældede stempler.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Ingen event.respondWith() — browseren henter som normalt.
});
