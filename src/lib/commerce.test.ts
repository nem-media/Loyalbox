import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  canSell,
  canStartCheckout,
  koebSpaerre,
  isTestBuyer,
  stripeMode,
  skalOpretteFoersteStander,
} from "./commerce";
import { getProduct, STRIPE_TAX_RATES, type Product } from "./constants";

/**
 * Spærren mod et halvfærdigt tilstandsskifte.
 *
 * Test og live er adskilte verdener i Stripe. Skifter man nøgle uden først at
 * køre scripts/setup-stripe-products.mjs, fejler salget på tre måder der ALLE
 * er stille — derfor er de dækket her og ikke overladt til en faktura.
 */

const KOMPLET = getProduct("loyalsum-komplet")!;
/** CVR'et er med, fordi købsspærren nu kræver et gyldigt — se koebSpaerre. */
const ejer = {
  email: "komplet@loyalbox.test",
  company: { cvr: "37811769" },
};

/** Samme vare, men uden id'er i nogen tilstand. */
function udenIds(p: Product): Product {
  return { ...p, stripe: undefined };
}

/** Samme vare, men kun oprettet i test — som før live-id'erne blev lagt ind. */
function kunTest(p: Product): Product {
  return { ...p, stripe: { test: p.stripe!.test } };
}

let oprindeligNøgle: string | undefined;
let oprindeligSats: string | undefined;

beforeEach(() => {
  oprindeligNøgle = process.env.STRIPE_SECRET_KEY;
  oprindeligSats = STRIPE_TAX_RATES.test;
});

afterEach(() => {
  if (oprindeligNøgle === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = oprindeligNøgle;
  STRIPE_TAX_RATES.test = oprindeligSats;
});

describe("stripeMode", () => {
  it("afgøres af nøglen — alt andet end sk_live_ er test", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    expect(stripeMode()).toBe("live");
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    expect(stripeMode()).toBe("test");
    delete process.env.STRIPE_SECRET_KEY;
    expect(stripeMode()).toBe("test");
  });
});

describe("canSell", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
  });

  it("sælger varen når produkt, månedspris og moms findes", () => {
    expect(canSell(KOMPLET)).toBe(true);
  });

  it("nægter når produktet ikke er oprettet i tilstanden", () => {
    expect(canSell(udenIds(KOMPLET))).toBe(false);
  });

  it("nægter når månedsprisen mangler — ellers blev abonnementet et engangskøb", () => {
    const udenMåned: Product = {
      ...KOMPLET,
      stripe: { test: { ...KOMPLET.stripe!.test!, monthlyPriceId: undefined } },
    };
    expect(canSell(udenMåned)).toBe(false);
  });

  it("nægter når momssatsen mangler — ellers blev der ikke opkrævet moms", () => {
    STRIPE_TAX_RATES.test = undefined;
    expect(canSell(KOMPLET)).toBe(false);
  });

  it("nægter en vare der kun er oprettet i test, når vi kører live", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    expect(canSell(kunTest(KOMPLET))).toBe(false);
  });

  it("sælger i live, når varen er oprettet i live", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    expect(canSell(KOMPLET)).toBe(true);
  });
});

describe("canStartCheckout", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
  });

  it("lukker testkonti med virksomhed igennem i testtilstand", () => {
    expect(canStartCheckout(ejer, KOMPLET)).toBe(true);
  });

  it("afviser en rigtig kunde i testtilstand", () => {
    expect(
      canStartCheckout({ ...ejer, email: "cafe@eksempel.dk" }, KOMPLET),
    ).toBe(false);
  });

  it("afviser uden virksomhed — også admin, der aldrig har en", () => {
    expect(
      canStartCheckout(
        { email: "admin@loyalbox.test", company: null },
        KOMPLET,
      ),
    ).toBe(false);
    expect(canStartCheckout(null, KOMPLET)).toBe(false);
  });

  it("afviser når ingen vare er valgt", () => {
    expect(canStartCheckout(ejer, undefined)).toBe(false);
  });

  it("holder knappen lukket i live for en vare, der kun findes i test", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    expect(
      canStartCheckout(
        { ...ejer, email: "cafe@eksempel.dk" },
        kunTest(KOMPLET),
      ),
    ).toBe(false);
  });

  it("lukker en helt almindelig kunde ind i live", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    expect(
      canStartCheckout({ ...ejer, email: "cafe@eksempel.dk" }, KOMPLET),
    ).toBe(true);
  });

  /**
   * CVR SPÆRRER IKKE. Kravet blev fjernet bevidst: vi sælger stadig kun til
   * virksomheder, men Stripe spørger selv om momsnummeret ved betalingen, og
   * momsen opkræves via en fast sats uanset hvad. At afvise en betaling,
   * fordi kunden ikke havde nummeret ved hånden, kostede mere end det
   * beskyttede.
   *
   * Testen står tilbage VENDT OM, så en genindførelse i `koebSpaerre()` uden
   * en beslutning bliver fanget — også for et ugyldigt nummer, som er den
   * nemmeste at komme til at spærre på igen.
   */
  it("spærrer IKKE på et manglende eller forkert CVR", () => {
    for (const cvr of [null, undefined, "", "1234", "37811768"]) {
      expect(
        canStartCheckout({ ...ejer, company: { cvr } }, KOMPLET),
        String(cvr),
      ).toBe(true);
    }
  });
});

