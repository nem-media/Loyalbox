import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CommerceNoegleFejl,
  commerceKrypteringKlar,
  dekrypterIntegrationsnoegle as dekrypterMed,
  krypterIntegrationsnoegle as krypterMed,
  laesNoegle,
  noegleId,
  noeglering,
  NOEGLE_ENV,
  NOEGLE_ID_ENV,
  TIDLIGERE_NOEGLER_ENV,
} from "./secret";

/**
 * DEN DEDIKEREDE KRYPTERINGSNØGLE.
 *
 * Integrationernes nøgler ligger krypteret i basen. Nøglen til det er sin
 * egen hemmelighed — ikke Supabases service-role-nøgle — så de to kan roteres
 * hver for sig, og en rotation af den ene ikke tvinger hver butik til at
 * parre igen.
 */

const b64 = (n = 32) => randomBytes(n).toString("base64");
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const krypter = (x: string, ring: ReturnType<typeof noeglering>) => krypterMed(x, A, ring);
const dekrypter = (x: string, ring: ReturnType<typeof noeglering>) => dekrypterMed(x, A, ring);
const miljoe = (over: Record<string, string | undefined> = {}) => ({ [NOEGLE_ENV]: b64(), ...over });

describe("nøglens form", () => {
  it("32 bytes i base64 (44 tegn) og i base64url (43 tegn) accepteres", () => {
    expect(laesNoegle(b64())).toHaveLength(32);
    expect(laesNoegle(randomBytes(32).toString("base64url"))).toHaveLength(32);
  });

  it("forkert længde afvises — også en næsten rigtig", () => {
    expect(() => laesNoegle(b64(16))).toThrow(CommerceNoegleFejl);
    expect(() => laesNoegle(b64(33))).toThrow(CommerceNoegleFejl);
    expect(() => laesNoegle(b64().slice(0, 40))).toThrow(CommerceNoegleFejl);
  });

  it("noget, der ikke er base64, afvises", () => {
    expect(() => laesNoegle("x".repeat(43) + "!")).toThrow(CommerceNoegleFejl);
    expect(() => laesNoegle("hemmelig-adgangskode")).toThrow(CommerceNoegleFejl);
  });

  it("en manglende nøgle kaster en kontrolleret fejl", () => {
    expect(() => noeglering({})).toThrow(CommerceNoegleFejl);
    expect(commerceKrypteringKlar({})).toBe(false);
    expect(commerceKrypteringKlar(miljoe())).toBe(true);
  });
});

