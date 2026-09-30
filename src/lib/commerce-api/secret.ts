import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
  randomInt,
} from "node:crypto";

/**
 * INTEGRATIONENS NØGLE — KRYPTERET I BASEN, ALDRIG I KLARTEKST.
 *
 * En HMAC kan kun efterprøves af den, der kender nøglen, så serveren SKAL
 * kunne genskabe den; en hash som ved en adgangskode duer ikke. Den ligger
 * derfor krypteret med AES-256-GCM, og nøglen til krypteringen findes ikke i
 * basen.
 *
 * KRYPTERINGSNØGLEN UDLEDES AF SERVICE-ROLE-NØGLEN MED FORMÅLET BLANDET IND
 * (HKDF), samme valg som `gendan-noegle.ts`: en ny indstilling i Vercel kan
 * MANGLE i produktion, og virkningen ville være tavs — hver parring ville
 * fejle. Formålet (`loyalsum-commerce-secret-v1`) sikrer, at den udledte
 * nøgle ikke kan bruges til noget andet.
 *
 * DEN PRIS, DER SKAL KENDES: roteres service-role-nøglen i Supabase, kan de
 * gemte nøgler ikke længere læses, og hver webshop skal parres igen. Derfor
 * bærer chifferteksten en NØGLEVERSION (`k1`), så en senere dedikeret nøgle
 * kan indføres som `k2`, uden at de gamle bliver ulæselige.
 *
 * Nøglen logges aldrig og returneres kun ÉN gang — i svaret på parringen.
 */

const FORMAAL = "loyalsum-commerce-secret-v1";
const VERSION = "k1";

function hovedNoegle(): Buffer {
  const kilde = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!kilde) throw new Error("SUPABASE_SERVICE_ROLE_KEY mangler");
  return Buffer.from(
    hkdfSync("sha256", kilde, Buffer.from("loyalsum"), Buffer.from(FORMAAL), 32),
  );
}

/** 32 tilfældige bytes, som adapteren signerer med. */
export function nySigneringsnoegle(): string {
  return "lss_" + randomBytes(32).toString("base64url");
}

export function krypter(klartekst: string, noegle: Buffer = hovedNoegle()): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", noegle, iv);
  const data = Buffer.concat([c.update(klartekst, "utf8"), c.final()]);
  return [VERSION, iv.toString("base64url"), c.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function dekrypter(chiffer: string, noegle: Buffer = hovedNoegle()): string | null {
  const dele = chiffer.split(".");
  if (dele.length !== 4 || dele[0] !== VERSION) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", noegle, Buffer.from(dele[1], "base64url"));
    d.setAuthTag(Buffer.from(dele[2], "base64url"));
    return Buffer.concat([d.update(Buffer.from(dele[3], "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// --------------------------------------------------------------- parringskoden

/**
 * Engangskoden, butiksejeren henter i dashboardet og taster i pluginet.
 *
 * 12 tegn fra et alfabet uden tegn, der kan forveksles (0/O, 1/I/L), i tre
 * grupper: `K7QM-4XWD-9RTB`. 31^12 ≈ 7,9 · 10^17 muligheder, et kvarter at
 * gætte i og én brug — der er ingen realistisk vej til at ramme en fremmed
 * butiks kode. Den gemmes kun som sha256.
 */
const ALFABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const PARRINGSKODE_MINUTTER = 15;

export function nyParringskode(): string {
  let s = "";
  // randomInt er jævnt fordelt — ingen skævhed fra 256 mod 31.
  for (let i = 0; i < 12; i++) s += ALFABET[randomInt(ALFABET.length)];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

/** Normaliserer det tastede (små bogstaver, mellemrum, bindestreger) før hash. */
export function parringskodeHash(kode: string): string {
  const ren = kode.toUpperCase().replace(/[\s-]/g, "");
  return createHash("sha256").update(ren, "utf8").digest("hex");
}

// ---------------------------------------------------------- kundereferencen

/** Den uigennemsigtige kundereference, adapteren gemmer. */
export function nyKundeReference(): string {
  return "lc_" + randomBytes(16).toString("hex");
}

/** Bekræftelseslinkets token — gemmes kun som sha256. */
export function nytBekraeftelsesToken(): string {
  return randomBytes(32).toString("base64url");
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
