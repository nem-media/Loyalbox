import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { FORNYELSE_FORKLARING, TERMS_VERSION } from "./constants";

/**
 * ABONNEMENTET STARTER PÅ KØBSDATOEN, OG FØRSTE BETALING ER HELE PRISEN.
 *
 * Det var før ankret til den 20. i måneden. Stripe kan ikke ankre en cyklus
 * til en fast dato OG opkræve fuld pris for en periode, der starter en anden
 * dag, så den skæve første periode blev faktureret pro rata. Beløbet var
 * rigtigt, men det var ikke det, kunden havde set — og ordrebekræftelsen
 * skrev oven i købet "Betalt nu: 399 kr.", fordi ordrens beløb er
 * LISTEPRISEN og ikke det trukne.
 *
 * FEJLEN VILLE VÆRE TAVS, HVIS ANKERET KOM TILBAGE. `billing_cycle_anchor`
 * er én linje i et objekt, der i forvejen har `metadata`, og alt ville
 * fortsætte med at virke: betalingen går igennem, webhooken kvitterer,
 * abonnementet bliver aktivt. Kun beløbet på kontoudskriften ville holde op
 * med at passe med siden — og det opdager kunden, ikke os.
 */

const kilde = (sti: string) =>
  readFileSync(sti, "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** De to veje ind i et abonnement. Begge skal opføre sig ens. */
const KOEBSVEJE = [
  ["src/app/api/checkout/route.ts", "med konto"],
  ["src/app/bestil/uden-konto/actions.ts", "uden konto"],
] as const;

describe("abonnementet ankres ikke til en fast dato", () => {
  for (const [sti, hvad] of KOEBSVEJE) {
    it(`${hvad}: der sættes intet faktureringsanker`, () => {
      const s = kilde(sti);
      expect(s, `${hvad} opretter et abonnement`).toContain(
        "subscription_data",
      );
      expect(
        s,
        `${hvad}: billing_cycle_anchor er tilbage — første betaling bliver pro rata igen`,
      ).not.toContain("billing_cycle_anchor");
      expect(s, `${hvad}: ankerfunktionen er kaldt igen`).not.toContain(
        "nextBillingAnchor",
      );
    });
  }

  it("der findes ingen trækdato at ankre til", () => {
    /*
     * Konstanten `TRAEKDAG` er væk med vilje. Så længe den findes, er den en
     * invitation til at ankre igen — og en trækdato, der kun bruges ét sted,
     * er præcis sådan, den forrige model opstod.
     */
    const c = readFileSync("src/lib/constants.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(c).not.toMatch(/export const TRAEKDAG/);
    expect(c).not.toMatch(/export const PRORATA_FORKLARING/);
  });
});

describe("kunden får at vide, hvornår der trækkes igen", () => {
  /** De tre steder, løftet står. Alle tre skal bruge den samme konstant. */
  const STEDER = [
    ["src/app/bestil/uden-konto/bestil-form.tsx", "bestilling uden konto"],
    ["src/components/stander-designer.tsx", "bestilling med konto"],
    ["src/lib/ordrebekraeftelse.ts", "ordrebekræftelsen"],
  ] as const;

  for (const [sti, hvad] of STEDER) {
    it(`${hvad} bruger konstanten og skriver den ikke af`, () => {
      /*
       * Tre formuleringer af, hvornår der trækkes, ville før eller siden
       * blive til tre forskellige løfter — og det, kunden kan bevise, er
       * dét, der står på skærmen, de betalte fra.
       */
      expect(kilde(sti)).toContain("FORNYELSE_FORKLARING");
    });
  }

  it("løftet nævner hverken en fast dato eller en delvis periode", () => {
    expect(FORNYELSE_FORKLARING).not.toMatch(/\bden 20\b|20\. i måneden/);
    expect(FORNYELSE_FORKLARING).not.toMatch(/pro ?rata|kun for dagene/i);
    /* Og det SKAL sige, at det gentager sig — ellers er det ikke et løfte
       om et abonnement, men en kvittering for ét træk. */
    expect(FORNYELSE_FORKLARING).toMatch(/hver måned/);
  });

  it("handelsbetingelserne lover det samme", () => {
    /*
     * §3 er dét, kunden accepterer med et kryds før betalingen, og accepten
     * gemmes MED versionen. Lover afsnittet noget andet end skærmen, er det
     * afsnittet, der tæller i en tvist.
     */
    const t = kilde("src/app/handelsbetingelser/page.tsx");
    expect(t, "§3 lover stadig et træk den 20.").not.toMatch(
      /20\. i måneden/,
    );
    expect(t).toMatch(/hele månedsprisen ved købet/);

    /* Hvornår og hvor meget der trækkes er materielt — versionen skal være
       hævet, ellers kan vi ikke vise, hvad en kunde sagde ja til. */
    expect(Number(TERMS_VERSION)).toBeGreaterThanOrEqual(1.6);
  });
});

describe("tilkøb prorateres stadig", () => {
  it("en adresse mere hæver antallet på den linje, der allerede kører", () => {
    /*
     * DET ER EN ANDEN SAG END FØRSTE BETALING, og den skal ikke fjernes med.
     * Køber en butik adresse nr. 2 midt i en periode, beregner Stripe
     * forskellen for de resterende dage. Alternativet ville være at nulstille
     * kundens cyklus, fordi de købte et skilt mere — altså at flytte deres
     * betalingsdato uden at spørge.
     */
    const s = kilde("src/lib/ekstra-adresse.ts");
    expect(s).toContain('proration_behavior: "always_invoice"');
    expect(s).toContain('proration_behavior: "create_prorations"');
  });
});
