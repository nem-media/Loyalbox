import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomInt,
} from "node:crypto";

/**
 * INTEGRATIONENS NØGLE — KRYPTERET I BASEN MED EN DEDIKERET NØGLE.
 *
 * En HMAC kan kun efterprøves af den, der kender nøglen, så serveren SKAL
 * kunne genskabe den; en hash som ved en adgangskode duer ikke. Den ligger
 * derfor krypteret med AES-256-GCM, og nøglen til krypteringen findes ikke i
 * basen.
 *
 * KRYPTERINGSNØGLEN ER SIN EGEN HEMMELIGHED: `LOYALSUM_COMMERCE_ENCRYPTION_KEY`
 * (32 tilfældige bytes, base64). Den var først udledt af service-role-nøglen,
 * og det bandt to ting sammen, der skal kunne roteres hver for sig: en
 * rotation af Supabase-nøglen ville have gjort hver butiks nøgle ulæselig og
 * krævet, at alle webshops blev parret igen. Service-role-nøglen bruges
 * derfor IKKE her — `secret.test.ts` holder fast i det.
 *
 * NØGLE-ID OG ROTATION. Chifferteksten er `<id>.<iv>.<tag>.<data>`, og id'et
 * (`k1`, `k2` …) siger, hvilken nøgle den er låst med:
 *
 *   LOYALSUM_COMMERCE_ENCRYPTION_KEY           den aktuelle nøgle (base64)
 *   LOYALSUM_COMMERCE_ENCRYPTION_KEY_ID        dens id — standard `k1`
 *   LOYALSUM_COMMERCE_ENCRYPTION_KEYS_RETIRED  tidligere nøgler, der stadig
 *                                              skal kunne LÆSES: `k1:<base64>`
 *                                              (kommasepareret)
 *
 * En rotation er: læg den nye som aktuel med `k2`, flyt den gamle til
 * `…_RETIRED` som `k1:…`. Hver integration krypteres om til `k2`, næste gang
 * den kalder (`auth.ts`), og når ingen række bærer `k1.` længere, kan den
 * gamle fjernes. Ingen butik skal parres igen, og skemaet ændres ikke.
 *
 * DEN FEJLER LUKKET — MEN KUN FOR COMMERCE. Nøglen læses først, når en
 * webshopfunktion bruges. Mangler den eller har den forkert form, afviser
 * parring og API med `commerce_unavailable` (503), og dashboardet siger, at
 * integrationen ikke er sat op; resten af LoyalSum mærker intet.
 *
 * Nøglen logges aldrig og returneres kun ÉN gang — i svaret på parringen.
 */

export const NOEGLE_ENV = "LOYALSUM_COMMERCE_ENCRYPTION_KEY";
export const NOEGLE_ID_ENV = "LOYALSUM_COMMERCE_ENCRYPTION_KEY_ID";
export const TIDLIGERE_NOEGLER_ENV = "LOYALSUM_COMMERCE_ENCRYPTION_KEYS_RETIRED";
const STANDARD_ID = "k1";
const ID_FORM = /^k[1-9]\d{0,3}$/;

/** Webshopfunktionen er ikke sat op (nøglen mangler eller er ugyldig). */
export class CommerceNoegleFejl extends Error {
  constructor(besked: string) {
    super(besked);
    this.name = "CommerceNoegleFejl";
  }
}

export interface Noeglering {
  aktuel: { id: string; noegle: Buffer };
  alle: Map<string, Buffer>;
}

type Miljoe = Record<string, string | undefined>;

/**
 * Præcis 32 bytes, skrevet som standard-base64 (44 tegn med `=`) eller
 * base64url (43 tegn). Alt andet afvises — også en nøgle, der "næsten" er
 * rigtig: en afkortet eller forkert kopieret nøgle skal fejle ved første
 * brug og ikke kryptere med noget, ingen kan genskabe.
 */
export function laesNoegle(vaerdi: string | undefined, navn = NOEGLE_ENV): Buffer {
  const v = (vaerdi ?? "").trim();
  if (!v) throw new CommerceNoegleFejl(`${navn} mangler`);
  if (!/^[A-Za-z0-9+/]{43}=$/.test(v) && !/^[A-Za-z0-9_-]{43}$/.test(v)) {
    throw new CommerceNoegleFejl(`${navn} skal være 32 bytes i base64 (44 tegn)`);
  }
  const b = Buffer.from(v, v.endsWith("=") ? "base64" : "base64url");
  if (b.length !== 32) throw new CommerceNoegleFejl(`${navn} skal være præcis 32 bytes`);
  return b;
}

export function noeglering(env: Miljoe = process.env): Noeglering {
  const id = (env[NOEGLE_ID_ENV] ?? "").trim() || STANDARD_ID;
  if (!ID_FORM.test(id)) throw new CommerceNoegleFejl(`${NOEGLE_ID_ENV} skal have formen k1, k2 …`);
  const noegle = laesNoegle(env[NOEGLE_ENV]);
  const alle = new Map<string, Buffer>([[id, noegle]]);
  for (const del of (env[TIDLIGERE_NOEGLER_ENV] ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
    const i = del.indexOf(":");
    const tid = del.slice(0, i);
    if (i < 1 || !ID_FORM.test(tid)) {
      throw new CommerceNoegleFejl(`${TIDLIGERE_NOEGLER_ENV} skal have formen k1:<base64>`);
    }
    if (tid === id) throw new CommerceNoegleFejl(`${tid} står både som aktuel og tidligere nøgle`);
    alle.set(tid, laesNoegle(del.slice(i + 1), `${TIDLIGERE_NOEGLER_ENV} (${tid})`));
  }
  return { aktuel: { id, noegle }, alle };
}

/** Er webshopfunktionen sat op? Til dashboardet — kaster aldrig. */
export function commerceKrypteringKlar(env: Miljoe = process.env): boolean {
  try {
    noeglering(env);
    return true;
  } catch {
    return false;
  }
}

/** 32 tilfældige bytes, som adapteren signerer med. */
export function nySigneringsnoegle(): string {
  return "lss_" + randomBytes(32).toString("base64url");
}

/** Krypterer med den AKTUELLE nøgle. Kaster `CommerceNoegleFejl`, hvis den mangler. */
export function krypter(klartekst: string, ring: Noeglering = noeglering()): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", ring.aktuel.noegle, iv);
  const data = Buffer.concat([c.update(klartekst, "utf8"), c.final()]);
  return [
    ring.aktuel.id,
    iv.toString("base64url"),
    c.getAuthTag().toString("base64url"),
    data.toString("base64url"),
  ].join(".");
}

/** Id'et, en chiffertekst er låst med (`k1` …), eller null. */
export function noegleId(chiffer: string): string | null {
  const id = chiffer.split(".")[0];
  return ID_FORM.test(id) ? id : null;
}

/**
 * Dekrypterer med den nøgle, chifferteksten selv angiver. Null, hvis nøglen
 * ikke (længere) findes, eller teksten er ændret (GCM-mærket passer ikke).
 * Kaster `CommerceNoegleFejl`, hvis funktionen slet ikke er sat op.
 */
export function dekrypter(chiffer: string, ring: Noeglering = noeglering()): string | null {
  const dele = chiffer.split(".");
  if (dele.length !== 4) return null;
  const noegle = ring.alle.get(dele[0]);
  if (!noegle) return null;
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
