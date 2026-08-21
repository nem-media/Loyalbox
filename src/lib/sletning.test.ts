import { describe, it, expect } from "vitest";
import {
  bekraeftetMail,
  bestiltMail,
  navnPasser,
  nytToken,
  tokenPasser,
  udfoeresDen,
  udfoertMail,
} from "./sletning";
import { SLETNING_ANGREFRIST_DAGE } from "./abonnement";

/**
 * Bekræfter spærrerne omkring en sletning, der ikke kan gøres om.
 *
 * Det er den eneste handling i systemet, hvor en fejl ikke kan rettes
 * bagefter — hverken af kunden eller af os.
 */
describe("spærrer mod utilsigtet sletning", () => {
  it("laver et token, der ikke kan gættes, og som er nyt hver gang", () => {
    const a = nytToken();
    const b = nytToken();
    expect(a).toHaveLength(64); // 32 bytes i hex
    expect(a).not.toBe(b);
  });

  it("godtager kun det rigtige token", () => {
    const token = nytToken();
    expect(tokenPasser(token, token)).toBe(true);
    expect(tokenPasser(token, nytToken())).toBe(false);
    // De tomme tilfælde er de farlige: et manglende token må aldrig passe
    // til et manglende token.
    expect(tokenPasser(null, null)).toBe(false);
    expect(tokenPasser("", "")).toBe(false);
    expect(tokenPasser(token, null)).toBe(false);
    expect(tokenPasser(token, token.slice(0, -1))).toBe(false);
  });

  it("tilgiver store bogstaver og mellemrum i firmanavnet, men intet andet", () => {
    expect(navnPasser("  cafe hjørnet ", "Café Hjørnet")).toBe(false); // é er ikke e
    expect(navnPasser(" café hjørnet ", "Café Hjørnet")).toBe(true);
    expect(navnPasser("CAFÉ HJØRNET", "Café Hjørnet")).toBe(true);
    expect(navnPasser("Café Hjørne", "Café Hjørnet")).toBe(false);
    expect(navnPasser("", "Café Hjørnet")).toBe(false);
  });

  it("lægger angrefristen til, når sletningen bekræftes", () => {
    const nu = new Date("2026-08-21T10:00:00.000Z");
    const dato = udfoeresDen(nu);
    const dage = Math.round((dato.getTime() - nu.getTime()) / 86_400_000);
    expect(dage).toBe(SLETNING_ANGREFRIST_DAGE);
  });
});

describe("mails om sletning", () => {
  const link = "https://loyalsum.dk/dashboard/abonnement/slet/bekraeft?token=abc";

  it("siger hvad der slettes, før den beder om en bekræftelse", () => {
    const { tekst } = bestiltMail("Café Hjørnet", link);
    expect(tekst.indexOf("stempelkort")).toBeLessThan(tekst.indexOf(link));
    expect(tekst).toContain("kan ikke fortrydes");
    expect(tekst).toContain(link);
  });

  it("siger i alle tre mails, at fakturaerne bliver gemt", () => {
    // Et løfte om at slette ALT ville være usandt: bogføringsloven kræver
    // regnskabsmaterialet i fem år. Det skal stå hver gang, ikke kun én gang.
    const alle = [
      bestiltMail("Café Hjørnet", link).tekst,
      bekraeftetMail("Café Hjørnet", new Date(), link).tekst,
      udfoertMail("Café Hjørnet").tekst,
    ];
    // Mail 2 handler om fristen og gentager ikke bogføringen — de to andre er
    // dem, hvor kunden tager stilling, og dér skal forbeholdet stå.
    expect(alle[0]).toMatch(/bogføringsloven/i);
    expect(alle[2]).toMatch(/bogføringsloven/i);
  });

  it("giver en menneskelig udvej i hver mail", () => {
    const dato = new Date("2026-09-01T10:00:00.000Z");
    for (const mail of [
      bestiltMail("Café Hjørnet", link),
      bekraeftetMail("Café Hjørnet", dato, link),
      udfoertMail("Café Hjørnet"),
    ]) {
      expect(mail.tekst).toContain("kontakt@loyalsum.dk");
      expect(mail.emne).toContain("Café Hjørnet");
    }
  });

  it("sætter datoen i emnet, så mailen kan findes igen", () => {
    const { emne } = bekraeftetMail(
      "Café Hjørnet",
      new Date("2026-09-01T10:00:00.000Z"),
      link,
    );
    expect(emne).toContain("1. september 2026");
  });
});
