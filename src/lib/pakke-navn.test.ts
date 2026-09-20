import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PRODUCTS, TIER_LABELS, planForProduct } from "./constants";

/**
 * KUNDEN SKAL SE PAKKENS NAVN, IKKE NIVEAUETS — OG DET ER GÅET GALT TO GANGE.
 *
 * `plan` er et NIVEAU (`basic` · `pro`), og BEGGE abonnementsvarer ligger på
 * `pro`: Reviewstander Pro og LoyalSum Komplet. Niveaunavnet kan derfor ikke
 * skelne dem, og en kunde, der har købt LoyalSum Komplet, fik at vide, at hun
 * var på "Pro" — et ord, hun aldrig har set i en bestilling.
 *
 * Første gang blev det rettet på abonnementssiden. Anden gang viste det sig i
 * SIDEBJÆLKENS chip, altså på hver eneste side i dashboardet, hvor det stod et
 * helt år. Samme fejl, ét sted til — præcis som da webhookens ordre blev gjort
 * betinget og virksomheden ved siden af blev gået forbi.
 *
 * Prøven er derfor på BEGGE steder, og den er skrevet, så et tredje sted
 * arver reglen: navnet slås OP i kataloget og skrives aldrig af.
 */

const kilde = (sti: string) =>
  readFileSync(sti, "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/* De to steder, kunden får sin pakke at se. */
const STEDER = [
  ["src/app/dashboard/layout.tsx", "sidebjælkens chip"],
  ["src/app/dashboard/abonnement/page.tsx", "abonnementssiden"],
] as const;

describe("pakkens navn kommer fra kataloget", () => {
  for (const [sti, hvad] of STEDER) {
    it(`${hvad} slår produktet op`, () => {
      const s = kilde(sti);
      expect(s, `${hvad} bruger getProduct`).toContain("getProduct");
      expect(
        /getProduct\([^)]*\)[?.\s]*\.?name/.test(s) ||
          /\bnuvaerende\?\.name/.test(s) ||
          /\bpakkeNavn\b/.test(s),
        `${hvad} viser produktets navn`,
      ).toBe(true);
    });

    it(`${hvad} bruger kun niveaunavnet som reserve`, () => {
      /*
       * `TIER_LABELS` må gerne stå — en konto UDEN køb har intet produkt, og
       * så er niveaunavnet det bedste, vi har. Men det skal stå efter et
       * `??`, altså som fald tilbage, og aldrig som det eneste svar.
       */
      const s = kilde(sti);
      for (const m of s.matchAll(/TIER_LABELS\[\w+\]/g)) {
        const foer = s.slice(Math.max(0, m.index! - 60), m.index!);
        expect(
          /\?\?\s*$/.test(foer.trimEnd() + " ") || /\?\?\s*$/.test(foer),
          `${hvad}: TIER_LABELS står som svar og ikke som reserve`,
        ).toBe(true);
      }
    });
  }

  it("niveaunavnet kan ikke skelne de to abonnementsvarer", () => {
    /*
     * DÉT er hele grunden, og prøven henter den fra kataloget frem for at
     * påstå den. Holder den en dag op med at være sand — fordi varerne får
     * hvert sit niveau — er reglen ovenfor ikke længere nødvendig, og så skal
     * nogen tage stilling frem for at arve den.
     */
    const abonnementer = PRODUCTS.filter(
      (p) => !p.addon && (p.monthlyPrice ?? 0) > 0,
    );
    expect(abonnementer.length).toBeGreaterThan(1);

    const niveauer = abonnementer.map((p) => planForProduct(p.slug));
    const delt = niveauer.filter((n, i) => niveauer.indexOf(n) !== i);
    expect(
      delt.length,
      "varerne har hvert sit niveau nu — se kommentaren",
    ).toBeGreaterThan(0);

    /* Og navnene ER forskellige, så opslaget faktisk løser noget. */
    const navne = new Set(abonnementer.map((p) => p.name));
    expect(navne.size).toBe(abonnementer.length);
    for (const p of abonnementer) {
      expect(Object.values(TIER_LABELS)).not.toContain(p.name);
    }
  });
});
