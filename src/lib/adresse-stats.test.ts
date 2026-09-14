import { describe, it, expect } from "vitest";
import {
  grupperPrAdresse,
  efterAktivitet,
  type AdresseRaekker,
} from "./data";

/**
 * TAL PR. BUTIK.
 *
 * Det samlede tal siger ikke, hvilket sted der trækker det: 70 scanninger kan
 * være 64 det ene sted og 3 det andet, og det er præcis dét, en kæde vil vide.
 *
 * Prøverne kører uden database og uden login. Det er hele grunden til, at
 * grupperingen er skilt fra hentningen — `getAdresseStats()` læser med kundens
 * egen klient, så den kan kun afprøves ved at være en rigtig, indlogget kunde.
 */

const RAEKKER: AdresseRaekker = {
  stands: [
    { id: "a", name: "Butik Aarhus" },
    { id: "b", name: "Butik Odense" },
    { id: "c", name: "Kiosken" },
  ],
  scans: [
    { stand_id: "a" },
    { stand_id: "a" },
    { stand_id: "a" },
    { stand_id: "b" },
  ],
  feedback: [
    { stand_id: "a", rating: 5, is_public_review_clicked: true },
    { stand_id: "a", rating: 3, is_public_review_clicked: false },
    { stand_id: "b", rating: 4, is_public_review_clicked: true },
  ],
};

describe("grupperPrAdresse", () => {
  it("lægger hvert tal på det sted, det kom fra", () => {
    const [aarhus, odense] = grupperPrAdresse(RAEKKER);

    expect(aarhus).toEqual({
      standId: "a",
      navn: "Butik Aarhus",
      scans: 3,
      feedback: 2,
      klik: 1,
      avgRating: 4, // (5 + 3) / 2
    });
    expect(odense.scans).toBe(1);
    expect(odense.klik).toBe(1);
    expect(odense.avgRating).toBe(4);
  });

  /**
   * ET STED UDEN AKTIVITET FALDER IKKE UD AF LISTEN.
   *
   * Det er hele pointen: en butik med nul scanninger er præcis dét, ejeren
   * skal have at vide. Filtrerede vi tomme rækker væk, ville listen kun vise
   * de steder, der klarer sig — og skjule dem, der ikke gør.
   */
  it("tager stille steder med", () => {
    const raekker = grupperPrAdresse(RAEKKER);
    expect(raekker).toHaveLength(3);

    const kiosken = raekker.find((r) => r.standId === "c")!;
    expect(kiosken.scans).toBe(0);
    expect(kiosken.feedback).toBe(0);
  });

  /**
   * INGEN BEDØMMELSER ER IKKE KARAKTEREN NUL. Et sted uden ratings har ingen
   * karakter, og et 0 ville læses som bundkarakter — værst netop dér, hvor en
   * ny butik lige er åbnet.
   */
  it("giver null og ikke nul, når ingen har bedømt", () => {
    const kiosken = grupperPrAdresse(RAEKKER).find((r) => r.standId === "c")!;
    expect(kiosken.avgRating).toBeNull();
  });

  it("tæller ikke en anden butiks rækker med", () => {
    // Den farlige fejl ville være et manglende filter: så fik hvert sted
    // virksomhedens samlede tal, og listen ville se rigtig ud uden at være det.
    const alle = grupperPrAdresse(RAEKKER);
    expect(alle.reduce((n, r) => n + r.scans, 0)).toBe(RAEKKER.scans.length);
    expect(alle.reduce((n, r) => n + r.feedback, 0)).toBe(
      RAEKKER.feedback.length,
    );
  });

  it("klarer en virksomhed helt uden steder", () => {
    expect(grupperPrAdresse({ stands: [], scans: [], feedback: [] })).toEqual(
      [],
    );
  });
});

describe("rækkefølgen", () => {
  /**
   * DER SORTERES PÅ SCANNINGER OG IKKE PÅ STJERNER.
   *
   * Et sted med to femstjernede bedømmelser ville ellers stå over et med
   * fyrre firstjernede, og listen ville svare på et andet spørgsmål end det,
   * der bliver stillet: hvor kommer der kunder.
   */
  it("sætter mest aktivitet først", () => {
    const sorteret = grupperPrAdresse(RAEKKER).sort(efterAktivitet);
    expect(sorteret.map((r) => r.navn)).toEqual([
      "Butik Aarhus",
      "Butik Odense",
      "Kiosken",
    ]);
  });

  it("lader ikke et højt gennemsnit springe køen over", () => {
    const sorteret = grupperPrAdresse({
      stands: [
        { id: "lav", name: "Mange kunder" },
        { id: "hoej", name: "Få, men glade" },
      ],
      scans: [{ stand_id: "lav" }, { stand_id: "lav" }, { stand_id: "lav" }],
      feedback: [
        { stand_id: "lav", rating: 3, is_public_review_clicked: false },
        { stand_id: "hoej", rating: 5, is_public_review_clicked: false },
      ],
    }).sort(efterAktivitet);

    expect(sorteret[0].navn).toBe("Mange kunder");
  });

  it("bruger feedback som andet kriterium ved lige mange scanninger", () => {
    const sorteret = grupperPrAdresse({
      stands: [
        { id: "tavs", name: "Tavs" },
        { id: "aktiv", name: "Aktiv" },
      ],
      scans: [{ stand_id: "tavs" }, { stand_id: "aktiv" }],
      feedback: [{ stand_id: "aktiv", rating: 4, is_public_review_clicked: false }],
    }).sort(efterAktivitet);

    expect(sorteret[0].navn).toBe("Aktiv");
  });
});
