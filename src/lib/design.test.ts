import { describe, it, expect } from "vitest";
import {
  designFrontfarve,
  kanTrykkes,
  skalBetaleFrontfarve,
  type DesignValg,
} from "./design";
import { EGEN_FRONTFARVE_PRIS } from "./stander-tilvalg";
import { getProduct, priceFor } from "./constants";

/**
 * Reglen om ikke at betale to gange for den samme opsætning.
 *
 * Fejlen den forhindrer er af den slags, kunden opdager før os: de bestiller
 * tyve skilte mere magen til dem, de har, og bliver opkrævet et tillæg for en
 * farve, der blev valgt for et halvt år siden.
 */
function design(over: Partial<DesignValg> = {}): DesignValg {
  return {
    stander_farve: "sort",
    front_type: "matcher",
    front_hex: null,
    frontfarve_betalt: false,
    ...over,
  };
}

describe("tillægget for egen frontfarve", () => {
  it("opkræves første gang et design med egen farve bestilles", () => {
    expect(
      skalBetaleFrontfarve(
        design({ front_type: "egen", front_hex: "#1b916a" }),
      ),
    ).toBe(true);
  });

  it("opkræves ALDRIG igen, når designet genbestilles", () => {
    expect(
      skalBetaleFrontfarve(
        design({
          front_type: "egen",
          front_hex: "#1b916a",
          frontfarve_betalt: true,
        }),
      ),
    ).toBe(false);
  });

  it("opkræves aldrig for et design, der følger standerens farve", () => {
    expect(skalBetaleFrontfarve(design())).toBe(false);
    expect(skalBetaleFrontfarve(design({ frontfarve_betalt: true }))).toBe(false);
  });

  it("opkræves igen for et NYT design med egen farve", () => {
    // Genbrug er gratis; en ny opsætning er en ny opsætning.
    const foerste = design({
      front_type: "egen",
      front_hex: "#1b916a",
      frontfarve_betalt: true,
    });
    const nyt = design({ front_type: "egen", front_hex: "#ffb700" });
    expect(skalBetaleFrontfarve(foerste)).toBe(false);
    expect(skalBetaleFrontfarve(nyt)).toBe(true);
  });
});

describe("prisen på en genbestilling", () => {
  const stander = getProduct("ekstra-stander")!;

  it("koster kun standerne, når designet er betalt", () => {
    const d = design({
      front_type: "egen",
      front_hex: "#1b916a",
      frontfarve_betalt: true,
    });
    const pris = priceFor(stander, 20, {
      egenFrontfarve: skalBetaleFrontfarve(d),
    });
    expect(pris.frontfarve).toBe(0);
    expect(pris.oneTimeTotal).toBe(pris.standTotal);
  });

  it("koster standerne plus tillægget første gang", () => {
    const d = design({ front_type: "egen", front_hex: "#1b916a" });
    const pris = priceFor(stander, 20, {
      egenFrontfarve: skalBetaleFrontfarve(d),
    });
    expect(pris.frontfarve).toBe(EGEN_FRONTFARVE_PRIS);
    expect(pris.oneTimeTotal).toBe(pris.standTotal + EGEN_FRONTFARVE_PRIS);
  });

  it("giver stadig mængderabat på selve standerne", () => {
    // Rabatten hører til enheden og forsvinder ikke, fordi tillægget er væk.
    const d = design({ frontfarve_betalt: true });
    const pris = priceFor(stander, 20, {
      egenFrontfarve: skalBetaleFrontfarve(d),
    });
    expect(pris.discountPct).toBeGreaterThan(0);
  });
});

describe("hvad der faktisk trykkes", () => {
  it("bruger kundens farve, når designet har en", () => {
    const f = designFrontfarve(
      design({ front_type: "egen", front_hex: "#1b916a" }),
    );
    expect(f.egen).toBe(true);
    expect(f.hex).toBe("#1b916a");
  });

  it("ignorerer en hex på et design, der følger standeren", () => {
    // Et gammelt felt, der er blevet stående efter kunden slog tilvalget fra,
    // må ikke komme til at bestemme trykket.
    const f = designFrontfarve(
      design({ front_type: "matcher", front_hex: "#1b916a" }),
    );
    expect(f.egen).toBe(false);
    expect(f.hex).toBe("#111111");
  });

  it("falder tilbage frem for at trykke sort på sort", () => {
    const daarligt = design({ front_type: "egen", front_hex: null });
    expect(designFrontfarve(daarligt).hex).toBe("#111111");
    // ... men designet regnes som i stykker, så det opdages her og ikke i
    // trykkeriet.
    expect(kanTrykkes(daarligt)).toBe(false);
  });

  it("regner et almindeligt design som trykklart", () => {
    expect(kanTrykkes(design())).toBe(true);
    expect(kanTrykkes(design({ front_type: "egen", front_hex: "#abc" }))).toBe(
      true,
    );
  });
});
