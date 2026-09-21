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
  /**
   * Betales abonnementet pr. måned eller pr. år?
   *
   * `"maaned"` ER STANDARDEN OG OGSÅ SVARET PÅ ET UKENDT ORD. Feltet kommer
   * fra to knapper, vi selv har tegnet, så alt andet er en formular på
   * afveje — og måneden er den billigste antagelse for kunden. Et gæt den
   * anden vej ville trække tolv gange beløbet.
   *
   * Om årsvejen overhovedet FINDES, afgøres ikke her: `kanKoebesAarligt()`
   * spørger, om prisobjektet er oprettet i den tilstand, sitet kører i. Den
   * her funktion har ingen Stripe-adgang og skal ikke have det — den læser
   * en formular.
   */
  interval: "maaned" | "aar";
}

/**
 * DET, KUNDEN HAVDE LAVET, DA DE FORTRØD HOS STRIPE.
 *
 * Hentes af `/bestil/uden-konto`, når fortryd-adressen bærer en gyldig nøgle
 * (se `gendan-noegle.ts`), og bruges til at tegne formularen, som den stod.
 * Logoet er en ADRESSE og ikke en fil: et filfelt kan ikke forudfyldes, så
 * filen bliver liggende i lageret og hæftes på igen ved indsendelsen.
 */
export interface FortrudtBestilling {
  /** Nøglen selv — den skal med tilbage til serveren for at kunne genbruge logoet. */
  noegle: string;
  firmanavn: string;
  cvr: string;
  email: string;
  standerFarve: StanderFarve;
  egenFrontfarve: boolean;
  frontHex: string | null;
  accentHex: string | null;
  logoUrl: string | null;
  logoNavn: string | null;
  destination?: { type: DestinationType; url: string };
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

/**
 * Læs destinationstypen fra en formular — kun en værdi, `DESTINATIONER` kender.
 *
 * `as DestinationType` stod to steder på et felt, der kommer udefra. Feltet er
 * ganske vist en `<select>`, vi selv har tegnet, så en ukendt værdi er en
 * formular på afveje og ikke en bruger, der skal have en fejlbesked — derfor
 * faldes der tilbage på Google. Men listen er i forvejen den fulde sandhed om
 * lovlige værdier, så den kan lige så godt bruges til at PRØVE dem. Samme
 * regel som `laesValg()` i loyalitetsmodulet.
 */
export function laesDestination(raa: unknown): DestinationType {
  const v = String(raa ?? "");
  return DESTINATIONER.some((d) => d.vaerdi === v)
    ? (v as DestinationType)
    : "google";
}

/** Ser det ud som en mailadresse? Bevidst løs — Stripe og mailen er den rigtige prøve. */
export function erGyldigEmail(raw: string): boolean {
  const v = raw.trim();
  return v.length > 3 && v.length < 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

const MAKS_ANTAL = 100;

/**
 * @param kraevDestination Skal QR-kodens mål oplyses NU?
 *
 * TRUE for Basic: koden trykkes direkte til butikkens eget link og kan aldrig
 * ændres bagefter, så oplyses den ikke her, findes den aldrig. FALSE for et
 * abonnement: koden peger på vores egen `/r/<slug>`, og målet sættes i
 * dashboardet, når kontoen er aktiveret. Se `kraeverDestination()` i
 * commerce.ts, som er den, der afgør det.
 */
export function laesBestilling(
  raw: Record<string, unknown>,
  maksAntal = MAKS_ANTAL,
  kraevDestination = true,
): Laest {
  const fejl: Fejl = {};
  const tekst = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  /* Se `BestillingFelter.interval`: alt andet end "aar" bliver til måned. */
  const interval: "maaned" | "aar" = raw.interval === "aar" ? "aar" : "maaned";

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
    fejl.frontHex = "Skriv en gyldig farvekode, fx #0f5b66.";
  }

  const destinationType = raw.destinationType;
  const destinationUrl = tekst(raw.destinationUrl);
  const kendtDestination = DESTINATIONER.some(
    (d) => d.vaerdi === destinationType,
  );

  if (kraevDestination) {
    if (!kendtDestination) {
      fejl.destinationType = "Vælg hvor QR-koden skal føre hen.";
    }
    if (!destinationUrl) {
      fejl.destinationUrl = "Indsæt linket, QR-koden skal føre til.";
    } else if (!erGyldigUrl(destinationUrl)) {
      fejl.destinationUrl = "Linket skal begynde med http:// eller https://";
    }
  } else if (destinationUrl && !erGyldigUrl(destinationUrl)) {
    /*
     * FRIVILLIGT, MEN IKKE HVAD SOM HELST. Feltet vises ikke for et
     * abonnement, men formularen er offentlig, og et felt, der ikke kræves,
     * er stadig et felt, nogen kan sende noget i. En `javascript:`-adresse må
     * ikke kunne nå en stander ad den vej.
     */
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
      // Uden krav kan de være tomme; kalderen sætter kun destinationen på
      // standeren, hvis der faktisk kom et link med.
      destinationType: (kendtDestination
        ? destinationType
        : "custom") as DestinationType,
      destinationUrl,
      accepterVilkaar: true,
      interval,
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

/**
 * Samme besked, men fanget på E-MAILEN i stedet for CVR'et.
 *
 * CVR-SPÆRREN HAR ET HUL, og det kostede en rigtig kunde adgangen til et
 * køb på 548 kr. Feltet er frivilligt (se AGENTS.md), og et TOMT CVR
 * springer opslaget over — så en butiksejer, der bestiller igen uden at
 * udfylde nummeret, fik en HELT NY virksomhed i stedet for at lande på
 * sin egen. Dashboardet viser kun én virksomhed pr. bruger, så det
 * betalte køb blev usynligt.
 *
 * DER AFVISES, OG DER KNYTTES IKKE. En offentlig formular må aldrig kunne
 * hænge en ordre på en eksisterende kundes virksomhed, blot fordi nogen
 * kender deres e-mail — adresser er ikke verificerede. Vejen frem er den
 * samme som ved CVR'et: log ind, og bestil derfra, hvor ordren lander
 * det rigtige sted af sig selv.
 *
 * KUN når kontoen FAKTISK ejer en virksomhed. En slutkunde med et
 * stempelkort har også en konto, men intet kundeforhold at lande på —
 * afvistes de her, kunne de hverken bestille her eller inde i systemet.
 */
export const EMAIL_HAR_KONTO =
  "Der findes allerede en konto med denne e-mail. Log ind og bestil derfra — så lander ordren på jeres eksisterende aftale i stedet for at oprette en ny virksomhed.";
