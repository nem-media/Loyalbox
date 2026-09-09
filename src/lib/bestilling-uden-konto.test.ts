import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  erGyldigEmail,
  erGyldigUrl,
  laesBestilling,
  type BestillingFelter,
} from "./bestilling-uden-konto";

/**
 * Formularen er OFFENTLIG og uden login. Der er ingen konto at falde tilbage
 * på for hverken CVR, mail eller firmanavn, så intet felt kan tages for givet
 * — og alt, hvad der slipper igennem, ender på et trykt skilt, der ikke kan
 * kaldes tilbage.
 */
function gyldig(over: Partial<Record<string, unknown>> = {}) {
  return {
    firmanavn: "Café Hjørnet",
    cvr: "37811769",
    email: "hej@cafehjoernet.dk",
    antal: 2,
    standerFarve: "sort",
    egenFrontfarve: false,
    frontHex: null,
    destinationType: "google",
    destinationUrl: "https://g.page/r/abc/review",
    accepterVilkaar: true,
    ...over,
  };
}

describe("adresser", () => {
  it("godtager http og https", () => {
    expect(erGyldigUrl("https://eksempel.dk/a")).toBe(true);
    expect(erGyldigUrl("http://eksempel.dk")).toBe(true);
    expect(erGyldigUrl("  https://eksempel.dk  ")).toBe(true);
  });

  it("afviser javascript: og andre protokoller", () => {
    // Uden dette kunne en javascript-adresse blive TRYKT på et skilt og køre i
    // den næste gæsts browser. Et skilt kan ikke kaldes tilbage.
    for (const ond of [
      "javascript:alert(1)",
      "data:text/html,<script>",
      "file:///etc/passwd",
      "eksempel.dk",
      "",
      "   ",
    ]) {
      expect(erGyldigUrl(ond), ond).toBe(false);
    }
  });
});

describe("mailadresser", () => {
  it("godtager det almindelige", () => {
    expect(erGyldigEmail("hej@eksempel.dk")).toBe(true);
    expect(erGyldigEmail(" hej+bestilling@eksempel.co.uk ")).toBe(true);
  });

  it("afviser det åbenlyse", () => {
    for (const v of ["", "hej", "hej@", "@eksempel.dk", "hej eksempel.dk"]) {
      expect(erGyldigEmail(v), v).toBe(false);
    }
  });
});

describe("læsning af bestillingen", () => {
  it("godtager en udfyldt formular", () => {
    const r = laesBestilling(gyldig());
    expect(r.ok).toBe(true);
    expect(r.vaerdier?.cvr).toBe("37811769");
    expect(r.vaerdier?.firmanavn).toBe("Café Hjørnet");
  });

  it("normaliserer CVR, så mellemrum og DK-præfiks ikke er en fejl", () => {
    expect(
      laesBestilling(gyldig({ cvr: "DK 37 81 17 69" })).vaerdier?.cvr,
    ).toBe("37811769");
  });

  it("samler ALLE fejl på én gang", () => {
    // En formular, der afviser ét felt ad gangen, tvinger folk gennem lige så
    // mange forsøg, som der er fejl.
    const r = laesBestilling({
      firmanavn: "",
      cvr: "123",
      email: "hej",
      antal: 0,
      standerFarve: "lilla",
      destinationType: "myspace",
      destinationUrl: "ikke en url",
      accepterVilkaar: false,
    });
    expect(r.ok).toBe(false);
    const felter = Object.keys(r.fejl) as (keyof BestillingFelter)[];
    expect(felter).toContain("firmanavn");
    expect(felter).toContain("cvr");
    expect(felter).toContain("email");
    expect(felter).toContain("antal");
    expect(felter).toContain("standerFarve");
    expect(felter).toContain("destinationType");
    expect(felter).toContain("destinationUrl");
    expect(felter).toContain("accepterVilkaar");
  });

  /**
   * CVR ER FRIVILLIGT, men skal være rigtigt, hvis det skrives.
   *
   * Et forkert nummer må ikke slippe igennem som "så lader vi det være":
   * kunden tror, det står på fakturaen, og opdager først noget, når momsen
   * ikke kan trækkes fra. Et TOMT felt er derimod et valg, kunden har taget.
   */
  it("accepterer et tomt CVR, men ikke et forkert", () => {
    expect(laesBestilling(gyldig({ cvr: "" })).fejl.cvr).toBeUndefined();
    expect(laesBestilling(gyldig({ cvr: "37811768" })).fejl.cvr).toBeTruthy();
    expect(laesBestilling(gyldig({ cvr: "1234" })).fejl.cvr).toBeTruthy();
  });

  it("kræver accept af betingelserne", () => {
    expect(
      laesBestilling(gyldig({ accepterVilkaar: false })).fejl.accepterVilkaar,
    ).toBeTruthy();
  });

  it("kræver en farve, når egen frontfarve er valgt", () => {
    expect(
      laesBestilling(gyldig({ egenFrontfarve: true, frontHex: "" })).fejl
        .frontHex,
    ).toBeTruthy();
    expect(
      laesBestilling(gyldig({ egenFrontfarve: true, frontHex: "#1b916a" })).ok,
    ).toBe(true);
  });

  it("ignorerer en hex, når tilvalget er slået fra", () => {
    // Et felt, der er blevet stående efter tilvalget blev slået fra, må ikke
    // koste penge eller bestemme trykket.
    const r = laesBestilling(
      gyldig({ egenFrontfarve: false, frontHex: "#ff0000" }),
    );
    expect(r.ok).toBe(true);
    expect(r.vaerdier?.frontHex).toBeNull();
    expect(r.vaerdier?.egenFrontfarve).toBe(false);
  });

  it("holder antallet inden for loftet", () => {
    expect(laesBestilling(gyldig({ antal: 101 })).fejl.antal).toBeTruthy();
    expect(laesBestilling(gyldig({ antal: -3 })).fejl.antal).toBeTruthy();
    expect(laesBestilling(gyldig({ antal: 100 })).ok).toBe(true);
  });
});

