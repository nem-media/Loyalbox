import { describe, it, expect } from "vitest";
import {
  EARN_MODEL_LABELS,
  REWARD_TYPE_LABELS,
  REVIEW_INDEPENDENCE_NOTICE,
} from "./constants";

/**
 * Bekræfter den kritiske regel: belønninger/stempler må ALDRIG betinges af en
 * offentlig anmeldelse. Testen fejler, hvis nogen tilføjer en optjenings-model
 * eller belønningstype, der knytter optjening til en review-handling.
 */
describe("anmeldelses-uafhængighed", () => {
  const forbidden = /google|trustpilot|tripadvisor|facebook|anmeldel|review|stjern|rating/i;

  it("optjenings-modeller er ikke knyttet til anmeldelser", () => {
    for (const [key, label] of Object.entries(EARN_MODEL_LABELS)) {
      expect(key).not.toMatch(forbidden);
      expect(label).not.toMatch(forbidden);
    }
    // Præcist det forventede, review-uafhængige sæt.
    expect(Object.keys(EARN_MODEL_LABELS).sort()).toEqual(
      ["campaign", "manual", "per_amount", "per_purchase", "per_visit"].sort(),
    );
  });

  it("belønningstyper er ikke knyttet til anmeldelser", () => {
    for (const key of Object.keys(REWARD_TYPE_LABELS)) {
      expect(key).not.toMatch(forbidden);
    }
  });

  it("advarslen om anmeldelses-uafhængighed findes", () => {
    expect(REVIEW_INDEPENDENCE_NOTICE).toMatch(/anmeldelse/i);
    expect(REVIEW_INDEPENDENCE_NOTICE.length).toBeGreaterThan(20);
  });
});
