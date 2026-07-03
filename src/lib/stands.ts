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
