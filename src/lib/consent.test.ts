import { describe, it, expect } from "vitest";
import {
  parseConsent,
  serializeConsent,
  shouldAskForConsent,
  hasSomethingToAskAbout,
  mayLoadStatistics,
  mayLoadMarketing,
  CONSENT_VERSION,
  isValidLogEntry,
} from "./consent";

const ALT = serializeConsent({ statistics: true, marketing: true });
const KUN_STATISTIK = serializeConsent({ statistics: true, marketing: false });
const INTET = serializeConsent({ statistics: false, marketing: false });

const IDS = { ga: "G-123", ads: "AW-456" };

describe("parseConsent", () => {
  it("læser begge kategorier", () => {
    expect(parseConsent(ALT)).toMatchObject({ statistics: true, marketing: true });
    expect(parseConsent(KUN_STATISTIK)).toMatchObject({
      statistics: true,
      marketing: false,
    });
  });

  it("behandler beskadiget indhold som ingen stillingtagen", () => {
    expect(parseConsent("{ikke json")).toBeNull();
    expect(parseConsent("null")).toBeNull();
    expect(parseConsent(null)).toBeNull();
  });

  it("ugyldiggør et valg fra en ældre version", () => {
    // Version 1 spurgte kun om statistik. Et ja derfra må ALDRIG komme til at
    // dække marketing — derfor skal folk spørges igen.
    const gammelt = JSON.stringify({
      version: CONSENT_VERSION - 1,
      analytics: true,
      decidedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(parseConsent(gammelt)).toBeNull();
  });

  it("afviser et valg, hvor en kategori mangler", () => {
    const halvt = JSON.stringify({
      version: CONSENT_VERSION,
      statistics: true,
      decidedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(parseConsent(halvt)).toBeNull();
  });
});

describe("hasSomethingToAskAbout", () => {
  it("kræver mindst én tjeneste sat op", () => {
    expect(hasSomethingToAskAbout({})).toBe(false);
    expect(hasSomethingToAskAbout({ ga: "G-123" })).toBe(true);
    // Google Ads alene er nok: markedsføringscookies kræver også samtykke.
    expect(hasSomethingToAskAbout({ ads: "AW-456" })).toBe(true);
  });
});

describe("shouldAskForConsent", () => {
  it("spørger kun, når der er noget at samtykke til", () => {
    expect(shouldAskForConsent({}, null)).toBe(false);
    expect(shouldAskForConsent(IDS, null)).toBe(true);
  });

  it("spørger ikke igen, når der er taget stilling", () => {
    expect(shouldAskForConsent(IDS, parseConsent(ALT))).toBe(false);
    expect(shouldAskForConsent(IDS, parseConsent(INTET))).toBe(false);
  });
});

describe("hvad der må indlæses", () => {
  it("holder kategorierne adskilt", () => {
    const kun = parseConsent(KUN_STATISTIK);
    expect(mayLoadStatistics("G-123", kun)).toBe(true);
    // Et ja til statistik må ikke smitte af på annoncering.
    expect(mayLoadMarketing("AW-456", kun)).toBe(false);
  });

  it("kræver både et opsat id og et ja", () => {
    const alt = parseConsent(ALT);
    expect(mayLoadStatistics(undefined, alt)).toBe(false);
    expect(mayLoadMarketing(undefined, alt)).toBe(false);
    expect(mayLoadStatistics("G-123", alt)).toBe(true);
    expect(mayLoadMarketing("AW-456", alt)).toBe(true);
  });

  it("indlæser intet, mens der ikke er taget stilling", () => {
    expect(mayLoadStatistics("G-123", null)).toBe(false);
    expect(mayLoadMarketing("AW-456", null)).toBe(false);
  });

  it("indlæser intet efter et afvis", () => {
    const nej = parseConsent(INTET);
    expect(mayLoadStatistics("G-123", nej)).toBe(false);
    expect(mayLoadMarketing("AW-456", nej)).toBe(false);
  });
});

describe("isValidLogEntry", () => {
  const gyldig = {
    consentId: "0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0",
    version: CONSENT_VERSION,
    statistics: true,
    marketing: false,
    decidedAt: "2026-08-19T20:00:00.000Z",
    path: "/priser",
  };

  it("accepterer en rigtig post", () => {
    expect(isValidLogEntry(gyldig)).toBe(true);
  });

  it("afviser skrald — endpointet er åbent for alle", () => {
    expect(isValidLogEntry(null)).toBe(false);
    expect(isValidLogEntry("nej")).toBe(false);
    expect(isValidLogEntry({})).toBe(false);
    expect(isValidLogEntry({ ...gyldig, consentId: "ikke-et-uuid" })).toBe(false);
    expect(isValidLogEntry({ ...gyldig, statistics: "ja" })).toBe(false);
    expect(isValidLogEntry({ ...gyldig, decidedAt: "i går" })).toBe(false);
  });

  it("afviser en anden version end den gældende", () => {
    expect(isValidLogEntry({ ...gyldig, version: CONSENT_VERSION - 1 })).toBe(false);
  });

  it("afviser en sti, der ikke er intern", () => {
    // Ellers kunne loggen fyldes med fremmede adresser.
    expect(isValidLogEntry({ ...gyldig, path: "https://eksempel.dk" })).toBe(false);
    expect(isValidLogEntry({ ...gyldig, path: "x".repeat(300) })).toBe(false);
  });
});

/**
 * Samtykket skal bortfalde. Erhvervsstyrelsens cookievejledning siger, at et
 * samtykke kan udløbe og skal indhentes på ny, og privatlivspolitikken lover
 * nu, at vi spørger igen efter et år. Testen holder løftet og koden sammen.
 */
describe("samtykket udløber", () => {
  const nu = new Date("2026-08-21T10:00:00.000Z");
  const gyldigt = (decidedAt: string) =>
    JSON.stringify({
      version: CONSENT_VERSION,
      statistics: true,
      marketing: false,
      decidedAt,
    });

  it("godtager et samtykke fra i går", () => {
    expect(parseConsent(gyldigt("2026-08-20T10:00:00.000Z"), nu)).not.toBeNull();
  });

  it("godtager et samtykke, der lige akkurat ikke er et år gammelt", () => {
    expect(parseConsent(gyldigt("2025-08-22T10:00:00.000Z"), nu)).not.toBeNull();
  });

  it("afviser et samtykke på præcis et år", () => {
    expect(parseConsent(gyldigt("2025-08-21T10:00:00.000Z"), nu)).toBeNull();
  });

  it("afviser et gammelt samtykke, så der spørges igen", () => {
    expect(parseConsent(gyldigt("2024-01-01T10:00:00.000Z"), nu)).toBeNull();
  });

  it("afviser et samtykke uden brugbart tidspunkt", () => {
    // Kan vi ikke vise, hvornår der blev sagt ja, kan samtykket ikke
    // dokumenteres — og så er det ikke et samtykke.
    expect(parseConsent(gyldigt(""), nu)).toBeNull();
    expect(parseConsent(gyldigt("i går"), nu)).toBeNull();
    expect(
      parseConsent(
        JSON.stringify({ version: CONSENT_VERSION, statistics: true, marketing: false }),
        nu,
      ),
    ).toBeNull();
  });

  it("gemmer et tidspunkt, der stadig gælder med det samme", () => {
    expect(parseConsent(serializeConsent({ statistics: true, marketing: true }, nu), nu))
      .not.toBeNull();
  });
});
