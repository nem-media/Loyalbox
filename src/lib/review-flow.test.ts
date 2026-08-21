import { describe, it, expect } from "vitest";
import {
  reviewChoices,
  commentPrompt,
  PRIVATE_CHOICE_KEY,
  type PublicLink,
} from "./review-flow";

/**
 * Bekræfter reglen om anmeldelses-neutralitet: kunden får de SAMME valg med
 * SAMME vægt, uanset hvor mange stjerner der blev sat.
 *
 * Testen findes, fordi den gamle fejl var usynlig i koden — en `isHappy`-
 * variabel og to grene, der hver især så rimelige ud. Se kommentaren øverst i
 * review-flow.ts for hvorfor det er ulovligt.
 */
describe("anmeldelses-neutralitet", () => {
  const links: PublicLink[] = [
    { type: "google", url: "https://g.example/anmeld", platform: "Google" },
    { type: "trustpilot", url: "https://tp.example/anmeld", platform: "Trustpilot" },
  ];
  const alleBedoemmelser = [1, 2, 3, 4, 5];

  it("kan ikke sortere efter bedømmelsen — den får den ikke at vide", () => {
    // Den stærkeste garanti, der findes: funktionen tager præcis ét argument,
    // platformene. Tilføjer nogen stjernerne som parameter, fejler denne test,
    // og ændringen skal begrundes frem for at glide igennem som en if-sætning.
    expect(reviewChoices).toHaveLength(1);
  });

  it("giver alle valg samme vægt", () => {
    for (const choice of reviewChoices(links)) {
      expect(choice.weight).toBe("primary");
    }
  });

  it("tilbyder altid både de offentlige platforme og feedback direkte", () => {
    const choices = reviewChoices(links);
    expect(choices.filter((c) => c.kind === "public").map((c) => c.key)).toEqual([
      "google",
      "trustpilot",
    ]);
    expect(choices.filter((c) => c.kind === "private")).toHaveLength(1);
  });

  it("tilbyder feedback direkte, også når butikken ikke har valgt en platform", () => {
    const choices = reviewChoices([]);
    expect(choices).toHaveLength(1);
    expect(choices[0].key).toBe(PRIVATE_CHOICE_KEY);
  });

  it("lader offentlige valg beholde deres adresse, og private have ingen", () => {
    for (const choice of reviewChoices(links)) {
      if (choice.kind === "public") expect(choice.url).toMatch(/^https:\/\//);
      else expect(choice.url).toBeUndefined();
    }
  });

  it("spørger forskelligt, men nævner aldrig en platform", () => {
    const platforme = /google|trustpilot|tripadvisor|facebook|anmeld/i;
    const tekster = alleBedoemmelser.map(commentPrompt);

    for (const tekst of tekster) {
      expect(tekst.length).toBeGreaterThan(10);
      expect(tekst).not.toMatch(platforme);
    }
    // En utilfreds kunde må ikke spørges, hvad der gjorde oplevelsen god.
    expect(commentPrompt(1)).not.toBe(commentPrompt(5));
  });
});
