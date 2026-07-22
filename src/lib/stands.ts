import type { Database, DestinationType } from "@/lib/types/database";

type Stand = Database["public"]["Tables"]["stands"]["Row"];

export interface Destination {
  url: string | null;
  type: DestinationType;
  label: string;
}

const LABELS: Record<DestinationType, string> = {
  google: "Anmeld os på Google",
  trustpilot: "Anmeld os på Trustpilot",
  facebook: "Anmeld os på Facebook",
  custom: "Skriv en anmeldelse",
};

function urlFor(stand: Stand, type: DestinationType): string | null {
  switch (type) {
    case "google":
      return stand.google_review_url;
    case "trustpilot":
      return stand.trustpilot_url;
    case "facebook":
      return stand.facebook_url;
    case "custom":
      return stand.custom_url;
  }
}

/**
 * Resolves the public-review destination for a stand. Prefers the configured
 * destination_type, then falls back to the first available link so a negative
 * customer is never blocked from leaving a public review.
 */
export function resolvePublicDestination(stand: Stand): Destination {
  const primary = urlFor(stand, stand.destination_type);
  if (primary) {
    return { url: primary, type: stand.destination_type, label: LABELS[stand.destination_type] };
  }

  const order: DestinationType[] = ["google", "trustpilot", "facebook", "custom"];
  for (const t of order) {
    const u = urlFor(stand, t);
    if (u) return { url: u, type: t, label: LABELS[t] };
  }

  return { url: null, type: stand.destination_type, label: LABELS[stand.destination_type] };
}

export interface ReviewLink {
  type: DestinationType;
  url: string;
  /** Kort label til knappen, fx "Google". */
  platform: string;
}

const PLATFORM_NAMES: Record<DestinationType, string> = {
  google: "Google",
  trustpilot: "Trustpilot",
  facebook: "Facebook",
  custom: "Vores side",
};

/**
 * Alle konfigurerede OFFENTLIGE anmeldelses-platforme — kun dem forretningen
 * rent faktisk har udfyldt et link til. Den primære destination lægges først,
 * så review-siden kun viser de valg, forretningen har truffet.
 */
export function resolvePublicReviewLinks(stand: Stand): ReviewLink[] {
  const order: DestinationType[] = ["google", "trustpilot", "facebook"];
  const sorted = [
    stand.destination_type,
    ...order.filter((t) => t !== stand.destination_type),
  ].filter((t): t is DestinationType => t !== "custom");

  const links: ReviewLink[] = [];
  for (const t of sorted) {
    const u = urlFor(stand, t);
    if (u) links.push({ type: t, url: u, platform: PLATFORM_NAMES[t] });
  }
  return links;
}

/**
 * Valgfrit ekstra link (fx menukort, booking, webshop) — IKKE en anmeldelse.
 * Vises som et selvstændigt link ved siden af anmeldelses-valgene.
 */
export function resolveExtraLink(stand: Stand): { url: string } | null {
  return stand.custom_url ? { url: stand.custom_url } : null;
}
