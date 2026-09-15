import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  harAbonnement,
  adresseSpaerre,
  adresserTilladt,
  kanKoebeAdresseSelv,
  prisPrAdresse,
  ADRESSER_PR_ABONNEMENT,
  ADRESSER_SELVBETJENING_MAKS,
  ADRESSE_TEKSTER,
  enesteAdresse,
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
 *
 * SIDEN 0034 KAN TALLET KØBES OP. `adresser_tilladt` siger, hvor mange
 * abonnementet dækker, og en butik mere er en linje mere på det SAMME
 * abonnement — ét login, ét stempelkort på tværs.
 */
describe("hvor mange QR-adresser følger der med", () => {
  const pro = { product_slug: "reviewstander-pro" };
  const komplet = { product_slug: "loyalsum-komplet" };
  const basic = { product_slug: "reviewstander" };

  it("lukker den første igennem på begge abonnementsvarer", () => {
    expect(adresseSpaerre(pro, 0)).toBeNull();
    expect(adresseSpaerre(komplet, 0)).toBeNull();
  });

  it("afviser den anden — men peger på købet og ikke på en blind mur", () => {
    expect(adresseSpaerre(komplet, 1)).toBe("kan-koebes");
  });

  /**
   * DET KØBTE TAL GÆLDER. Har kunden betalt for to adresser, skal den anden
   * kunne oprettes gratis — ellers ville de blive bedt om at købe noget, de
   * lige har købt.
   */
  it("lader en købt adresse blive oprettet uden at koste igen", () => {
    const toButikker = { ...komplet, adresser_tilladt: 2 };
    expect(adresseSpaerre(toButikker, 1)).toBeNull();
    expect(adresseSpaerre(toButikker, 2)).toBe("kan-koebes");
  });

  /**
   * DE, DER HAVDE FLERE FØR GRÆNSEN, BEHOLDER DEM — MEN KAN IKKE KØBE MED ET
   * KLIK.
   *
   * To virksomheder nåede at oprette mere end én adresse, før grænsen kom.
   * De beholder hver eneste af dem; en grænse må aldrig fjerne noget, der
   * står ude i en butik. Men `adresser_tilladt` skal blive ved at svare til
   * antallet hos Stripe (se migration 0034), og et køb ville hæve begge tal
   * og stille dem en regning for noget, de allerede har. Derfor et menneske.
   */
  it("sender den, der har flere end betalt for, til os", () => {
    expect(adresseSpaerre(komplet, 3)).toBe("kontakt-os");
  });

  /**
   * LOFTET ER IKKE TEKNISK. Valget mellem 'én virksomhed med mange linjer'
   * og 'en virksomhed pr. butik' afgør, om stempelkortet deles på tværs —
   * og det kan ikke gøres om bagefter. Det spørgsmål kan et klik ikke rumme.
   */
  it("standser selvbetjeningen ved loftet", () => {
    const fireKoebt = { ...komplet, adresser_tilladt: 4 };
    expect(adresseSpaerre(fireKoebt, 4)).toBe("kan-koebes");

    const vedLoftet = {
      ...komplet,
      adresser_tilladt: ADRESSER_SELVBETJENING_MAKS,
    };
    expect(adresseSpaerre(vedLoftet, ADRESSER_SELVBETJENING_MAKS)).toBe(
      "kontakt-os",
    );
  });

  /**
   * LOFTET MÅLES PÅ DET BETALTE OG IKKE PÅ DET OPRETTEDE. Ellers kunne en
   * butik, der har slettet en adresse, købe sig forbi loftet én ad gangen.
   */
  it("måler loftet på de linjer, der betales for", () => {
    const vedLoftet = {
      ...komplet,
      adresser_tilladt: ADRESSER_SELVBETJENING_MAKS,
    };
    // Færre oprettede end betalte: der er plads, og der skal ikke købes.
    expect(adresseSpaerre(vedLoftet, 1)).toBeNull();
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

  /**
   * KØBSTEKSTEN SÆLGER EN BUTIK OG IKKE EN ADRESSE — og den SKAL sige, at
   * stempelkortet gælder på tværs. Det er hele forskellen på de to modeller,
   * og det er dét, kunden betaler for frem for et abonnement nummer to.
   */
  it("siger, hvad man køber: en butik med delt stempelkort", () => {
    expect(ADRESSE_TEKSTER.koebHjaelp).toMatch(/stempelkort/i);
    expect(ADRESSE_TEKSTER.koebHjaelp).toMatch(/på tværs/i);
    expect(ADRESSE_TEKSTER.koebHjaelp).toMatch(/abonnement/i);
  });

  it("forklarer, hvorfor loftet er en samtale og ikke et nej", () => {
    expect(ADRESSE_TEKSTER.loftHjaelp).toMatch(/stempelkort/i);
    expect(ADRESSE_TEKSTER.loftHjaelp).toMatch(/ikke laves om/i);
  });

  it("falder tilbage på én, når kolonnen ikke siger noget", () => {
    // Kolonnen er valgfri i typen, så ældre kaldesteder og testdata ikke
    // skal kende den. Et manglende tal betyder dét, der altid har været
    // sandt: der følger én adresse med.
    expect(adresserTilladt(null)).toBe(ADRESSER_PR_ABONNEMENT);
    expect(adresserTilladt({})).toBe(ADRESSER_PR_ABONNEMENT);
    expect(adresserTilladt({ adresser_tilladt: 0 })).toBe(
      ADRESSER_PR_ABONNEMENT,
    );
    expect(adresserTilladt({ adresser_tilladt: 3 })).toBe(3);
  });

  /**
   * PRISEN PÅ ADRESSE NR. 2 ER PRISEN PÅ ADRESSE NR. 1 — ingen mængderabat.
   * En kæde får MERE pr. butik end den enkelte café (ét stempelkort på
   * tværs, ét overblik), og en rabat ville sige det modsatte af det,
   * produktet gør. Det er også dét, der gør, at købet kan være ANTALLET på
   * den månedslinje, der allerede kører, frem for en ny vare i Stripe.
   */
  it("koster det samme som den første adresse", () => {
    for (const p of PRODUCTS.filter((x) => x.monthlyPrice && !x.addon)) {
      expect(prisPrAdresse({ product_slug: p.slug }), p.slug).toBe(
        p.monthlyPrice,
      );
    }
    expect(prisPrAdresse(basic)).toBeNull();
    expect(prisPrAdresse(null)).toBeNull();
  });

  /**
   * EN ABONNEMENTSVARE ER IKKE DET SAMME SOM ET ABONNEMENT HOS STRIPE.
   *
   * To virksomheder har en abonnementsvare, der er sat i hånden i admin,
   * uden at der nogensinde er oprettet noget hos Stripe. For dem er der
   * ingen linje at hæve, og en knap, der altid fejler, er værre end ingen
   * knap. Det samme gælder et suspenderet abonnement: betalingen skal på
   * plads, før der lægges en prorata oven i en ubetalt regning.
   */
  it("lader ikke en kunde uden et abonnement hos Stripe købe selv", () => {
    const betalende = {
      stripe_subscription_id: "sub_123",
      stripe_status: "active",
    };
    expect(kanKoebeAdresseSelv(betalende)).toBe(true);
    expect(
      kanKoebeAdresseSelv({ ...betalende, stripe_status: "trialing" }),
    ).toBe(true);

    // Sat op i hånden: varen er der, abonnementet er ikke.
    expect(
      kanKoebeAdresseSelv({ stripe_subscription_id: null, stripe_status: null }),
    ).toBe(false);
    // Suspenderet: betalingen skal på plads først.
    expect(
      kanKoebeAdresseSelv({ ...betalende, stripe_status: "past_due" }),
    ).toBe(false);
    expect(kanKoebeAdresseSelv(null)).toBe(false);
  });

  it("har et tal, der kan hæves ét sted", () => {
    // Starttallet: hvad der følger med, før der er købt noget til.
    expect(ADRESSER_PR_ABONNEMENT).toBe(1);
    // Og loftet for, hvor langt kunden selv kan gå.
    expect(ADRESSER_SELVBETJENING_MAKS).toBeGreaterThan(
      ADRESSER_PR_ABONNEMENT,
    );
  });
});

/**
 * HVILKEN ADRESSE SKAL ET NYT SKILT TRYKKES MED?
 *
 * Et skilt uden adresse får skabelonens pladsholder, og admin må spørge
 * kunden. Det var rigtigt, dengang en butik kunne have mange adresser — et
 * skilt med en FORKERT kode er værre end et med en pladsholder. Med én
 * adresse er der ikke noget at gætte.
 */
describe("enesteAdresse", () => {
  it("svarer med adressen, når der er præcis én", () => {
    expect(enesteAdresse(["a"])).toBe("a");
  });

  it("gætter ikke, når der er flere", () => {
    /*
      De to virksomheder med flere adresser fra før grænsen skal stadig
      spørges. Et gæt her ville trykke en QR-kode, kunden ikke bad om — og
      et skilt kan ikke kaldes tilbage.
    */
    expect(enesteAdresse(["a", "b"])).toBeNull();
  });

  it("svarer null uden adresser", () => {
    expect(enesteAdresse([])).toBeNull();
  });
});
