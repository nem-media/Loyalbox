import { describe, it, expect } from "vitest";
import {
  EGEN_FRONTFARVE_PRIS,
  erGyldigHex,
  frontFarve,
  normaliserHex,
  STANDER_FARVER,
} from "./stander-tilvalg";
import { getProduct, priceFor } from "./constants";

/**
 * Prisen hænger på ét spørgsmål: har kunden valgt sin egen frontfarve?
 * Regnede brugerfladen og serveren hver for sig, kunne kunden se "følger
 * standeren" og alligevel blive opkrævet 139 — eller omvendt.
 */
describe("frontfarven følger standeren af sig selv", () => {
  it("giver sort front på en sort stander", () => {
    const f = frontFarve("sort");
    expect(f.egen).toBe(false);
    expect(f.hex).toBe("#111111");
    expect(f.beskrivelse).toContain("sort");
  });

  it("giver hvid front på en hvid stander", () => {
    const f = frontFarve("hvid");
    expect(f.egen).toBe(false);
    expect(f.hex).toBe("#ffffff");
    expect(f.beskrivelse).toContain("hvid");
  });

  it("bruger kundens farve, når der er valgt en", () => {
    const f = frontFarve("sort", "#1b916a");
    expect(f.egen).toBe(true);
    expect(f.hex).toBe("#1b916a");
  });

  it("falder tilbage til standerens farve UDEN tillæg ved tom eller ugyldig hex", () => {
    // Et tomt felt må ikke koste penge.
    for (const daarlig of ["", "   ", "grøn", "#12", "#1234567", null, undefined]) {
      const f = frontFarve("hvid", daarlig);
      expect(f.egen, String(daarlig)).toBe(false);
      expect(f.hex).toBe("#ffffff");
    }
  });
});

describe("hex", () => {
  it("udvider trecifret og tilføjer havelåge", () => {
    expect(normaliserHex("abc")).toBe("#aabbcc");
    expect(normaliserHex("#ABC")).toBe("#aabbcc");
    expect(normaliserHex("1B916A")).toBe("#1b916a");
    expect(normaliserHex("  #1b916a  ")).toBe("#1b916a");
  });

  it("afviser alt andet", () => {
    for (const v of ["", "xyz", "#12345", "1b916a7", "rgb(1,2,3)"]) {
      expect(normaliserHex(v), v).toBeNull();
      expect(erGyldigHex(v), v).toBe(false);
    }
  });
});

describe("prisen for egen frontfarve", () => {
  const stander = getProduct("reviewstander")!;

  it("lægges til én gang, uanset antal", () => {
    // Det er ÉN opsætning i trykket. 20 skilte af samme opsætning koster ikke
    // 20 gange tillægget.
    for (const antal of [1, 3, 20]) {
      const pris = priceFor(stander, antal, { egenFrontfarve: true });
      expect(pris.frontfarve, `${antal} stk.`).toBe(EGEN_FRONTFARVE_PRIS);
    }
  });

  it("får ingen mængderabat", () => {
    // Rabatten hører til enheden, og der er kun én opsætning.
    const mange = priceFor(stander, 20, { egenFrontfarve: true });
    expect(mange.discountPct).toBeGreaterThan(0);
    expect(mange.frontfarve).toBe(EGEN_FRONTFARVE_PRIS);
  });

  it("forsvinder straks, når tilvalget slås fra", () => {
    const uden = priceFor(stander, 3);
    expect(uden.frontfarve).toBe(0);
    expect(uden.oneTimeTotal).toBe(uden.standTotal + uden.setup);
  });

  it("indgår i det samlede engangsbeløb", () => {
    const med = priceFor(stander, 3, { egenFrontfarve: true });
    const uden = priceFor(stander, 3);
    expect(med.oneTimeTotal - uden.oneTimeTotal).toBe(EGEN_FRONTFARVE_PRIS);
  });

  it("gælder alle varer med et fysisk skilt", () => {
    // Brugerens valg: tilvalget er ikke forbeholdt Reviewstander.
    for (const slug of [
      "reviewstander",
      "reviewstander-pro",
      "loyalsum-komplet",
      "ekstra-stander",
    ]) {
      const p = priceFor(getProduct(slug)!, 1, { egenFrontfarve: true });
      expect(p.frontfarve, slug).toBe(EGEN_FRONTFARVE_PRIS);
    }
  });

  it("rører ikke månedsprisen", () => {
    const komplet = getProduct("loyalsum-komplet")!;
    expect(priceFor(komplet, 1, { egenFrontfarve: true }).monthly).toBe(
      priceFor(komplet, 1).monthly,
    );
  });
});

describe("standerfarverne", () => {
  it("er sort og hvid, begge med en hex at vise", () => {
    expect(STANDER_FARVER.map((f) => f.vaerdi)).toEqual(["sort", "hvid"]);
    for (const f of STANDER_FARVER) {
      expect(normaliserHex(f.hex), f.vaerdi).toBe(f.hex);
    }
  });
});