describe("koebSpaerre og den manglende Stripe-nøgle", () => {
  it("lukker for køb, når der slet ikke er en Stripe-nøgle", () => {
    // DET VAR EN RIGTIG FEJL I DRIFT. Uden nøglen falder stripeMode() tilbage
    // til "test", canSell() siger ja (id'erne står jo i constants.ts), og
    // knappen så helt normal ud — men stripe() kaster ved første kald, og
    // /api/checkout svarede 500 for enhver, der trykkede.
    delete process.env.STRIPE_SECRET_KEY;
    expect(koebSpaerre(ejer, KOMPLET)).toBe("ikke-aabnet");
    expect(canStartCheckout(ejer, KOMPLET)).toBe(false);
  });

  it("åbner igen, så snart nøglen er der", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    expect(koebSpaerre(ejer, KOMPLET)).toBeNull();
  });
});

describe("koebSpaerre", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
  });

  it("siger hvad der er i vejen, så beskeden kan blive brugbar", () => {
    expect(koebSpaerre(ejer, KOMPLET)).toBeNull();
    expect(koebSpaerre({ ...ejer, company: null }, KOMPLET)).toBe(
      "ingen-virksomhed",
    );
    expect(koebSpaerre(ejer, undefined)).toBe("ikke-aabnet");
    // Uden CVR er der intet i vejen — se testen ovenfor for hvorfor.
    expect(
      koebSpaerre({ ...ejer, company: { cvr: null } }, KOMPLET),
    ).toBeNull();
  });

  it("lukker stadig for salg i et miljø, hvor der ikke kan købes", () => {
    expect(
      koebSpaerre(
        { email: "cafe@eksempel.dk", company: { cvr: null } },
        KOMPLET,
      ),
    ).toBe("ikke-aabnet");
  });
});

describe("isTestBuyer", () => {
  it("kender seed-domænet, uanset store bogstaver", () => {
    expect(isTestBuyer("Komplet@LoyalBox.test")).toBe(true);
    expect(isTestBuyer("cafe@eksempel.dk")).toBe(false);
    expect(isTestBuyer(null)).toBe(false);
  });
});

/**
 * Den første stander oprettes af købet, ikke af kunden.
 *
 * FEJLEN, DER LURER HER, ER DOBBELTOPRETTELSE. Stripe gentager en webhook,
 * hvis den ikke svarer hurtigt nok — og en kunde, der får en ny stander for
 * hvert forsøg, opdager det først som en liste med fire ens.
 *
 * Den anden fejl er den modsatte: fjerner nogen `erAbonnement`, får en
 * Reviewstander-kunde uden abonnement en QR-adresse, de ikke har betalt for,
 * og som deres side alligevel viderestiller fra.
 */
describe("skalOpretteFoersteStander", () => {
  const grund = {
    erAbonnement: true,
    ordreHarStander: false,
    antalStandere: 0,
  };

  it("opretter ved et abonnementskøb uden valgt stander", () => {
    expect(skalOpretteFoersteStander(grund)).toBe(true);
  });

  /** IDEMPOTENSEN. Anden gang Stripe kalder, findes standeren allerede. */
  it("opretter IKKE, når virksomheden allerede har en", () => {
    expect(
      skalOpretteFoersteStander({ ...grund, antalStandere: 1 }),
    ).toBe(false);
    expect(
      skalOpretteFoersteStander({ ...grund, antalStandere: 7 }),
    ).toBe(false);
  });

  it("overtrumfer ikke en stander, kunden selv har valgt", () => {
    expect(
      skalOpretteFoersteStander({ ...grund, ordreHarStander: true }),
    ).toBe(false);
  });

  /**
   * Et engangskøb af Reviewstander og et tilkøb af et ekstra skilt kommer
   * begge hertil uden abonnement. Ingen af dem giver en QR-adresse.
   */
  it("opretter ikke uden abonnement", () => {
    expect(
      skalOpretteFoersteStander({ ...grund, erAbonnement: false }),
    ).toBe(false);
  });
});
