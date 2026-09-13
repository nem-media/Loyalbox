import { describe, it, expect } from "vitest";
import {
  UPCOMING_MERCH,
  harPris,
  formatMaal,
  A_FORMAT_MM,
  PRODUCTS,
  KATALOG,
} from "./constants";
import { UPCOMING_ICONS } from "@/components/product-placeholder";

/**
 * Materialer på vej.
 *
 * DET FARLIGE VED LISTEN ER, AT DEN SER UD SOM ET KATALOG. Den står på en
 * offentlig side med navne, formater og — for nogle varer — priser, men
 * ingen af dem kan købes. Prøverne her holder de to ting adskilt: et tal må
 * kun stå, når det er besluttet, og en vare må ikke kunne bestilles, før den
 * er flyttet over i PRODUCTS.
 */

describe("listen over kommende materialer", () => {
  it("har unikke nøgler og et ikon til hver", () => {
    // Nøglen slår ikonet op. Uden et ikon render kortet et tomt felt, og det
    // opdages ikke af typerne: opslaget giver bare `undefined`.
    const noegler = UPCOMING_MERCH.map((m) => m.key);
    expect(new Set(noegler).size).toBe(noegler.length);
    for (const m of UPCOMING_MERCH) {
      expect(UPCOMING_ICONS[m.key], `ikon mangler for ${m.key}`).toBeTruthy();
    }
  });

  it("har mindst én størrelse pr. vare", () => {
    for (const m of UPCOMING_MERCH) {
      expect(m.stoerrelser.length, m.key).toBeGreaterThan(0);
    }
  });

  it("ingen af dem kan bestilles", () => {
    /*
      Det er dét, der gør listen ufarlig at vise med priser: varerne står
      ikke i PRODUCTS, og derfor findes de hverken i kataloget, i sitemappet,
      som produktside eller i checkouten. En pris gør dem ikke købbare.
    */
    const slugs = new Set(PRODUCTS.map((p) => p.slug));
    const katalog = new Set(KATALOG.map((p) => p.slug));
    for (const m of UPCOMING_MERCH) {
      expect(slugs.has(m.key), `${m.key} er havnet i PRODUCTS`).toBe(false);
      expect(katalog.has(m.key), `${m.key} er havnet i KATALOG`).toBe(false);
    }
  });
});

