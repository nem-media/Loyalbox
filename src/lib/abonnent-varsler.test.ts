import { describe, it, expect } from "vitest";
import {
  KORT_VARSEL_DAGE,
  erAlvorligt,
  kortUdloeberDen,
  varslerFor,
  type BetalingsUddrag,
} from "./abonnent-varsler";
import type { AbonnentFelter } from "./abonnenter";

/**
 * Varslerne er sidens eneste grund til at kigge på den, når alt kører.
 *
 * Det, der kan gå galt, er ikke, at de fejler — det er, at de TIER. Et varsel,
 * der ikke kommer, ligner en rask kunde, og forskellen ses først, når
 * betalingen fejler, eller når data er slettet.
 */

function firma(over: Partial<AbonnentFelter> = {}): AbonnentFelter {
  return {
    product_slug: "reviewstander-pro",
    stripe_subscription_id: "sub_1",
    stripe_status: "active",
    suspenderet_siden: null,
    ophoert_den: null,
    sletning_udfoeres_den: null,
    ...over,
  };
}

function betaling(over: Partial<BetalingsUddrag> = {}): BetalingsUddrag {
  return {
    status: "active",
    stopperVedPeriodeslut: false,
    kort: { udloebMaaned: 12, udloebAar: 2099 },
    ...over,
  };
}

const typer = (v: ReturnType<typeof varslerFor>) => v.map((x) => x.type);

describe("hvornår udløber et kort", () => {
  /**
   * ET KORT ER GYLDIGT MÅNEDEN UD. "04/2027" betyder til og med 30. april.
   * Regnes der fra den 1., varsler vi en måned for tidligt og — værre — kalder
   * et kort udløbet, mens det stadig trækker fint. Så ville nogen ringe til en
   * kunde, der ikke fejler noget.
   */
  it("regner til og med den sidste dag i måneden", () => {
    const d = kortUdloeberDen({ udloebMaaned: 4, udloebAar: 2027 });
    expect(d.toISOString()).toBe("2027-04-30T23:59:59.999Z");
  });

  /** December må ikke rulle om til januar samme år. */
  it("håndterer december uden at ryge et år tilbage", () => {
    const d = kortUdloeberDen({ udloebMaaned: 12, udloebAar: 2026 });
    expect(d.toISOString()).toBe("2026-12-31T23:59:59.999Z");
  });

  /** Skudår: februar 2028 har 29 dage. */
  it("kender skudåret", () => {
    const d = kortUdloeberDen({ udloebMaaned: 2, udloebAar: 2028 });
    expect(d.toISOString()).toBe("2028-02-29T23:59:59.999Z");
  });
});

