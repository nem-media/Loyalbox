import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  harAbonnement,
  adresseSpaerre,
  ADRESSER_PR_ABONNEMENT,
  ADRESSE_TEKSTER,
} from "./abonnement";
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
   *
   * `adresseSpaerre()` svarer på BEGGE spørgsmål — er der et abonnement, og
   * er adressen brugt — så handlingen kun har ét sted at spørge.
   */
  it("createStand afviser uden abonnement og over grænsen", () => {
    const s = kilde("src/app/dashboard/actions.ts");
    const i = s.indexOf("export async function createStand");
    expect(i).toBeGreaterThan(-1);
    const krop = s.slice(i, i + 2200);
    expect(krop).toContain("adresseSpaerre");

    /*
      ANTALLET SKAL TÆLLES I BASEN. Handlingen kører i mange eksemplarer,
      og et tal fra klienten — eller fra en liste, der blev hentet før —
      ville lade to faner oprette hver sin adresse forbi grænsen.
    */
    expect(krop).toMatch(/count: "exact"/);
  });

  /**
   * Knappen og handlingen SKAL spørge den samme funktion. Et håndskrevet
   * `stands.length < 1` i siden ville komme i utakt med grænsen den dag,
   * tallet ændrer sig — og så ville sitet vise en knap, handlingen afviser.
   */
  it("knappen spørger samme regel som handlingen", () => {
    expect(kilde("src/app/dashboard/standere/page.tsx")).toContain(
      "adresseSpaerre",
    );
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
   * Oversigten skal møde en ny konto med "Bestil din første stander" — og
   * IKKE med guiden "Kom godt i gang", hvis første trin er "Opret din første
   * stander under Standere". Netop dét kan de ikke længere, og en vejledning,
   * der beder om noget umuligt, er værre end ingen.
   */
  it("oversigten viser en opstart i stedet for tomme tal", () => {
    const s = kilde("src/app/dashboard/page.tsx");
    expect(s).toContain("harAbonnement");
    expect(s).toContain("Bestil din første stander");
    // Grenen skal ligge FØR statistikken hentes — der er intet at hente.
    expect(s.indexOf("harAbonnement(company)")).toBeLessThan(
      s.indexOf("await getCompanyStats"),
    );
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

/**
 * ÉN QR-ADRESSE PR. ABONNEMENT — OG SÅ MANGE SKILTE MAN VIL.
 *
 * Adressen er en dedikeret side for ét sted. Skilte er bare skilte: tyve af
 * dem på den samme adresse koster kun det, akrylen koster. Før kunne én
 * abonnent oprette ubegrænset mange adresser, så en kæde med tyve butikker
 * betalte det samme som en enkelt café.
 */
describe("hvor mange QR-adresser følger der med", () => {
  const pro = { product_slug: "reviewstander-pro" };
  const komplet = { product_slug: "loyalsum-komplet" };
  const basic = { product_slug: "reviewstander" };

  it("lukker den første igennem på begge abonnementsvarer", () => {
    expect(adresseSpaerre(pro, 0)).toBeNull();
    expect(adresseSpaerre(komplet, 0)).toBeNull();
  });

  it("afviser den anden", () => {
    expect(adresseSpaerre(komplet, 1)).toBe("graense-naaet");
  });

  /**
   * DE, DER HAVDE FLERE FØR GRÆNSEN, BEHOLDER DEM. En grænse må spærre for
   * at lave FLERE, aldrig fjerne noget, der står ude i en butik. Derfor
   * `>=` og ikke `===`: med tre adresser skal svaret stadig være nej og
   * ikke et hul, der lader den fjerde slippe igennem.
   */
  it("siger stadig nej, når der er flere end grænsen i forvejen", () => {
    expect(adresseSpaerre(komplet, 3)).toBe("graense-naaet");
  });

  it("svarer på abonnementet FØR grænsen", () => {
    /*
      Rækkefølgen er ikke ligegyldig: en konto uden abonnement og uden
      adresser skal have at vide, at adressen følger med et abonnement —
      ikke at de har brugt en, de aldrig har haft.
    */
    expect(adresseSpaerre(basic, 0)).toBe("intet-abonnement");
    expect(adresseSpaerre(null, 0)).toBe("intet-abonnement");
    expect(adresseSpaerre(basic, 5)).toBe("intet-abonnement");
  });

  it("siger i beskeden, at skiltene IKKE er begrænset", () => {
    /*
      Halvdelen af rettelsen er ordlyden. Den, der trykker 'opret', vil som
      regel bare have et skilt mere ved den anden dør — og må ikke gå
      derfra og tro, at det kræver et køb.
    */
    expect(ADRESSE_TEKSTER.graenseHjaelp).toMatch(/så mange skilte/i);
    expect(ADRESSE_TEKSTER.graenseHjaelp).toMatch(/samme side/i);
  });

  it("har et tal, der kan hæves ét sted", () => {
    // Planen er, at en ekstra adresse bliver en linje mere på det SAMME
    // abonnement. Så skal tallet læses fra virksomheden — og resten af
    // mekanikken skal kunne blive stående.
    expect(ADRESSER_PR_ABONNEMENT).toBe(1);
  });
});