describe("priser på kommende varer", () => {
  it("en pris er et helt, positivt kronebeløb", () => {
    // Et tal her vises til kunder. Et nul eller en ører-værdi ville blive
    // trykt som en rigtig pris, før nogen nåede at opdage det.
    for (const m of UPCOMING_MERCH) {
      for (const st of m.stoerrelser) {
        if (st.pris === undefined) continue;
        expect(Number.isInteger(st.pris), `${m.key} ${st.format}`).toBe(true);
        expect(st.pris).toBeGreaterThan(0);
      }
    }
  });

  it("harPris() svarer ja præcis når mindst ét format har et beløb", () => {
    // Kortet vælger tekst på den: enten formater MED beløb, eller "Planlagt
    // i …" og "Pris annonceres senere". De to må ikke kunne blandes.
    for (const m of UPCOMING_MERCH) {
      const forventet = m.stoerrelser.some((st) => st.pris !== undefined);
      expect(harPris(m), m.key).toBe(forventet);
    }
  });

  it("papirplakaten koster 99 i A4 og findes ikke i A5", () => {
    // Priserne skrives ned, så en omskrivning af listen ikke stille kan
    // ændre et beløb, der er meldt ud.
    const plakat = UPCOMING_MERCH.find((m) => m.key === "plakater");
    expect(plakat?.stoerrelser).toEqual([{ format: "A4", pris: 99 }]);
  });

  it("den selvklæbende koster 149 i A4 og 129 i A5", () => {
    const selv = UPCOMING_MERCH.find((m) => m.key === "selvklaebende");
    expect(selv?.stoerrelser).toEqual([
      { format: "A4", pris: 149 },
      { format: "A5", pris: 129 },
    ]);
  });

  it("papirplakaten er billigere end den selvklæbende i samme format", () => {
    /*
      DET ER HELE GRUNDEN TIL, AT BEGGE FINDES. Papiret skal tapes op eller i
      en ramme; den selvklæbende gør det selv. Står de tæt på hinanden, har
      papirplakaten ingen grund til at eksistere — dét var den fejl, der
      sendte den fra 139 ned til 99.
    */
    const papir = UPCOMING_MERCH.find((m) => m.key === "plakater")
      ?.stoerrelser[0];
    const selv = UPCOMING_MERCH.find((m) => m.key === "selvklaebende")
      ?.stoerrelser.find((st) => st.format === "A4");
    expect(papir!.pris!).toBeLessThan(selv!.pris!);
    expect(selv!.pris! - papir!.pris!).toBeGreaterThanOrEqual(40);
  });

  it("et ark mærkater er billigere end den mindste selvklæbende", () => {
    /*
      Til 99 kostede A5-selvklæbende det samme som fire A6-mærkater og gav
      det halve materiale — og begge sælges til ruden. Prøven holder fast i,
      at de to ikke igen kan ende på samme pris.
    */
    const ark = UPCOMING_MERCH.find((m) => m.key === "maerkater")
      ?.stoerrelser[0];
    const mindsteSelv = UPCOMING_MERCH.find((m) => m.key === "selvklaebende")
      ?.stoerrelser.at(-1);
    expect(ark!.pris!).toBeLessThan(mindsteSelv!.pris!);
  });

  it("mærkaterne koster 99 for både fire A6 og otte A7", () => {
    // De to pakker dækker samme areal — én A4 — og skal derfor koste det
    // samme. Ændres en pakkestørrelse uden prisen, er de pludselig uenige om,
    // hvad et ark materiale koster.
    const m = UPCOMING_MERCH.find((x) => x.key === "maerkater");
    expect(m?.stoerrelser).toEqual([
      { format: "A6", pris: 99, antal: 4 },
      { format: "A7", pris: 99, antal: 8 },
      { format: "A7", pris: 249, antal: 24 },
    ]);
  });

  it("storpakken er billigere pr. stk. end den lille", () => {
    // 24 stk. er tre ark, som efter arkprisen ville koste 297. Er 249 ikke
    // lavere pr. stk., er der ingen grund til at købe den store.
    const rk = UPCOMING_MERCH.find((x) => x.key === "maerkater")!.stoerrelser;
    const lille = rk.find((st) => st.antal === 8)!;
    const stor = rk.find((st) => st.antal === 24)!;
    expect(stor.pris! / stor.antal!).toBeLessThan(lille.pris! / lille.antal!);
  });

  it("to rækker kan dele format, men ikke format OG antal", () => {
    // Kortet bruger `format-antal` som React-nøgle, netop fordi A7 nu står
    // to gange. To ens par ville give to rækker samme nøgle.
    for (const m of UPCOMING_MERCH) {
      const noegler = m.stoerrelser.map((st) => `${st.format}-${st.antal ?? 1}`);
      expect(new Set(noegler).size, m.key).toBe(noegler.length);
    }
  });

  it("flyers sælges pr. 100 stk.", () => {
    const f = UPCOMING_MERCH.find((x) => x.key === "flyers");
    expect(f?.stoerrelser).toEqual([
      { format: "A5", pris: 289, antal: 100 },
      { format: "A6", pris: 189, antal: 100 },
    ]);
  });

  it("en pakke har altid et antal ved prisen", () => {
    /*
      "99 kr." uden et antal læses som stykprisen. Står der et antal i data,
      skal prisen dække netop dét antal — og omvendt må et antal aldrig stå
      alene uden en pris, for så er det et løfte om en pakke til ingen pris.
    */
    for (const m of UPCOMING_MERCH) {
      for (const st of m.stoerrelser) {
        if (st.antal === undefined) continue;
        expect(st.antal, `${m.key} ${st.format}`).toBeGreaterThan(1);
        expect(st.pris, `${m.key} ${st.format}`).toBeDefined();
      }
    }
  });

  it("de varer, der ikke er meldt ud, har INGEN pris", () => {
    // Alle fire HAR en pris i dag. Prøven holder reglen fast for den næste
    // vare, der kommer til: et gæt må ligge i en kommentar, aldrig i feltet.
    for (const m of UPCOMING_MERCH) {
      for (const st of m.stoerrelser) {
        if (st.pris !== undefined) continue;
        expect(st.antal, `${m.key} ${st.format}`).toBeUndefined();
      }
    }
  });
});

describe("målene i cm", () => {
  it("A-formaterne er ISO 216's egne mål", () => {
    // Skrevet af i hånden ville en tastefejl stå på siden som et produktmål.
    expect(A_FORMAT_MM.A4).toEqual([210, 297]);
    expect(A_FORMAT_MM.A5).toEqual([148, 210]);
    expect(A_FORMAT_MM.A6).toEqual([105, 148]);
    expect(A_FORMAT_MM.A7).toEqual([74, 105]);
  });

  it("hvert format, der bruges, HAR et mål", () => {
    // Uden målet render kortet en tom parentes, og typerne siger ingenting:
    // opslaget giver bare null.
    for (const m of UPCOMING_MERCH) {
      for (const st of m.stoerrelser) {
        expect(formatMaal(st.format), `${m.key} ${st.format}`).toBeTruthy();
      }
    }
  });

  it("skrives i centimeter med dansk komma og uden overflødigt nul", () => {
    expect(formatMaal("A4")).toBe("21 × 29,7 cm");
    expect(formatMaal("A6")).toBe("10,5 × 14,8 cm");
    expect(formatMaal("A7")).toBe("7,4 × 10,5 cm");
  });

  it("svarer null på et format, vi ikke kender", () => {
    expect(formatMaal("A0")).toBeNull();
  });
});
