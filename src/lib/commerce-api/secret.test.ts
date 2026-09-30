import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CommerceNoegleFejl,
  commerceKrypteringKlar,
  dekrypter,
  krypter,
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
