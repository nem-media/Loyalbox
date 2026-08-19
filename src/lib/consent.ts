/**
 * Samtykke til cookies.
 *
 * TRE SLAGS, MED HVER SINE REGLER:
 *
 * Nødvendige — login-cookien. Kan ikke fravælges; uden den virker login ikke.
 * Der spørges ikke om lov, fordi tjenesten ikke kan leveres uden.
 *
 * Statistik — Google Analytics. Sætter cookies, kræver et aktivt ja.
 * (Den cookiefri måling fra Vercel hører IKKE til her: den sætter intet på
 * enheden og kræver derfor ikke samtykke.)
 *
 * Marketing — Google Ads, til konverteringsmåling og remarketing. Kræver et
 * aktivt ja. At droppe Analytics fjerner altså ikke behovet for et banner;
 * markedsføringscookies er om noget den kategori, reglerne er strengest om.
 *
 * Scripts indlæses FØRST efter et ja. Vi bruger bevidst ikke Consent Mode til
 * at indlæse dem "begrænset" på forhånd — så ville de køre før samtykket.
 */

export const CONSENT_KEY = "loyalsum-samtykke";

/**
 * Tilfældigt id for den enkelte browser.
 *
 * Bruges alene til at se, at en senere ændring kommer fra samme besøgende, så
 * loggen ikke ser ud som to forskellige mennesker. Det er IKKE personhenførbart
 * og må aldrig kobles til en bruger, en e-mail eller en IP.
 */
export const CONSENT_ID_KEY = "loyalsum-samtykke-id";

/**
 * Hæves, når vi begynder at spørge om noget nyt — så bliver et gammelt valg
 * ugyldigt, og der spørges igen. Version 1 spurgte kun om statistik; version 2
 * skelner mellem statistik og marketing, og et gammelt ja til statistik må
 * ikke stiltiende komme til at dække annoncering.
 */
export const CONSENT_VERSION = 2;

export interface Consent {
  version: number;
  statistics: boolean;
  marketing: boolean;
  /** Hvornår der blev taget stilling. ISO-tidspunkt. */
  decidedAt: string;
}

export type ConsentCategory = "statistics" | "marketing";

export interface CategoryInfo {
  key: ConsentCategory;
  label: string;
  description: string;
}

/** De kategorier, der kan slås til og fra. Nødvendige står uden for. */
export const CONSENT_CATEGORIES: CategoryInfo[] = [
  {
    key: "statistics",
    label: "Statistik",
    description:
      "Hjælper os med at se, hvilke sider der bliver læst, så vi kan gøre dem bedre.",
  },
  {
    key: "marketing",
    label: "Marketing",
    description:
      "Måler hvilke annoncer der fører til et køb, og lader os vise annoncer til folk, der har besøgt siden.",
  },
];

export function parseConsent(raw: string | null | undefined): Consent | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<Consent>;
    if (v?.version !== CONSENT_VERSION) return null;
    if (typeof v.statistics !== "boolean") return null;
    if (typeof v.marketing !== "boolean") return null;
    return {
      version: CONSENT_VERSION,
      statistics: v.statistics,
      marketing: v.marketing,
      decidedAt: typeof v.decidedAt === "string" ? v.decidedAt : "",
    };
  } catch {
    // Beskadiget indhold behandles som "ikke taget stilling". At kaste her
    // ville vælte hele siden på grund af én ødelagt streng i localStorage.
    return null;
  }
}

export function serializeConsent(
  valg: Pick<Consent, "statistics" | "marketing">,
  now = new Date(),
): string {
  return JSON.stringify({
    version: CONSENT_VERSION,
    statistics: valg.statistics,
    marketing: valg.marketing,
    decidedAt: now.toISOString(),
  } satisfies Consent);
}

/**
 * Er der overhovedet noget at spørge om?
 *
 * Er hverken Analytics eller Ads sat op, sætter vi intet på enheden, og et
 * banner ville være en pop-up, der beder om lov til ingenting.
 */
export function hasSomethingToAskAbout(ids: {
  ga?: string;
  ads?: string;
}): boolean {
  return Boolean(ids.ga || ids.ads);
}

export function shouldAskForConsent(
  ids: { ga?: string; ads?: string },
  stored: Consent | null,
): boolean {
  return hasSomethingToAskAbout(ids) && stored === null;
}

/** Må Google Analytics indlæses? */
export function mayLoadStatistics(
  gaId: string | undefined,
  stored: Consent | null,
): boolean {
  return Boolean(gaId) && stored?.statistics === true;
}

/** Må Google Ads indlæses? */
export function mayLoadMarketing(
  adsId: string | undefined,
  stored: Consent | null,
): boolean {
  return Boolean(adsId) && stored?.marketing === true;
}

/**
 * Det, der sendes til loggen. Holdes bevidst minimalt: uden IP, uden
 * user-agent og uden hele URL'en.
 */
export interface ConsentLogEntry {
  consentId: string;
  version: number;
  statistics: boolean;
  marketing: boolean;
  decidedAt: string;
  path: string;
}

/** Er en indkommen post gyldig? Bruges af API'et, så der ikke skrives skrald. */
export function isValidLogEntry(v: unknown): v is ConsentLogEntry {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Partial<ConsentLogEntry>;
  return (
    typeof e.consentId === "string" &&
    /^[0-9a-f-]{36}$/.test(e.consentId) &&
    e.version === CONSENT_VERSION &&
    typeof e.statistics === "boolean" &&
    typeof e.marketing === "boolean" &&
    typeof e.decidedAt === "string" &&
    !Number.isNaN(Date.parse(e.decidedAt)) &&
    typeof e.path === "string" &&
    e.path.startsWith("/") &&
    e.path.length <= 200
  );
}
