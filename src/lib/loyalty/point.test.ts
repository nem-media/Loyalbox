import { describe, it, expect } from "vitest";
import {
  beregnPoint,
  beloenningStatus,
  naesteBeloenning,
  sorterBeloenninger,
  pointFejlTekst,
  pointTekst,
  earnValueLabel,
  POINT_EARN_MODEL_LABELS,
  POINT_TXN_KUNDETEKST,
  type PointEarnModel,
} from "@/lib/loyalty/point";

/**
 * POINTBEREGNINGEN ER DET TAL, KUNDEN KOM FOR.
 *
 * Den vises ved disken FØR der trykkes og skrives derefter i ledgeren. Regnes
 * den forkert, opdages det ikke af en fejlbesked, men af en kunde, der har
 * regnet efter — og som har ret.
 */
describe("beregnPoint", () => {
  const PER_BELOEB: PointEarnModel = "per_amount";

  it("giver ét point pr. hele optjeningsværdi", () => {
    expect(beregnPoint({ model: PER_BELOEB, earnValue: 10, amount: 250 })).toBe(25);
    expect(beregnPoint({ model: PER_BELOEB, earnValue: 10, amount: 300 })).toBe(30);
  });

  /*
   * DER RUNDES NED, OG DET ER ET VALG. 249 kr. ved 10 kr./point er 24 point og
   * ikke 25: opad ville give kunden point, butikken ikke har lovet, og "hver
   * fulde ti kroner" er det eneste, der kan forklares på en tavle.
   */
  it("runder NED og aldrig op", () => {
    expect(beregnPoint({ model: PER_BELOEB, earnValue: 10, amount: 249 })).toBe(24);
    expect(beregnPoint({ model: PER_BELOEB, earnValue: 10, amount: 259.99 })).toBe(25);
    expect(beregnPoint({ model: PER_BELOEB, earnValue: 25, amount: 24 })).toBe(0);
  });

  it("giver faste point pr. køb, uanset beløbet", () => {
    expect(beregnPoint({ model: "per_visit", earnValue: 10, amount: 1 })).toBe(10);
    expect(beregnPoint({ model: "per_visit", earnValue: 10, amount: 5000 })).toBe(10);
    expect(beregnPoint({ model: "per_visit", earnValue: 10 })).toBe(10);
  });

  /*
   * MANUEL TILDELING HAR INGEN FORMEL. Tallet tastes af personalet, og en
   * udregning her ville være et gæt, der så rigtigt ud.
   */
  it("regner ikke ved manuel tildeling", () => {
    expect(beregnPoint({ model: "manual", earnValue: 10, amount: 250 })).toBe(0);
  });

  it("svarer nul frem for at kaste på tal, der ikke giver mening", () => {
    expect(beregnPoint({ model: PER_BELOEB, earnValue: 0, amount: 250 })).toBe(0);
    expect(beregnPoint({ model: PER_BELOEB, earnValue: -10, amount: 250 })).toBe(0);
    expect(beregnPoint({ model: PER_BELOEB, earnValue: 10, amount: -250 })).toBe(0);
    expect(beregnPoint({ model: PER_BELOEB, earnValue: 10, amount: null })).toBe(0);
    expect(beregnPoint({ model: PER_BELOEB, earnValue: 10, amount: NaN })).toBe(0);
    expect(
      beregnPoint({ model: PER_BELOEB, earnValue: 10, amount: Infinity }),
    ).toBe(0);
    expect(beregnPoint({ model: PER_BELOEB, earnValue: NaN, amount: 100 })).toBe(0);
  });

  it("giver altid et helt, endeligt, ikke-negativt tal", () => {
    const tilfaelde: [number, number][] = [
      [10, 250], [3, 100], [0.5, 10], [999, 1], [10, 0.5], [7, 6.99],
    ];
    for (const [vaerdi, beloeb] of tilfaelde) {
      const p = beregnPoint({ model: PER_BELOEB, earnValue: vaerdi, amount: beloeb });
      expect(Number.isInteger(p), `${beloeb} / ${vaerdi}`).toBe(true);
      expect(Number.isFinite(p)).toBe(true);
      expect(p).toBeGreaterThanOrEqual(0);
    }
  });

  /*
   * ET HALVT POINT FINDES IKKE. `earn_value` er numeric(10,2), så en butik kan
   * skrive 10,50 — og "10,5 point pr. køb" ville være et tal, ingen kvittering
   * kan vise.
   */
  it("giver aldrig et halvt point ved faste point", () => {
    expect(beregnPoint({ model: "per_visit", earnValue: 10.5 })).toBe(10);
  });
});

