import { describe, it, expect } from "vitest";
import {
  parseConsent,
  serializeConsent,
  shouldAskForConsent,
  hasSomethingToAskAbout,
  mayLoadStatistics,
  mayLoadMarketing,
  CONSENT_VERSION,
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
