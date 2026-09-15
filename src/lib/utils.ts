import { TIDSZONE } from "@/lib/dansk-dag";

export type ClassValue = string | false | null | undefined;

/** Minimal className joiner. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Short, URL-safe, human-shareable slug for a stand (e.g. "a7k92d"). */
export function generateSlug(length = 6): string {
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  }
  return out;
}

/** Coarse device classification from a User-Agent string. */
export function deviceTypeFromUA(
  ua: string | null,
): "mobile" | "tablet" | "desktop" | "unknown" {
  if (!ua) return "unknown";
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(s)) return "tablet";
  if (/mobi|iphone|android.*mobile|phone/.test(s)) return "mobile";
  if (/android/.test(s)) return "tablet";
  return "desktop";
}

export function formatCurrency(amount: number, currency = "DKK"): string {
  return new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * DATOER OG KLOKKESLÆT VISES I DANSK TID — ALTID, OG UANSET HVOR DE TEGNES.
 *
 * `Intl.DateTimeFormat` uden `timeZone` bruger den tidszone, koden tilfældigvis
 * kører i. Serverfunktionerne kører i UTC, og komponenterne her tegnes på
 * serveren — så alt, hvad butikken fik at se, var ude af takt med uret på
 * væggen: en eller to timer forkert, og datoen forkert for alt mellem kl. 22 og
 * midnat.
 *
 * MÅLT PÅ EN RIGTIG RÆKKE 2026-09-15: en kundes anmeldelse ligger i basen
 * 2026-09-08T21:01:26Z, altså kl. **23.01** dansk tid. Dashboardet skrev
 * "8. sep., 21.01". Butikken kunne altså ikke bruge tidspunktet til at finde
 * ud af, hvilken kunde det var — og der står ikke noget om tidszoner på
 * skærmen, så der er ingen måde at gætte det på.
 *
 * Tredje udgave af samme fejl på én dag: den daglige stempelgrænse og
 * statistikkens "I dag" målte også fra serverens døgn. Tidszonen ligger derfor
 * i `@/lib/dansk-dag` sammen med resten.
 */
export function formatDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("da-DK", {
    timeZone: TIDSZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("da-DK", {
    timeZone: TIDSZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