describe("varsler", () => {
  const nu = new Date("2026-09-01T12:00:00Z");

  it("siger ingenting om en kunde, der ikke fejler noget", () => {
    expect(varslerFor(firma(), betaling(), nu)).toEqual([]);
  });

  /**
   * DEN DYRESTE. En abonnementsvare uden abonnement hos Stripe er sat op i
   * hånden i admin og aldrig faktureret. Alt ser normalt ud, der kommer ingen
   * penge ind, og intet andet i systemet siger fra.
   */
  it("fanger en abonnementsvare, der aldrig er blevet faktureret", () => {
    const v = varslerFor(
      firma({ stripe_subscription_id: null, stripe_status: null }),
      undefined,
      nu,
    );
    expect(typer(v)).toContain("ikke-faktureret");
    expect(v.every(erAlvorligt)).toBe(true);
  });

  /**
   * En tabt webhook. Stripes tal er det rigtige, og vores er det, resten af
   * systemet bygger kundens adgang på — derfor er den alvorlig og ikke en
   * note.
   */
  it("fanger at vi og Stripe siger hver sit", () => {
    const v = varslerFor(
      firma({ stripe_status: "active" }),
      betaling({ status: "past_due" }),
      nu,
    );
    expect(typer(v)).toContain("status-uenig");
    // Begge tal skal STÅ der. Et varsel, der siger "uenig" uden at sige
    // hvordan, tvinger en tur i Stripe for at forstå sin egen advarsel.
    const varsel = v.find((x) => x.type === "status-uenig")!;
    expect(varsel.detalje).toContain("active");
    expect(varsel.detalje).toContain("past_due");
  });

  it("tier, når vi og Stripe er enige", () => {
    const v = varslerFor(
      firma({ stripe_status: "past_due", suspenderet_siden: null }),
      betaling({ status: "past_due" }),
      nu,
    );
    expect(typer(v)).not.toContain("status-uenig");
  });

  it("varsler et kort, der udløber inden for fristen", () => {
    // Udløber 30. september 2026, altså 29 dage frem fra den 1.
    const v = varslerFor(
      firma(),
      betaling({ kort: { udloebMaaned: 9, udloebAar: 2026 } }),
      nu,
    );
    expect(typer(v)).toContain("kort-udloeber");
  });

  /** Uden for fristen skal der være ro. Et varsel, der altid står der, læses ikke. */
  it("tier om et kort langt ude i fremtiden", () => {
    const v = varslerFor(
      firma(),
      betaling({ kort: { udloebMaaned: 6, udloebAar: 2027 } }),
      nu,
    );
    expect(typer(v)).not.toContain("kort-udloeber");
    expect(typer(v)).not.toContain("kort-udloebet");
  });

  /**
   * GRÆNSEN SELV, fra begge sider. Kortet udløber 31. oktober; om varslet
   * kommer, afhænger af, hvilken DAG man kigger. På dag 60 skal det med, på
   * dag 61 ikke — ellers findes der en dag, hvor varslet hverken er for
   * tidligt eller for sent og alligevel udebliver.
   *
   * Regnestykket står i prøven, fordi det er tættere på, end det ser ud: fra
   * den 1. september kl. 12 til den 31. oktober ved midnat er der 60,5 dage,
   * og det RUNDER OP til 61. Et kort, der "udløber om to måneder", er altså
   * lige uden for.
   */
  it("tager kortet med på dag 60 og ikke på dag 61", () => {
    const kort = { udloebMaaned: 10, udloebAar: 2026 };
    const dage = (fra: Date) =>
      Math.ceil((kortUdloeberDen(kort).getTime() - fra.getTime()) / 86_400_000);

    const paaGraensen = new Date("2026-09-02T00:00:00Z");
    expect(dage(paaGraensen)).toBe(KORT_VARSEL_DAGE);
    expect(
      typer(varslerFor(firma(), betaling({ kort }), paaGraensen)),
    ).toContain("kort-udloeber");

    // Én dag tidligere: 61 dage, og der skal være ro.
    expect(dage(nu)).toBe(KORT_VARSEL_DAGE + 1);
    expect(typer(varslerFor(firma(), betaling({ kort }), nu))).not.toContain(
      "kort-udloeber",
    );
  });

  it("skelner et udløbet kort fra et, der snart udløber", () => {
    const v = varslerFor(
      firma(),
      betaling({ kort: { udloebMaaned: 7, udloebAar: 2026 } }),
      nu,
    );
    expect(typer(v)).toContain("kort-udloebet");
    expect(typer(v)).not.toContain("kort-udloeber");
  });

  /** Ikke en fejl, men penge på vej ud — og det skal vides før sidste træk. */
  it("siger til, når abonnementet er opsagt", () => {
    const v = varslerFor(firma(), betaling({ stopperVedPeriodeslut: true }), nu);
    expect(typer(v)).toContain("opsagt");
  });

  /**
   * Sletningen er den eneste af dem alle, der ikke kan gøres om. Den regnes
   * med `sletningSker()` — den samme funktion, kunden får sin dato af.
   */
  it("varsler en forestående sletning", () => {
    // Ophørt 15. august 2026, altså slettet 30 dage senere.
    const v = varslerFor(
      firma({ ophoert_den: "2026-08-15T00:00:00Z" }),
      undefined,
      nu,
    );
    expect(typer(v)).toContain("sletning-naer");
  });

  /** En rask kunde har ingen sletningsdato, og så skal der ikke stå noget. */
  it("varsler ikke om en sletning, der ikke findes", () => {
    expect(typer(varslerFor(firma(), betaling(), nu))).not.toContain(
      "sletning-naer",
    );
  });

  /**
   * Alvorlighed er det, forsidens tal bygger på. En opsigelse og et kort, der
   * udløber om syv uger, skal SES, men de må ikke få tallet til at lyse rødt
   * hver dag — der er intet at rydde, og så holder man op med at se på det.
   */
  it("regner kun de røde for alvorlige", () => {
    const opsagt = varslerFor(
      firma(),
      betaling({ stopperVedPeriodeslut: true }),
      nu,
    );
    expect(opsagt.some(erAlvorligt)).toBe(false);

    const udloebet = varslerFor(
      firma(),
      betaling({ kort: { udloebMaaned: 7, udloebAar: 2026 } }),
      nu,
    );
    expect(udloebet.some(erAlvorligt)).toBe(true);
  });
});
