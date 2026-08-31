import { describe, it, expect } from "vitest";
import {
  EGEN_FRONTFARVE_PRIS,
  erGyldigHex,
  farveTillaegTekst,
  frontFarve,
  normaliserHex,
  SORT_STANDER_TILLAEG,
  STANDARD_STANDERFARVE,
  STANDER_FARVER,
  standerTillaeg,
} from "./stander-tilvalg";
import { getProduct, priceFor, VOLUME_DISCOUNTS } from "./constants";

/**
 * Prisen hænger på ét spørgsmål: har kunden valgt sin egen frontfarve?
 * Regnede brugerfladen og serveren hver for sig, kunne kunden se "følger
 * standeren" og alligevel blive opkrævet tillægget — eller omvendt.
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

/**
 * DE TO TILLÆG OPFØRER SIG MODSAT, og det er hele pointen med disse prøver.
 *
 * Frontfarven er én opsætning i trykket: én gang, ingen rabat. Sort akryl er
 * et EMNE: pr. stander, med rabat. Bytter de to regler plads, opdages det
 * ikke på en ordre med ét skilt — kun på en med tyve.
 */
describe("tillægget for sort stander", () => {
  const stander = getProduct("reviewstander")!;

  it("er hvid der er standardfarven — den koster ikke ekstra", () => {
    // En standardfarve med tillæg ville lægge penge på hver eneste ordre fra
    // en kunde, der bare klikkede videre.
    expect(STANDARD_STANDERFARVE).toBe("hvid");
    expect(standerTillaeg("hvid")).toBe(0);
    expect(standerTillaeg("sort")).toBe(SORT_STANDER_TILLAEG);
  });

  it("opkræves aldrig, når farven ikke er oplyst", () => {
    // Et kald uden viden om farven må falde tilbage på grundudgaven.
    const uden = priceFor(stander, 3);
    const hvid = priceFor(stander, 3, { standerFarve: "hvid" });
    expect(uden.farveTillaeg).toBe(0);
    expect(uden.oneTimeTotal).toBe(hvid.oneTimeTotal);
  });

  it("lægges på HVER stander — modsat frontfarven", () => {
    for (const antal of [1, 3, 20]) {
      const sort = priceFor(stander, antal, { standerFarve: "sort" });
      const hvid = priceFor(stander, antal, { standerFarve: "hvid" });
      const rabat = 1 - sort.discountPct / 100;

      // Forskellen vokser med antallet. Var tillægget pr. ordre, ville den
      // være det samme beløb ved 1 og ved 20.
      expect(sort.standTotal - hvid.standTotal, `${antal} stk.`).toBe(
        Math.round((stander.price + SORT_STANDER_TILLAEG) * rabat) * antal -
          Math.round(stander.price * rabat) * antal,
      );
    }

    const en = priceFor(stander, 1, { standerFarve: "sort" });
    const tyve = priceFor(stander, 20, { standerFarve: "sort" });
    expect(tyve.standTotal - priceFor(stander, 20).standTotal).toBeGreaterThan(
      en.standTotal - priceFor(stander, 1).standTotal,
    );
  });

  it("får samme mængderabat som standeren selv", () => {
    for (const trin of VOLUME_DISCOUNTS.filter((d) => d.discountPct > 0)) {
      const pris = priceFor(stander, trin.minQty, { standerFarve: "sort" });
      expect(pris.standUnit, `${trin.minQty} stk.`).toBe(
        Math.round(
          (stander.price + SORT_STANDER_TILLAEG) *
            (1 - trin.discountPct / 100),
        ),
      );
    }
  });

  it("ligger i enhedsprisen og lægges ikke til en gang til", () => {
    // `farveTillaeg` er til visning. Talte totalen den med igen, ville sort
    // koste dobbelt.
    const sort = priceFor(stander, 4, { standerFarve: "sort" });
    expect(sort.standUnitBase).toBe(stander.price + SORT_STANDER_TILLAEG);
    expect(sort.farveTillaeg).toBe(SORT_STANDER_TILLAEG);
    expect(sort.oneTimeTotal).toBe(
      sort.standTotal + sort.setup + sort.frontfarve,
    );
  });

  it("gælder kun varer med et fysisk skilt", () => {
    // En digital vare har intet emne at farve — samme betingelse som
    // frontfarven, så de to tilvalg ikke kan komme til at være uenige.
    const digital = { ...stander, kunDigital: true };
    const pris = priceFor(digital, 2, {
      standerFarve: "sort",
      egenFrontfarve: true,
    });
    expect(pris.farveTillaeg).toBe(0);
    expect(pris.frontfarve).toBe(0);
    expect(pris.standUnitBase).toBe(stander.price);
  });

  it("kan lægges oven i frontfarven uden at de blandes sammen", () => {
    const begge = priceFor(stander, 10, {
      standerFarve: "sort",
      egenFrontfarve: true,
    });
    // Frontfarven står stadig alene og uden rabat.
    expect(begge.frontfarve).toBe(EGEN_FRONTFARVE_PRIS);
    expect(begge.oneTimeTotal).toBe(begge.standTotal + EGEN_FRONTFARVE_PRIS);
  });

  it("siger sin pris ved valget — også når den er nul", () => {
    // Står der ingenting ved hvid, ligner tillægget ved sort en fejl.
    expect(farveTillaegTekst("sort")).toContain(String(SORT_STANDER_TILLAEG));
    expect(farveTillaegTekst("hvid")).not.toContain(
      String(SORT_STANDER_TILLAEG),
    );
    expect(farveTillaegTekst("hvid")).toBeTruthy();
  });
});
