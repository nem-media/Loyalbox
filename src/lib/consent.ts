/**
 * Samtykke til statistik.
 *
 * TO SLAGS MÅLING, TO SLAGS REGLER:
 *
 * Vercel Analytics er cookiefri og sætter intet på den besøgendes enhed. Den
 * kræver derfor ikke samtykke og kører altid — så basistallene er komplette.
 *
 * Google Analytics sætter cookies og behandler personoplysninger. Den må
 * derfor FØRST indlæses, når den besøgende aktivt har sagt ja. Vi bruger ikke
 * Consent Mode til at indlæse den "begrænset" på forhånd: så ville scriptet
 * køre, før der var sagt ja, og det er præcis det, reglerne forbyder.
 *
 * Valget gemmes i localStorage og ikke i en cookie — så sætter vi ikke selv
 * noget på enheden, før der er taget stilling.
 */

export const CONSENT_KEY = "loyalsum-samtykke";

/**
 * Hæves, hvis vi begynder at spørge om noget nyt. Så bliver et gammelt valg
 * ugyldigt, og den besøgende bliver spurgt igen — i stedet for at et ja til
 * statistik stiltiende kommer til at dække noget andet.
 */
export const CONSENT_VERSION = 1;

export interface Consent {
  version: number;
  /** Har den besøgende sagt ja til statistik med cookies? */
  analytics: boolean;
  /** Hvornår der blev taget stilling. ISO-tidspunkt. */
  decidedAt: string;
}

/** Læser et gemt valg. Null hvis der ikke er taget stilling — eller hvis det gemte er fra en ældre version. */
export function parseConsent(raw: string | null | undefined): Consent | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<Consent>;
    if (v?.version !== CONSENT_VERSION) return null;
    if (typeof v.analytics !== "boolean") return null;
    return {
      version: CONSENT_VERSION,
      analytics: v.analytics,
      decidedAt: typeof v.decidedAt === "string" ? v.decidedAt : "",
    };
  } catch {
    // Ugyldigt indhold behandles som "ikke taget stilling". At kaste her ville
    // vælte hele siden på grund af en beskadiget streng i localStorage.
    return null;
  }
}

export function serializeConsent(analytics: boolean, now = new Date()): string {
  return JSON.stringify({
    version: CONSENT_VERSION,
    analytics,
    decidedAt: now.toISOString(),
  } satisfies Consent);
}

/**
 * Skal banneret vises?
 *
 * Kun hvis der FAKTISK er noget at samtykke til. Er der ingen GA opsat, sætter
 * vi intet på enheden, og så ville et banner være en pop-up, der spørger om
 * lov til ingenting.
 */
export function shouldAskForConsent(
  gaId: string | undefined,
  stored: Consent | null,
): boolean {
  return Boolean(gaId) && stored === null;
}

/** Må Google Analytics indlæses? */
export function mayLoadAnalytics(
  gaId: string | undefined,
  stored: Consent | null,
): boolean {
  return Boolean(gaId) && stored?.analytics === true;
}