describe("service-role-nøglen er IKKE krypteringsnøglen", () => {
  it("med kun SUPABASE_SERVICE_ROLE_KEY er commerce ikke sat op", () => {
    const env = { SUPABASE_SERVICE_ROLE_KEY: b64() };
    expect(commerceKrypteringKlar(env)).toBe(false);
    expect(() => krypter("x", noeglering(env))).toThrow(CommerceNoegleFejl);
  });

  it("modulet læser den ikke", () => {
    const kilde = readFileSync(join(process.cwd(), "src/lib/commerce-api/secret.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(kilde).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(kilde).not.toMatch(/hkdf/i);
  });

  it("en nøgle krypteret med én krypteringsnøgle kan ikke læses med en anden", () => {
    const a = noeglering(miljoe());
    const b = noeglering(miljoe());
    expect(dekrypter(krypter("hemmelig", a), b)).toBeNull();
  });
});

describe("kryptering og nøgle-id", () => {
  it("rundtur, id-præfiks og tilfældig iv", () => {
    const ring = noeglering(miljoe());
    const x = krypter("lss_abc", ring);
    const y = krypter("lss_abc", ring);
    expect(x).toMatch(/^k1\.[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(x).not.toBe(y);
    expect(dekrypter(x, ring)).toBe("lss_abc");
    expect(noegleId(x)).toBe("k1");
  });

  it("en ændret chiffertekst afvises (GCM-mærket)", () => {
    const ring = noeglering(miljoe());
    const [id, iv, tag, data] = krypter("lss_abc", ring).split(".");
    const aendret = Buffer.from(data, "base64url");
    aendret[0] ^= 1;
    expect(dekrypter([id, iv, tag, aendret.toString("base64url")].join("."), ring)).toBeNull();
    expect(dekrypter("ikke.en.chiffer", ring)).toBeNull();
  });

  it("rotation: k1 kan stadig læses som tidligere nøgle, nye krypteres med k2", () => {
    const k1 = b64();
    const gammel = krypter("lss_gammel", noeglering({ [NOEGLE_ENV]: k1 }));
    const ny = noeglering({
      [NOEGLE_ENV]: b64(),
      [NOEGLE_ID_ENV]: "k2",
      [TIDLIGERE_NOEGLER_ENV]: `k1:${k1}`,
    });
    expect(dekrypter(gammel, ny)).toBe("lss_gammel");
    expect(noegleId(krypter("lss_ny", ny))).toBe("k2");
    // Fjernes k1, kan den gamle ikke læses — det er meningen.
    expect(dekrypter(gammel, noeglering({ [NOEGLE_ENV]: b64(), [NOEGLE_ID_ENV]: "k2" }))).toBeNull();
  });

  it("ugyldige id'er og dubletter i ringen afvises", () => {
    expect(() => noeglering(miljoe({ [NOEGLE_ID_ENV]: "v1" }))).toThrow(CommerceNoegleFejl);
    expect(() => noeglering(miljoe({ [TIDLIGERE_NOEGLER_ENV]: `k1:${b64()}` }))).toThrow(CommerceNoegleFejl);
    expect(() => noeglering(miljoe({ [NOEGLE_ID_ENV]: "k2", [TIDLIGERE_NOEGLER_ENV]: "k1:kort" }))).toThrow(CommerceNoegleFejl);
  });
});

describe("nøglen er bundet til sin integration (AES-GCM AAD)", () => {
  it("en chiffertekst til integration A kan ikke dekrypteres som B", () => {
    const ring = noeglering(miljoe());
    const c = krypterMed("lss_a", A, ring);
    expect(dekrypterMed(c, A, ring)).toBe("lss_a");
    expect(dekrypterMed(c, B, ring)).toBeNull();
  });

  it("ombytning i basen: B's række med A's chiffertekst giver ingen nøgle", () => {
    const ring = noeglering(miljoe());
    const raekker = { [A]: krypterMed("lss_a", A, ring), [B]: krypterMed("lss_b", B, ring) };
    const byttet = { [A]: raekker[B], [B]: raekker[A] };
    expect(dekrypterMed(byttet[B], B, ring)).toBeNull();
    expect(dekrypterMed(byttet[A], A, ring)).toBeNull();
  });

  it("id'et er ikke valgfrit og skal være et UUID", () => {
    const ring = noeglering(miljoe());
    expect(() => krypterMed("x", "", ring)).toThrow();
    expect(() => krypterMed("x", "ikke-et-uuid", ring)).toThrow();
  });

  it("rotation k1 → k2 bevarer bindingen: samme integration læser, en anden ikke", () => {
    const k1 = b64();
    const gammel = krypterMed("lss_a", A, noeglering({ [NOEGLE_ENV]: k1 }));
    const ny = noeglering({ [NOEGLE_ENV]: b64(), [NOEGLE_ID_ENV]: "k2", [TIDLIGERE_NOEGLER_ENV]: `k1:${k1}` });
    const klartekst = dekrypterMed(gammel, A, ny);
    expect(klartekst).toBe("lss_a");
    const omkrypteret = krypterMed(klartekst!, A, ny);
    expect(noegleId(omkrypteret)).toBe("k2");
    expect(dekrypterMed(omkrypteret, A, ny)).toBe("lss_a");
    expect(dekrypterMed(omkrypteret, B, ny)).toBeNull();
    expect(dekrypterMed(gammel, B, ny)).toBeNull();
  });

  it("en ødelagt chiffertekst giver null — aldrig en undtagelse med indhold", () => {
    const ring = noeglering(miljoe());
    for (const x of ["", "k1", "k1.a.b", "k9.a.b.c", "k1.!!.??.**"]) {
      expect(dekrypterMed(x, A, ring)).toBeNull();
    }
  });
});