/**
 * DE TING, STRIPE AFVISER — og som hverken tests eller build kan se.
 *
 * Sessionen oprettes af en server action, der taler med Stripe. Går et felt
 * ikke i spænd med `mode`, fejler HELE bestillingen, og kunden får
 * "Betalingen kunne ikke startes" efter at have udfyldt det hele. Prøves i
 * kilden, fordi der ikke er noget at kalde uden et rigtigt Stripe-kald.
 */
describe("checkout-sessionen for et abonnement", () => {
  const KILDE = readFileSync(
    join(process.cwd(), "src/app/bestil/uden-konto/actions.ts"),
    "utf8",
  );

  /**
   * DEN FEJL, DER FAKTISK SKETE 9. september 2026: `invoice_creation` stod
   * ubetinget. Stripe svarer "You can only enable invoice creation when
   * `mode` is set to `payment`" — et abonnement laver sine fakturaer selv.
   */
  it("slår kun fakturaoprettelse til ved engangskøb", () => {
    const i = KILDE.indexOf("invoice_creation");
    expect(i, "invoice_creation er væk — så er prøven her forældet").toBeGreaterThan(-1);
    expect(
      KILDE.slice(Math.max(0, i - 200), i),
      "invoice_creation skal være betinget af `abonnement`",
    ).toMatch(/abonnement\s*\?/);
  });

  /** Og månedsprisen skal med som sin egen linje, ellers bliver det et engangskøb. */
  it("lægger månedsprisen på som en linje", () => {
    expect(KILDE).toMatch(/ids\.monthlyPriceId/);
  });

  /** Uden `mode: subscription` opretter Stripe aldrig et abonnement. */
  it("vælger subscription-tilstand for et abonnement", () => {
    expect(KILDE).toMatch(/mode:\s*abonnement\s*\?/);
  });
});

/**
 * DE TO HULLER, DET FØRSTE RIGTIGE ABONNEMENTSKØB AFSLØREDE (9. sep. 2026).
 *
 * Begge stammer fra samme sted: flowet var skrevet, dengang det kun kunne
 * sælge Basic, og antagelserne stod som kommentarer frem for som kode.
 */
describe("abonnement uden konto: det Basic ikke havde brug for", () => {
  const KILDE = readFileSync(
    join(process.cwd(), "src/app/bestil/uden-konto/actions.ts"),
    "utf8",
  );
  const FORM = readFileSync(
    join(process.cwd(), "src/app/bestil/uden-konto/bestil-form.tsx"),
    "utf8",
  );

  /**
   * DATABEHANDLERAFTALEN. Basic indsamler ingenting — standeren viderestiller
   * — så der var ingen databehandlerrolle at aftale. Et abonnement indsamler
   * feedback og medlemsdata om butikkens EGNE kunder, og så er vi
   * databehandler. Det første testkøb kom igennem med `dpa_accepted_at = null`.
   */
  it("registrerer databehandleraftalen", () => {
    expect(KILDE).toMatch(/requiresDpa\(product\)/);
    expect(KILDE).toMatch(/dpa_accepted_at/);
    expect(KILDE).toMatch(/dpa_version/);
  });

  /**
   * OG KUNDEN SKAL HAVE SET DEN. En registreret accept af noget, der aldrig
   * blev vist, er værre end ingen registrering.
   */
  it("viser aftalen ved afkrydsningsfeltet, når varen kræver den", () => {
    expect(FORM).toMatch(/kraeverDpa/);
    expect(FORM).toMatch(/databehandleraftale/);
  });

  /** Første betaling er hverken standerens pris eller abonnementets. */
  it("forklarer hvorfor første betaling er mindre", () => {
    expect(FORM).toMatch(/PRORATA_FORKLARING/);
  });
});
