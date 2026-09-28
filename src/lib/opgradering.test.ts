import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { produktForPriser, stripeIdsFor } from "./commerce";
import { getProduct } from "./constants";
import { opgraderetMail } from "./abonnementsmail";

/**
 * OPGRADERINGEN SKER PÅ DET ABONNEMENT, DER KØRER.
 *
 * Før gik den gennem en ny checkout: to abonnementer, det gamle usynligt og
 * trækkende, og ved dets næste fornyelse skrev webhooken den gamle vare
 * tilbage på virksomheden. Fundet 28. september 2026. Efterprøvet samme dag
 * mod Stripe test: 2 × Pro → 2 × Komplet gav én faktura på −198 + 798 kr. ex
 * moms, samme periode, ét abonnement, satsen i behold — og et afvist kort
 * efterlod kunden på Pro med en ventende ændring.
 */

function kode(sti: string): string {
  return readFileSync(new URL(sti, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("varen læses af prisen", () => {
  it("genkender hver abonnementsvare på både måneds- og årsprisen", () => {
    for (const slug of ["reviewstander-pro", "loyalsum-komplet", "loyalsum-komplet-online"]) {
      const ids = stripeIdsFor(getProduct(slug)!)!;
      expect(produktForPriser([ids.monthlyPriceId])?.slug).toBe(slug);
      if (ids.yearlyPriceId) {
        expect(produktForPriser([ids.yearlyPriceId])?.slug).toBe(slug);
      }
    }
  });

  it("en ukendt pris giver ingen vare — så bruges metadataen", () => {
    expect(produktForPriser(["price_findes_ikke", null, undefined])).toBeUndefined();
  });

  it("webhooken skriver varen af prisen før metadataen", () => {
    const webhook = kode("../app/api/stripe/webhook/route.ts");
    expect(webhook).toContain("produktForPriser(");
    expect(webhook).toMatch(/product_slug:\s*slugFraPris/);
  });
});

describe("opgraderingen", () => {
  const lib = kode("./opgradering.ts");

  it("bytter prisen på den linje, der findes, og laver intet nyt abonnement", () => {
    expect(lib).toContain("subscriptions.update(");
    expect(lib).not.toContain("subscriptions.create(");
    expect(lib).not.toContain("checkout.sessions.create(");
  });

  it("opkræver differencen nu og venter på betalingen", () => {
    expect(lib).toMatch(/proration_behavior:\s*"always_invoice"/);
    // Uden den gennemføres skiftet, selv om kortet afvises.
    expect(lib).toMatch(/payment_behavior:\s*"pending_if_incomplete"/);
    expect(lib).toContain("pending_update");
  });

  it("sender ikke tax_rates med — Stripe afviser dem ved en ventende ændring", () => {
    const opdatering = lib.slice(lib.indexOf("subscriptions.update(sub.id, {"));
    const kald = opdatering.slice(0, opdatering.indexOf("satisfies"));
    expect(kald).not.toContain("tax_rates");
    // … men kræver, at linjen HAR satsen i forvejen.
    expect(lib).toMatch(/tax_rates\s*\?\?\s*\[\]/);
  });

  it("spørger den samme spærre som knappen", () => {
    expect(lib).toMatch(/abonnementsSkifteSpaerre\(company, maal\)\s*!==\s*"opgradering"/);
  });

  it("checkout afviser en opgradering i stedet for at lave et abonnement mere", () => {
    const checkout = kode("../app/api/checkout/route.ts");
    expect(checkout).toMatch(/skifte === "opgradering"/);
  });

  it("admin i supporttilstand kan ikke trække på kundens kort", () => {
    const handling = kode("../app/dashboard/abonnement/actions.ts");
    const fra = handling.indexOf("export async function opgraderTil");
    expect(handling.slice(fra, fra + 800)).toContain("user.supportFor");
  });
});

describe("bekræftelsen", () => {
  it("siger beløbet i dag, den fulde pris og at datoen er den samme", () => {
    const { emne, tekst } = opgraderetMail({
      firmanavn: "Café Aurora",
      fra: "Reviewstander Pro",
      til: "LoyalSum Komplet",
      nyPris: 399,
      aarligt: false,
      antal: 2,
      betaltOere: 75000,
      naesteBetaling: new Date("2026-10-28T10:00:00Z"),
    });
    expect(emne).toContain("LoyalSum Komplet");
    expect(tekst).toContain("750 kr. inkl. moms");
    expect(tekst).toContain("798 kr. ex moms (2 QR-adresser)");
    expect(tekst).toContain("28. oktober 2026");
    expect(tekst).toContain("på samme dato som hidtil");
  });
});
