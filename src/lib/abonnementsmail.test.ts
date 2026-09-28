import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  aarsskifteMail,
  erOpsagt,
  fortrudtMail,
  livshaendelse,
  opsagtMail,
  ophoerFra,
  stoppetMail,
} from "./abonnementsmail";
import { SLETNING_EFTER_OPHOER_DAGE, SUSPENSION_MAANEDER } from "./abonnement";

/**
 * MAILENE OM ABONNEMENTETS LIV.
 *
 * Opdaget 28. september 2026: en opsigelse i Stripes kundecenter gav ingen
 * mail — Stripe har ingen, og webhooken skrev kun status. Prøverne her holder
 * fast i to ting: at den RIGTIGE hændelse giver den rigtige mail (og de mange
 * andre `subscription.updated` ingen), og at teksten lover præcis det, §6 og
 * §7 lover.
 */

const aktiv = { status: "active", cancel_at: null, cancel_at_period_end: false };
const opsagt = {
  status: "active",
  cancel_at: 1792486800,
  cancel_at_period_end: true,
};

describe("livshaendelse — hvilken mail giver hændelsen?", () => {
  it("en opsigelse i kundecentret giver 'opsagt'", () => {
    // Formen fra den rigtige hændelse 24. sep. 2026 (evt_1UJBg3…): begge
    // felter sat, begge i previous_attributes med deres gamle værdi.
    expect(
      livshaendelse({
        type: "customer.subscription.updated",
        haendelse: opsagt,
        foer: { cancel_at: null, cancel_at_period_end: false },
        nu: opsagt,
      }),
    ).toBe("opsagt");
  });

  it("en opsigelse på en valgt dato (kun cancel_at) giver også 'opsagt'", () => {
    const kunDato = { status: "active", cancel_at: 1792486800, cancel_at_period_end: false };
    expect(
      livshaendelse({
        type: "customer.subscription.updated",
        haendelse: kunDato,
        foer: { cancel_at: null },
        nu: kunDato,
      }),
    ).toBe("opsagt");
  });

  it("en fortrudt opsigelse giver 'fortrudt'", () => {
    expect(
      livshaendelse({
        type: "customer.subscription.updated",
        haendelse: aktiv,
        foer: { cancel_at: 1792486800, cancel_at_period_end: true },
        nu: aktiv,
      }),
    ).toBe("fortrudt");
  });

  it("en ny faktura på et abonnement, der VAR opsagt i forvejen, giver ingenting", () => {
    // Det er den farlige: en `subscription.updated`, hvor abonnementet står
    // som opsagt, men opsigelsen er ikke det, der ændrede sig.
    expect(
      livshaendelse({
        type: "customer.subscription.updated",
        haendelse: opsagt,
        foer: { status: "active" } as never,
        nu: opsagt,
      }),
    ).toBeNull();
  });

  it("uden previous_attributes er der ingen overgang at melde", () => {
    expect(
      livshaendelse({
        type: "customer.subscription.updated",
        haendelse: opsagt,
        foer: undefined,
        nu: opsagt,
      }),
    ).toBeNull();
  });

  it("en forældet opsigelse, der lander EFTER fortrydelsen, giver ingen mail", () => {
    // Hændelsen siger opsagt, men abonnementet hentet friskt kører videre.
    expect(
      livshaendelse({
        type: "customer.subscription.updated",
        haendelse: opsagt,
        foer: { cancel_at: null, cancel_at_period_end: false },
        nu: aktiv,
      }),
    ).toBeNull();
  });

  it("et slettet abonnement giver 'stoppet' — kun når det faktisk er lukket", () => {
    const lukket = { status: "canceled", cancel_at: null, cancel_at_period_end: false };
    expect(
      livshaendelse({
        type: "customer.subscription.deleted",
        haendelse: lukket,
        foer: undefined,
        nu: lukket,
      }),
    ).toBe("stoppet");
    expect(
      livshaendelse({
        type: "customer.subscription.deleted",
        haendelse: lukket,
        foer: undefined,
        nu: aktiv,
      }),
    ).toBeNull();
  });

  it("erOpsagt kender begge felter", () => {
    expect(erOpsagt(aktiv)).toBe(false);
    expect(erOpsagt({ status: "active", cancel_at_period_end: true })).toBe(true);
    expect(erOpsagt({ status: "active", cancel_at: 1 })).toBe(true);
  });
});