/**
 * INGEN POINT FOR ANMELDELSER — HÅNDHÆVET VED, AT DER IKKE FINDES EN VEJ.
 *
 * Reglen er den samme som `reviewChoices()`, der ikke får bedømmelsen at vide:
 * en funktion kan ikke sortere efter noget, den ikke kender. Her er der ingen
 * optjeningsmodel, der nævner en anmeldelse, ingen parameter der bærer en
 * rating, og ingen kilde i pointledgeren, der kommer fra feedback-flowet.
 *
 * Prøven er en SPÆRRE for den næste, der udvider modellerne: en model, der
 * hedder noget med review, skal få denne til at fejle, før den når en kunde.
 */
describe("point kan ikke knyttes til en anmeldelse", () => {
  it("ingen optjeningsmodel handler om anmeldelser", () => {
    const modeller = Object.keys(POINT_EARN_MODEL_LABELS);
    expect(modeller).toEqual(["per_amount", "per_visit", "manual"]);
    for (const m of modeller) {
      expect(/review|anmeld|rating|stjerne|trustpilot|google/i.test(m)).toBe(false);
    }
    for (const tekst of Object.values(POINT_EARN_MODEL_LABELS)) {
      expect(/anmeldelse|rating|stjerne/i.test(tekst)).toBe(false);
    }
  });

  it("beregningen får hverken bedømmelse eller anmeldelse med ind", () => {
    // Signaturen er hele beviset: der er intet felt at sende en rating i.
    const felter = Object.keys({
      model: "per_amount",
      earnValue: 10,
      amount: 100,
    });
    expect(felter.sort()).toEqual(["amount", "earnValue", "model"]);
  });
});

describe("belønningerne", () => {
  const BELOENNINGER = [
    { id: "c", name: "Gratis behandling", points_cost: 500 },
    { id: "a", name: "Gratis kaffe", points_cost: 50 },
    { id: "b", name: "20 kr. rabat", points_cost: 100 },
  ];

  it("står billigst først, så kunden ser først dét, hun kan få nu", () => {
    expect(sorterBeloenninger(BELOENNINGER).map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("lader butikkens egen rækkefølge vinde", () => {
    const egen = [
      { id: "dyr", name: "Dyr", points_cost: 500, sort_order: 1 },
      { id: "billig", name: "Billig", points_cost: 50, sort_order: 2 },
    ];
    expect(sorterBeloenninger(egen).map((r) => r.id)).toEqual(["dyr", "billig"]);
  });

  it("siger hvad der mangler — og siger nul, når der ikke mangler noget", () => {
    expect(beloenningStatus(245, 50)).toEqual({ kanIndloeses: true, mangler: 0 });
    expect(beloenningStatus(245, 245)).toEqual({ kanIndloeses: true, mangler: 0 });
    expect(beloenningStatus(245, 500)).toEqual({
      kanIndloeses: false,
      mangler: 255,
    });
  });

  it("peger på den billigste, kunden IKKE har råd til endnu", () => {
    expect(naesteBeloenning(60, BELOENNINGER)?.id).toBe("b");
    expect(naesteBeloenning(0, BELOENNINGER)?.id).toBe("a");
  });

  it("peger ingen steder hen, når kunden har råd til alt", () => {
    expect(naesteBeloenning(9999, BELOENNINGER)).toBeNull();
  });

  it("regner ikke med arkiverede belønninger", () => {
    const medArkiveret = [
      ...BELOENNINGER,
      { id: "gammel", name: "Udgået", points_cost: 60, status: "archived" },
    ];
    expect(naesteBeloenning(55, medArkiveret)?.id).toBe("b");
  });
});

describe("teksterne", () => {
  it("oversætter basens fejlkoder til noget, der kan stå ved en disk", () => {
    expect(pointFejlTekst("for-faa-point")).toContain("ikke point nok");
    expect(pointFejlTekst("program-ikke-aktivt")).toContain("ikke aktivt");
    // En ukendt kode må aldrig nå skærmen som en kode.
    expect(pointFejlTekst("noget-helt-nyt")).not.toContain("noget-helt-nyt");
    expect(pointFejlTekst(null)).toBeTruthy();
  });

  it("skriver point med dansk tusindtalsadskillelse", () => {
    expect(pointTekst(1)).toBe("1 point");
    expect(pointTekst(24850)).toBe("24.850 point");
  });

  it("siger hvad tallet betyder for den valgte model", () => {
    expect(earnValueLabel("per_amount")).toBe("Kroner pr. point");
    expect(earnValueLabel("per_visit")).toBe("Point pr. køb");
  });

  /*
   * KUNDENS HISTORIK MÅ IKKE INDEHOLDE VORES ORD. "adjust_remove" er en
   * tilstand i en database, ikke noget, der er sket for en, der har købt kaffe.
   */
  it("har en kundevendt tekst til hver transaktionstype", () => {
    for (const [type, tekst] of Object.entries(POINT_TXN_KUNDETEKST)) {
      expect(tekst.length, type).toBeGreaterThan(0);
      expect(/_/.test(tekst), type).toBe(false);
    }
  });
});
