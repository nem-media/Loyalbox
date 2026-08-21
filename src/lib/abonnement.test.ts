import { describe, it, expect } from "vitest";
import {
  abonnementTilstand,
  dageTil,
  erBetalende,
  genoptagVej,
  sletningSker,
  suspensionUdloeber,
  SLETNING_EFTER_OPHOER_DAGE,
  SUSPENSION_MAANEDER,
  type AbonnementFelter,
} from "./abonnement";

/**
 * Bekræfter den regel, hele suspensionen hviler på: manglende betaling er
 * IKKE aftalens ophør, og der slettes ingenting, før de seks måneder er gået.
 *
 * Testen findes, fordi fejlen ville være usynlig. En virksomhed, der ved en
 * forglemmelse fik sat `ophoert_den`, ville se helt normal ud i panelet — og
 * være slettet 30 dage senere.
 */

function firma(felter: Partial<AbonnementFelter> = {}): AbonnementFelter {
  return {
    stripe_subscription_id: null,
    stripe_status: null,
    suspenderet_siden: null,
    ophoert_den: null,
    sletning_udfoeres_den: null,
    ...felter,
  };
}

const FOR_TRE_MAANEDER_SIDEN = "2026-05-21T10:00:00.000Z";

describe("abonnementets tilstand", () => {
  it("regner prøveperiode som betalende", () => {
    expect(erBetalende("active")).toBe(true);
    expect(erBetalende("trialing")).toBe(true);
    expect(erBetalende("past_due")).toBe(false);
    expect(erBetalende(null)).toBe(false);
  });

  it("kalder en betalende kunde aktiv", () => {
    expect(
      abonnementTilstand(
        firma({ stripe_status: "active", stripe_subscription_id: "sub_1" }),
      ),
    ).toBe("aktiv");
  });

  it("kalder en Basic-konto uden abonnement aktiv, ikke suspenderet", () => {
    // En konto, der aldrig har haft et abonnement, må ALDRIG møde en
    // betalingsskærm. Uden `suspenderet_siden` er der intet at suspendere.
    expect(abonnementTilstand(firma())).toBe("aktiv");
  });

  it("kalder en ubetalt kunde suspenderet — ikke ophørt", () => {
    const c = firma({
      stripe_status: "past_due",
      stripe_subscription_id: "sub_1",
      suspenderet_siden: FOR_TRE_MAANEDER_SIDEN,
    });
    expect(abonnementTilstand(c)).toBe("suspenderet");
    expect(c.ophoert_den).toBeNull();
  });

  it("lader betaling ophæve suspensionen igen", () => {
    // Betaler kunden, er status active igen — og så er tilstanden aktiv,
    // uanset at datoen for suspensionen endnu ikke er ryddet.
    expect(
      abonnementTilstand(
        firma({
          stripe_status: "active",
          suspenderet_siden: FOR_TRE_MAANEDER_SIDEN,
        }),
      ),
    ).toBe("aktiv");
  });

  it("lader ophør slå suspension", () => {
    expect(
      abonnementTilstand(
        firma({
          suspenderet_siden: FOR_TRE_MAANEDER_SIDEN,
          ophoert_den: "2026-08-01T10:00:00.000Z",
        }),
      ),
    ).toBe("ophoert");
  });
});

describe("fristerne", () => {
  it("lægger seks måneder til suspensionens start", () => {
    const udloeb = suspensionUdloeber(
      firma({ suspenderet_siden: "2026-01-15T10:00:00.000Z" }),
    );
    expect(udloeb?.toISOString().slice(0, 10)).toBe("2026-07-15");
    expect(SUSPENSION_MAANEDER).toBe(6);
  });

  it("giver ingen sletningsdato for en aktiv kunde", () => {
    expect(sletningSker(firma({ stripe_status: "active" }))).toBeNull();
  });

  it("sletter 30 dage efter suspensionen løber ud", () => {
    // Seks måneder plus 30 dage — og først dér. Det er hele pointen.
    const sletning = sletningSker(
      firma({
        stripe_status: "canceled",
        suspenderet_siden: "2026-01-15T10:00:00.000Z",
      }),
    );
    expect(sletning?.toISOString().slice(0, 10)).toBe("2026-08-14");
    expect(SLETNING_EFTER_OPHOER_DAGE).toBe(30);
  });

  it("vælger den nærmeste dato, når kunden selv har bestilt sletning", () => {
    const sletning = sletningSker(
      firma({
        suspenderet_siden: "2026-01-15T10:00:00.000Z",
        sletning_udfoeres_den: "2026-03-01T10:00:00.000Z",
      }),
    );
    expect(sletning?.toISOString().slice(0, 10)).toBe("2026-03-01");
  });

  it("tæller hele dage og går aldrig i minus", () => {
    const nu = new Date("2026-08-21T10:00:00.000Z");
    expect(dageTil(new Date("2026-08-24T10:00:00.000Z"), nu)).toBe(3);
    expect(dageTil(new Date("2026-08-01T10:00:00.000Z"), nu)).toBe(0);
    expect(dageTil(null, nu)).toBeNull();
  });
});

describe("vejen tilbage", () => {
  it("har ingen vej tilbage for en aktiv kunde", () => {
    expect(genoptagVej(firma({ stripe_status: "active" }))).toBeNull();
  });

  it("sender et abonnement, der kan reddes, til kundecentret", () => {
    for (const status of ["past_due", "unpaid", "incomplete", "paused"]) {
      expect(
        genoptagVej(
          firma({
            stripe_status: status,
            stripe_subscription_id: "sub_1",
            suspenderet_siden: FOR_TRE_MAANEDER_SIDEN,
          }),
        ),
      ).toBe("opdater_kort");
    }
  });

  it("kræver et nyt abonnement, når det gamle er lukket", () => {
    expect(
      genoptagVej(
        firma({
          stripe_status: "canceled",
          stripe_subscription_id: "sub_1",
          suspenderet_siden: FOR_TRE_MAANEDER_SIDEN,
        }),
      ),
    ).toBe("nyt_abonnement");
  });
});
