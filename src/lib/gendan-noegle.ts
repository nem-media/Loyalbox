import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * NØGLEN, DER FØRER EN FORTRUDT BESTILLING UDEN KONTO TILBAGE TIL SIG SELV.
 *
 * Bestillingen uden konto opretter virksomhed, design, stander og ordre FØR
 * betalingen — prisen afhænger af valgene. Fortryder kunden hos Stripe, ligger
 * alt derfor i basen, og admin kan se både logo og farvevalg. Kunden selv
 * landede på en tom formular og skulle taste firmanavn, CVR og mail forfra og
 * uploade logoet igen.
 *
 * DEN INDLOGGEDE VEJ BLEV LØST MED ET RENT ID i fortryd-adressen
 * (`/bestil?design=…`), fordi siden kan spørge „tilhører designet den butik,
 * der er logget ind?“. HER ER DER INGEN AT SPØRGE OM. Et rå design-id i
 * adressen ville være en nøgle til en fremmed butiks logo, mail og CVR for
 * enhver, der gætter et UUID — og det er netop den slags adresse, der ender i
 * en browserhistorik.
 *
 * Derfor signeres det. Nøglen beviser, at adressen kommer fra OS — den er
 * udstedt i samme øjeblik, betalingssessionen blev oprettet — og den kan ikke
 * laves om til at pege på et andet design uden at signaturen holder op med at
 * passe.
 *
 * HEMMELIGHEDEN ER SERVICE-ROLE-NØGLEN, og det er et bevidst valg frem for en
 * ny indstilling: en signeringsnøgle, der skal sættes i Vercel, er en, der kan
 * MANGLE i produktionen — og virkningen ville være tavs, for en manglende
 * nøgle rammer kun den kunde, der fortryder. Service-role-nøglen findes
 * allerede overalt, hvor koden kører, den forlader aldrig serveren, og en
 * HMAC røber den ikke. FORMÅLET blandes ind i signaturen, så en nøgle herfra
 * aldrig kan bruges et andet sted, hvis den samme hemmelighed en dag også
 * signerer noget andet.
 */

/** Blandes ind i signaturen, så nøgler fra to formål ikke kan byttes om. */
const FORMAAL = "loyalsum:gendan-bestilling:v1";

/**
 * Hvor længe nøglen virker.
 *
 * SAMME LEVETID SOM STRIPES BETALINGSSESSION. Nøglen udstedes, når sessionen
 * oprettes, og sessionen kan ikke betales efter et døgn — så en nøgle, der
 * lever længere, ville kun være en adresse med kundens oplysninger, der bliver
 * ved med at virke. Kladden i basen ligger syv dage (se migration 0037), men
 * dét er en frist for VORES oprydning, ikke for, hvor længe en adresse i en
 * browserhistorik skal kunne åbne noget.
 */
export const GENDAN_LEVETID_MS = 24 * 60 * 60 * 1000;

export interface GendanNyttelast {
  designId: string;
  companyId: string;
}

/** `{d,c,u}` — korte navne, fordi de står i en adresselinje. */
interface Raa {
  d: string;
  c: string;
  u: number;
}

const b64 = (b: Buffer) => b.toString("base64url");

function hemmelighed(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

function signatur(nyttelast: string, noegle: string): string {
  return b64(
    createHmac("sha256", noegle).update(`${FORMAAL}.${nyttelast}`).digest(),
  );
}

/**
 * Laver nøglen til fortryd-adressen.
 *
 * Kaster, hvis hemmeligheden mangler. Det er med vilje: kaldet sker, mens
 * bestillingen bygges, og en fejl dér bliver fanget og vist — modsat en tom
 * streng, der ville give en adresse, der ser rigtig ud og aldrig virker.
 */
export function lavGendanNoegle(
  { designId, companyId }: GendanNyttelast,
  nu: number = Date.now(),
): string {
  const noegle = hemmelighed();
  if (!noegle) throw new Error("SUPABASE_SERVICE_ROLE_KEY mangler");

  const raa: Raa = {
    d: designId,
    c: companyId,
    u: Math.floor((nu + GENDAN_LEVETID_MS) / 1000),
  };
  const nyttelast = b64(Buffer.from(JSON.stringify(raa), "utf8"));
  return `${nyttelast}.${signatur(nyttelast, noegle)}`;
}

/**
 * Læser en nøgle. Null betyder „brug den ikke til noget“ — uden forklaring.
 *
 * DER SKELNES IKKE MELLEM FORFALSKET OG UDLØBET, og det er ikke sjusk: begge
 * dele ender samme sted — en almindelig, tom bestillingsformular. En besked om
 * at nøglen er *udløbet* ville fortælle en fremmed, at der ligger noget.
 */
export function laesGendanNoegle(
  noegle: string | null | undefined,
  nu: number = Date.now(),
): GendanNyttelast | null {
  if (!noegle) return null;
  const hem = hemmelighed();
  if (!hem) return null;

  const punkt = noegle.indexOf(".");
  if (punkt <= 0) return null;
  const nyttelast = noegle.slice(0, punkt);
  const givet = noegle.slice(punkt + 1);

  /*
   * SAMMENLIGNES I KONSTANT TID. Et `===` på to signaturer stopper ved første
   * forskellige tegn, og forskellen kan måles — se `sletning.ts`, hvor samme
   * hensyn gælder sletningstokenet. Længden tjekkes først, for
   * `timingSafeEqual` kaster på ulige længder.
   */
  const rigtig = Buffer.from(signatur(nyttelast, hem), "utf8");
  const buf = Buffer.from(givet, "utf8");
  if (buf.length !== rigtig.length || !timingSafeEqual(buf, rigtig)) return null;

  let raa: Raa;
  try {
    raa = JSON.parse(Buffer.from(nyttelast, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof raa?.d !== "string" || typeof raa?.c !== "string") return null;
  if (typeof raa?.u !== "number" || raa.u * 1000 <= nu) return null;

  return { designId: raa.d, companyId: raa.c };
}
