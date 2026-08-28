import { describe, it, expect } from "vitest";
import { bestillingsSti } from "./bestillings-sti";
import { KATALOG, MAX_QTY } from "./constants";

/**
 * Adressen ender i en Location-header efter en POST, som enhver kan sende.
 * Derfor er det ikke nok, at den virker for en almindelig kunde — den skal
 * afvise alt andet end en vare fra kataloget.
 */
describe("bestillingsSti", () => {
  const vare = KATALOG[0].slug;

  it("bevarer vare og antal", () => {
    expect(bestillingsSti(vare, "3")).toBe(`/bestil?produkt=${vare}&antal=3`);
  });

  it("giver ingen adresse uden en vare", () => {
    expect(bestillingsSti(null, "3")).toBeNull();
    expect(bestillingsSti("", "3")).toBeNull();
    expect(bestillingsSti(undefined, undefined)).toBeNull();
  });

  it("afviser en vare, der ikke står i kataloget", () => {
    // Tilkøbet "Ekstra stander" har ingen produktside og hører ikke til her.
    expect(bestillingsSti("ekstra-stander", "1")).toBeNull();
    expect(bestillingsSti("findes-ikke", "1")).toBeNull();
  });

  /*
   * DET FARLIGE FELT. Værdien er en streng fra en formular, og den bliver til
   * en adresse. Går den udenom katalogopslaget, kan den sende nogen hvorhen
   * som helst.
   */
  it("kan ikke bruges til at sende nogen et andet sted hen", () => {
    for (const ondt of [
      "//eksempel.dk",
      "https://eksempel.dk",
      "/dashboard",
      "../admin",
      `${KATALOG[0].slug}&noget=andet`,
    ]) {
      expect(bestillingsSti(ondt, "1"), ondt).toBeNull();
    }
  });

  it("klipper antallet til det, bestillingen tager imod", () => {
    expect(bestillingsSti(vare, "0")).toContain("antal=1");
    expect(bestillingsSti(vare, "-5")).toContain("antal=1");
    expect(bestillingsSti(vare, "abc")).toContain("antal=1");
    expect(bestillingsSti(vare, "4000")).toContain(`antal=${MAX_QTY}`);
    expect(bestillingsSti(vare, "2.9")).toContain("antal=2");
  });
});
