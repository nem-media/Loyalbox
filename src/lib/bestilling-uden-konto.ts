import { erGyldigtCvr, normaliserCvr } from "@/lib/cvr";
import {
  erStanderFarve,
  normaliserHex,
  type StanderFarve,
} from "@/lib/stander-tilvalg";
import type { DestinationType } from "@/lib/types/database";

/**
 * Bestilling af et skilt UDEN konto.
 *
 * HVORFOR DEN FINDES: en Basic-kunde køber ét skilt og skal ikke administrere
 * noget bagefter. De fik alligevel en konto, et tomt dashboard og en
 * LoyalSum-side, der indsamlede feedback, de aldrig kunne læse. Efter denne
 * ændring er Basic et trykt skilt — ikke et system.
 *
 * ALT VALIDERES HER, som ét sted. Formularen er offentlig og uden login, så
 * intet felt kan tages for givet: der er ingen konto at falde tilbage på for
 * hverken CVR, mail eller firmanavn.
 *
 * Fejlene samles og returneres ALLE PÅ ÉN GANG. En formular, der afviser ét
 * felt ad gangen, tvinger folk gennem lige så mange forsøg, som der er fejl.
 */

export const DESTINATIONER: {
  vaerdi: DestinationType;
  navn: string;
  hjaelp: string;
}[] = [
  {
    vaerdi: "google",
    navn: "Google",
    hjaelp: "Linket til at skrive en Google-anmeldelse",
  },
  { vaerdi: "trustpilot", navn: "Trustpilot", hjaelp: "Din Trustpilot-side" },
  { vaerdi: "facebook", navn: "Facebook", hjaelp: "Din Facebook-side" },
  {
    vaerdi: "custom",
    navn: "Mit eget link",
    hjaelp: "Fx menukort, booking eller webshop",
  },
];

export interface BestillingFelter {
  firmanavn: string;
  cvr: string;
  email: string;
  antal: number;
  standerFarve: StanderFarve;
  egenFrontfarve: boolean;
  frontHex: string | null;
  /** Kundens egen accentfarve, eller null for LoyalSums egen. Gratis tilvalg. */
  accentHex: string | null;
  destinationType: DestinationType;
  destinationUrl: string;
  accepterVilkaar: boolean;
}

export type Fejl = Partial<Record<keyof BestillingFelter, string>>;

export interface Laest {
  ok: boolean;
  fejl: Fejl;
  vaerdier?: BestillingFelter;
}

/**
 * Er det en brugbar adresse?
 *
 * Kun http og https. Uden kontrollen kunne en `javascript:`-adresse blive
 * trykt på et skilt og køre i den næste gæsts browser — og et skilt kan ikke
 * kaldes tilbage.
 */
export function erGyldigUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Ser det ud som en mailadresse? Bevidst løs — Stripe og mailen er den rigtige prøve. */
export function erGyldigEmail(raw: string): boolean {
  const v = raw.trim();
  return v.length > 3 && v.length < 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

const MAKS_ANTAL = 100;

export function laesBestilling(
  raw: Record<string, unknown>,
  maksAntal = MAKS_ANTAL,
): Laest {
  const fejl: Fejl = {};
  const tekst = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const firmanavn = tekst(raw.firmanavn);
  if (firmanavn.length < 2) {
    fejl.firmanavn = "Skriv virksomhedens navn.";
  }

  // CVR er FRIVILLIGT, men skal være rigtigt, hvis det skrives. Et tomt felt
  // spærrer ikke længere for et køb — se koebSpaerre() i commerce.ts.
  /*
   * ACCENTEN AFVISER IKKE. Modsat frontfarven er den gratis og har en gyldig
   * standard: falder koden ud som ugyldig, trykkes LoyalSums egen. At afvise
   * hele bestillingen, fordi en farvekode var skrevet forkert, ville koste et
   * salg for ingenting.
   */
  const accentRaw = tekst(raw.accentHex);
  const accentHex = accentRaw ? normaliserHex(accentRaw) : null;

  const cvrRaw = tekst(raw.cvr);
  if (cvrRaw && !erGyldigtCvr(cvrRaw)) {
    fejl.cvr = "Otte cifre — tjek nummeret, eller lad feltet stå tomt.";
  }

  const email = tekst(raw.email);
  if (!erGyldigEmail(email)) {
    fejl.email = "Skriv en mailadresse, vi kan sende ordren til.";
  }

  const antal = Math.floor(Number(raw.antal) || 0);
  if (antal < 1 || antal > maksAntal) {
    fejl.antal = `Vælg mellem 1 og ${maksAntal} standere.`;
  }

  const standerFarve = raw.standerFarve;
  if (!erStanderFarve(standerFarve)) {
    fejl.standerFarve = "Vælg en stander.";
  }

  const egenFrontfarve = raw.egenFrontfarve === true;
  const frontHex = egenFrontfarve ? normaliserHex(tekst(raw.frontHex)) : null;
  if (egenFrontfarve && !frontHex) {
    fejl.frontHex = "Skriv en gyldig farvekode, fx #26616e.";
  }

  const destinationType = raw.destinationType;
  const kendtDestination = DESTINATIONER.some(
    (d) => d.vaerdi === destinationType,
  );
  if (!kendtDestination) {
    fejl.destinationType = "Vælg hvor QR-koden skal føre hen.";
  }

  const destinationUrl = tekst(raw.destinationUrl);
  if (!destinationUrl) {
    fejl.destinationUrl = "Indsæt linket, QR-koden skal føre til.";
  } else if (!erGyldigUrl(destinationUrl)) {
    fejl.destinationUrl = "Linket skal begynde med http:// eller https://";
  }

  if (raw.accepterVilkaar !== true) {
    fejl.accepterVilkaar = "Du skal acceptere handelsbetingelserne.";
  }

  if (Object.keys(fejl).length > 0) return { ok: false, fejl };

  return {
    ok: true,
    fejl: {},
    vaerdier: {
      firmanavn,
      cvr: normaliserCvr(cvrRaw),
      email,
      antal,
      standerFarve: standerFarve as StanderFarve,
      egenFrontfarve,
      frontHex,
      accentHex,
      destinationType: destinationType as DestinationType,
      destinationUrl,
      accepterVilkaar: true,
    },
  };
}

/**
 * Beskeden, når CVR'et allerede hører til en konto med login.
 *
 * Den må IKKE bare være "det virkede ikke". En bestilling uden konto må ikke
 * kunne hænge en ordre og et design på en eksisterende kundes virksomhed, blot
 * fordi nogen kender deres CVR — men den, der står med formularen, er
 * sandsynligvis kunden selv, der har glemt at logge ind.
 */
export const CVR_HAR_KONTO =
  "Der findes allerede en konto med dette CVR-nummer. Log ind og bestil derfra — så kommer ordren med på jeres eksisterende aftale.";
