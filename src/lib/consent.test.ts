import { describe, it, expect } from "vitest";
import {
  parseConsent,
  serializeConsent,
  shouldAskForConsent,
  mayLoadAnalytics,
  CONSENT_VERSION,
} from "./consent";

const JA = serializeConsent(true);
const NEJ = serializeConsent(false);

describe("parseConsent", () => {
  it("læser et gemt valg", () => {
    expect(parseConsent(JA)?.analytics).toBe(true);
    expect(parseConsent(NEJ)?.analytics).toBe(false);
  });

  it("behandler beskadiget indhold som ingen stillingtagen", () => {
    // At kaste her ville vælte hele siden på grund af én ødelagt streng.
    expect(parseConsent("{ikke json")).toBeNull();
    expect(parseConsent("null")).toBeNull();
    expect(parseConsent("")).toBeNull();
    expect(parseConsent(null)).toBeNull();
  });

  it("ugyldiggør et valg fra en ældre version", () => {
    // Ellers ville et gammelt ja stiltiende dække noget nyt, vi er begyndt at
    // spørge om.
    const gammelt = JSON.stringify({
      version: CONSENT_VERSION - 1,
      analytics: true,
      decidedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(parseConsent(gammelt)).toBeNull();
  });
});

describe("shouldAskForConsent", () => {
  it("spørger kun, når der er noget at samtykke til", () => {
    // Ingen GA opsat = vi sætter intet på enheden. Et banner ville spørge om
    // lov til ingenting.
    expect(shouldAskForConsent(undefined, null)).toBe(false);
    expect(shouldAskForConsent("", null)).toBe(false);
    expect(shouldAskForConsent("G-123", null)).toBe(true);
  });

  it("spørger ikke igen, når der er taget stilling", () => {
    expect(shouldAskForConsent("G-123", parseConsent(JA))).toBe(false);
    expect(shouldAskForConsent("G-123", parseConsent(NEJ))).toBe(false);
  });
});

describe("mayLoadAnalytics", () => {
  it("kræver BÅDE et opsat GA og et aktivt ja", () => {
    expect(mayLoadAnalytics("G-123", parseConsent(JA))).toBe(true);
    expect(mayLoadAnalytics("G-123", parseConsent(NEJ))).toBe(false);
    expect(mayLoadAnalytics("G-123", null)).toBe(false);
    expect(mayLoadAnalytics(undefined, parseConsent(JA))).toBe(false);
  });

  it("indlæser ikke, mens der ikke er taget stilling", () => {
    // Det er hele pointen: intet må sendes til Google, før brugeren har sagt ja.
    expect(mayLoadAnalytics("G-123", null)).toBe(false);
  });
});