describe("teksten lover det, betingelserne lover", () => {
  const stop = new Date("2026-10-20T09:00:00Z");

  it("opsigelsen nævner slutdatoen, datafristen og vejen tilbage", () => {
    const { emne, tekst } = opsagtMail({
      firmanavn: "Nem Media ApS",
      vare: "LoyalSum Komplet",
      stopper: stop,
    });
    expect(emne).toContain("20. oktober 2026");
    expect(tekst).toContain("stopper den 20. oktober 2026");
    // De seks måneder regnes fra stoppet — samme som `suspensionUdloeber()`.
    expect(tekst).toContain("til den 20. april 2027");
    expect(tekst).toContain(`${SUSPENSION_MAANEDER} måneder`);
    expect(tekst).toContain(`inden for ${SLETNING_EFTER_OPHOER_DAGE} dage`);
    expect(tekst).toContain("Betaling og kvitteringer");
    expect(tekst).toContain("der trækkes ikke flere betalinger");
  });

  it("ophørsdatoen ligger præcis SUSPENSION_MAANEDER efter stoppet", () => {
    const d = ophoerFra(stop);
    const forventet = new Date(stop);
    forventet.setMonth(forventet.getMonth() + SUSPENSION_MAANEDER);
    expect(d.getTime()).toBe(forventet.getTime());
  });

  it("et stop efter fejlede betalinger kalder det ikke 'som du bad om'", () => {
    const betaling = stoppetMail({
      firmanavn: null,
      vare: "LoyalSum Komplet",
      stoppet: stop,
      betalingFejlede: true,
    }).tekst;
    expect(betaling).toContain("fordi betalingen ikke kunne gennemføres");
    expect(betaling).not.toContain("som du bad om");

    const frivillig = stoppetMail({
      firmanavn: null,
      vare: "LoyalSum Komplet",
      stoppet: stop,
      betalingFejlede: false,
    }).tekst;
    expect(frivillig).toContain("som du bad om");
    expect(frivillig).toContain("standeren har du allerede");
  });

  it("en vare uden stander nævner ingen stander", () => {
    const opsagtOnline = opsagtMail({
      firmanavn: null,
      vare: "LoyalSum Komplet Online",
      stopper: stop,
      digital: true,
    }).tekst;
    const stoppetOnline = stoppetMail({
      firmanavn: null,
      vare: "LoyalSum Komplet Online",
      stoppet: stop,
      betalingFejlede: false,
      digital: true,
    }).tekst;
    for (const tekst of [opsagtOnline, stoppetOnline]) {
      expect(tekst.toLowerCase()).not.toContain("stander");
      expect(tekst).toContain("QR-kode");
    }
  });

  it("fortrydelsen nævner næste træk, når det kendes", () => {
    expect(
      fortrudtMail({ firmanavn: "X", vare: "Y", naesteBetaling: stop }).tekst,
    ).toContain("20. oktober 2026");
    expect(
      fortrudtMail({ firmanavn: "X", vare: "Y", naesteBetaling: null }).tekst,
    ).toContain("fornyes automatisk");
  });

  it("årsmailen regner antallet med og siger, at der ingen binding er", () => {
    const { tekst } = aarsskifteMail({
      firmanavn: "Café Aurora",
      vare: "LoyalSum Komplet",
      aarPris: 4389,
      antal: 2,
      naesteBetaling: new Date("2027-09-28T09:00:00Z"),
    });
    expect(tekst).toContain("8.778 kr. ex moms (2 QR-adresser)");
    expect(tekst).toContain("28. september 2027");
    expect(tekst).toContain("ingen binding");
    // Værdierne i samme kolonne — ellers læser `mail-blokke.ts` det som løse
    // sætninger og ikke som en opstilling.
    const raekker = tekst.split("\n").filter((l) => /^(Årspris|Næste træk):/.test(l));
    expect(raekker).toHaveLength(2);
    const kolonner = raekker.map((l) => l.search(/(?<=:\s+)\S/));
    expect(new Set(kolonner).size).toBe(1);
  });
});

/** Kilden UDEN kommentarer — filerne citerer med vilje den kode, de forklarer. */
function kode(sti: string): string {
  return readFileSync(new URL(sti, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("koblingen", () => {
  it("webhooken kalder mailen for abonnementets hændelser", () => {
    const webhook = kode("../app/api/stripe/webhook/route.ts");
    const fra = webhook.indexOf('case "customer.subscription.updated"');
    const til = webhook.indexOf("default:", fra);
    expect(fra).toBeGreaterThan(-1);
    expect(webhook.slice(fra, til)).toContain("mailOmAbonnementet(");
  });

  it("kun virksomhedens NUVÆRENDE abonnement får en mail", () => {
    const udsendelse = kode("./abonnementsmail-udsendelse.ts");
    expect(udsendelse).toMatch(/stripe_subscription_id\s*!==\s*sub\.id/);
  });

  it("spærren sættes FØR mailen, og 23505 betyder 'allerede sendt'", () => {
    const udsendelse = kode("./abonnementsmail-udsendelse.ts");
    const spaerre = udsendelse.indexOf('.from("kundemail_spaerre")');
    const send = udsendelse.indexOf("sendKundeMail(");
    expect(spaerre).toBeGreaterThan(-1);
    expect(send).toBeGreaterThan(spaerre);
    expect(udsendelse).toMatch(/code\s*===\s*"23505"/);
  });

  it("testkonti får ingen mail", () => {
    expect(kode("./abonnementsmail-udsendelse.ts")).toContain("isTestBuyer(til)");
  });

  it("skiftet til år sender en bekræftelse", () => {
    const handling = kode("../app/dashboard/abonnement/actions.ts");
    expect(handling).toContain("aarsskifteMail(");
    expect(handling).toContain("sendAbonnementsmail(");
  });

  it("et stoppet abonnement kaldes ikke 'Betaling mangler'", () => {
    const banner = kode("../components/betaling-mangler.tsx");
    expect(banner).toMatch(/stripe_status\s*===\s*"canceled"/);
    expect(banner).toContain("ABONNEMENT_STOPPET_OVERSKRIFT");
    const knap = kode("../components/genoptag-knap.tsx");
    expect(knap).toContain("Genoptag abonnementet");
  });
});
