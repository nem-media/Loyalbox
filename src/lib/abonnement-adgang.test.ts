import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { harAbonnement } from "./abonnement";
import { PRODUCTS } from "./constants";

/**
 * Hvad man får UDEN et abonnement — og hvad man ikke får.
 *
 * FORRETNINGSMODELLEN, IKKE EN BETALINGSMUR. En gratis konto kunne oprette
 * ubegrænset mange QR-adresser og køre anmeldelsesflowet i det uendelige
 * uden at betale. Set i produktionen: en konto uden noget produkt havde
 * samlet tre stykker feedback, den aldrig kunne læse, fordi `feedbackInbox`
 * er slået fra på basic. Det er ikke bare en manglende funktion — det er
 * indsamling af personoplysninger uden et formål.
 *
 * Design og bestilling bliver ved med at være åbent: det er en del af købet.
 */

describe("harAbonnement", () => {
  it("siger ja til begge abonnementsvarer", () => {
    for (const slug of ["reviewstander-pro", "loyalsum-komplet"]) {
      expect(harAbonnement({ product_slug: slug }), slug).toBe(true);
    }
  });

  /**
   * Reviewstander er et ENGANGSKØB — et trykt skilt, der viderestiller, og
   * som købes uden konto. Den må aldrig låse dashboardet op.
   */
  it("siger nej til engangskøb, tilkøb og ingen vare", () => {
    for (const slug of ["reviewstander", "ekstra-stander", "findes-ikke"]) {
      expect(harAbonnement({ product_slug: slug }), slug).toBe(false);
    }
    expect(harAbonnement({ product_slug: null })).toBe(false);
    expect(harAbonnement(null)).toBe(false);
    expect(harAbonnement(undefined)).toBe(false);
  });

  /**
   * DEN VIGTIGSTE. Adgangen hænger på PRODUKTET og aldrig på `plan`.
   *
   * En rigtig kunde stod med LoyalSum Komplet og niveau `premium`, fordi
   * planen kan sættes i hånden i admin. Havde spærringerne hængt på planen,
   * ville dén fejl have slukket for en betalende kundes egen
   * anmeldelsesside — en tavs fejl, ingen ville have opdaget før kunden
   * ringede.
   */
  it("er upåvirket af en forkert sat plan", () => {
    for (const plan of ["basic", "premium", "pro", null]) {
      expect(
        harAbonnement({ product_slug: "loyalsum-komplet", plan } as {
          product_slug: string;
        }),
        String(plan),
      ).toBe(true);
    }
  });

  it("dækker præcis de varer, der har en månedspris", () => {
    const medMaanedspris = PRODUCTS.filter((p) => p.monthlyPrice && !p.addon);
    for (const p of medMaanedspris) {
      expect(harAbonnement({ product_slug: p.slug }), p.slug).toBe(true);
    }
    expect(medMaanedspris.length).toBeGreaterThan(0);
  });
});

describe("spærringerne findes, hvor de skal", () => {
  const kilde = (sti: string) => readFileSync(join(process.cwd(), sti), "utf8");

  /**
   * Knappen skjules i `standere/page.tsx`, men dét er ikke adgangskontrol:
   * server-handlingen kan kaldes direkte. Kontrollen SKAL stå i handlingen.
   */
  it("createStand afviser uden abonnement", () => {
    const s = kilde("src/app/dashboard/actions.ts");
    const i = s.indexOf("export async function createStand");
    expect(i).toBeGreaterThan(-1);
    expect(s.slice(i, i + 1400)).toContain("harAbonnement");
  });

  it("anmeldelsessiden viderestiller uden abonnement", () => {
    expect(kilde("src/app/r/[slug]/page.tsx")).toContain("harAbonnement");
  });

  it("personale er spærret i et layout og ikke kun i menuen", () => {
    const sti = "src/app/dashboard/personale/layout.tsx";
    expect(existsSync(join(process.cwd(), sti))).toBe(true);
    expect(kilde(sti)).toContain("harAbonnement");
  });

  /**
   * BESTILLINGEN SKAL BLIVE VED AT VÆRE ÅBEN. Det er hele pointen: man skal
   * kunne designe og bestille uden abonnement — adressen er det, man får
   * bagefter. Spærres den, er der ingen vej ind i produktet overhovedet.
   */
  it("lader designeren og bestillingen være i fred", () => {
    for (const sti of [
      "src/app/bestil/page.tsx",
      "src/app/bestil/uden-konto/actions.ts",
    ]) {
      expect(kilde(sti), sti).not.toContain("harAbonnement");
    }
  });
});
