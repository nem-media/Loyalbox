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

export function formatDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
