import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  KATALOG,
  PRODUCTS,
  getProduct,
  harFysiskSkilt,
  hasLoyaltyAccess,
  komplette,
  priceFor,
  KOMPLET_FUNKTIONER,
  kortMaerke,
} from "./constants";
import {
  kanBestillesUdenKonto,
  kraeverDestination,
  canSell,
  toProductJsonLd,
} from "./commerce";

/**
 * LOYALSUM KOMPLET ONLINE — SAMME SOFTWARE, INGEN HARDWARE.
 *
 * Produktreglen er, at Online ikke er en light-udgave: den giver adgang til
 * præcis de samme funktioner som LoyalSum Komplet, og den eneste forskel er
 * det fysiske skilt. Prøverne her passer på begge halvdele af den sætning —
 * for de kan begge to gå i stykker i stilhed.
 *
 * DEN FARLIGE RETNING ER, AT ONLINE BLIVER GLEMT. Kommer der en ny
 * Komplet-funktion, og hænger adgangen på et produktnavn i stedet for på
 * \`includesLoyalSum\`, får den digitale udgave den ikke — og ingen opdager det,
 * før en kunde skriver. Derfor sammenlignes de to varer her ved at SPØRGE
 * systemet om hver funktion, ikke ved at liste dem i hånden.
 */

const ONLINE = getProduct("loyalsum-komplet-online")!;
const KOMPLET = getProduct("loyalsum-komplet")!;
const PRO = getProduct("reviewstander-pro")!;
const BASIS = getProduct("reviewstander")!;

const udenKommentarer = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const kilde = (sti: string) => udenKommentarer(readFileSync(sti, "utf8"));

describe("varen findes og hører til platformen", () => {
  it("står i det offentlige katalog", () => {
    expect(KATALOG.map((p) => p.slug)).toContain("loyalsum-komplet-online");
  });

  it("har det kundevendte navn", () => {
    expect(ONLINE.name).toBe("LoyalSum Komplet Online");
  });

  it("er en af de komplette varer", () => {
    expect(komplette().map((p) => p.slug).sort()).toEqual([
      "loyalsum-komplet",
      "loyalsum-komplet-online",
    ]);
  });
});

describe("samme software som LoyalSum Komplet", () => {
  /*
   * HVER FUNKTION SPØRGES FOR SIG. Listen kommer fra KOMPLET_FUNKTIONER, som
   * er dén, dashboardets spærringer hænger på — så en ny funktion dukker op i
   * prøven af sig selv.
   */
  it("hver Komplet-funktion svarer ens for de to varer", () => {
    expect(KOMPLET_FUNKTIONER.length).toBeGreaterThan(0);
    for (const f of KOMPLET_FUNKTIONER) {
      expect(
        hasLoyaltyAccess(ONLINE.slug),
        `${f.rute} skal være med i ${ONLINE.slug}`,
      ).toBe(hasLoyaltyAccess(KOMPLET.slug));
    }
  });

  it("standerne får IKKE adgang", () => {
    expect(hasLoyaltyAccess(PRO.slug)).toBe(false);
    expect(hasLoyaltyAccess(BASIS.slug)).toBe(false);
  });

  /*
   * OPSLAGENE ER EN AF DE TRE KOMPLET-FUNKTIONER, og de skal følge begge
   * varer. Det var netop dén, der engang slap ud til Pro, fordi
   * `/dashboard/opslag` ikke var spærret.
   */
  it("opslag til sociale medier følger begge Komplet-varer", () => {
    const ruter = KOMPLET_FUNKTIONER.map((f) => f.rute);
    expect(ruter).toContain("opslag");
    for (const p of komplette()) {
      expect(hasLoyaltyAccess(p.slug), p.slug).toBe(true);
    }
  });

  it("månedsprisen er den samme som Komplets softwarepris", () => {
    expect(ONLINE.monthlyPrice).toBe(KOMPLET.monthlyPrice);
  });
});

describe("ingen hardware", () => {
  it("varen er digital", () => {
    expect(harFysiskSkilt(ONLINE)).toBe(false);
    expect(harFysiskSkilt(KOMPLET)).toBe(true);
  });

  it("der er ingen engangspris at betale for en stander", () => {
    expect(ONLINE.price).toBe(0);
    const pris = priceFor(ONLINE, 1);
    expect(pris.oneTimeTotal).toBe(0);
    expect(pris.monthly).toBe(ONLINE.monthlyPrice);
  });

  it("der spørges ikke om en destination ved bestillingen", () => {
    expect(kraeverDestination(ONLINE, null)).toBe(false);
  });

  /*
   * FLOWET UDEN KONTO ER TIL ET TRYKT SKILT. Det spørger om farve, logo og
   * leveringsadresse og sender en pakke; ingen af delene findes her.
   */
  it("købes med en konto og ikke gennem skiltflowet", () => {
    expect(kanBestillesUdenKonto(ONLINE)).toBe(false);
    expect(kanBestillesUdenKonto(KOMPLET)).toBe(true);
  });

  it("checkout sender ingen standerlinje og beder ikke om en adresse", () => {
    const rute = kilde("src/app/api/checkout/route.ts");
    expect(rute).toMatch(/genoptag \|\| !harFysiskSkilt\(product\)\s*\n?\s*\? \[\]/);
    expect(rute).toMatch(
      /\.\.\.\(genoptag \|\| !harFysiskSkilt\(product\)\s*\n?\s*\? \{\}/,
    );
  });

  it("admin kan se, at der ikke skal pakkes noget", () => {
    const side = kilde("src/app/admin/ordrer/[id]/page.tsx");
    expect(side).toContain("erDigital");
    expect(side).toContain("Digital levering");
  });

  it("kundens ordrebekræftelse taler ikke om et skilt", () => {
    const mail = kilde("src/lib/ordrebekraeftelse.ts");
    expect(mail).toMatch(/d\.digital/);
  });

  /*
   * BUY-BOKSEN MÅ IKKE TÆLLE STANDERE, DER IKKE FINDES.
   *
   * MÅLT på /bestil?produkt=loyalsum-komplet-online og på produktsiden, før
   * grenen fandtes: "Antal standere", "Mængderabat fra 3 stk.", "Pris pr.
   * stander 0 kr.", "Standere (1 stk.) 0 kr.", "I alt i dag 0 kr." og "Køb
   * flere, spar mere: 3+ stk. − 10%". Fire af linjerne stod med et NUL, som
   * læses som gratis — lige over abonnementet på 399 kr./md. Et nul er den
   * værste måde at mangle en pris på, fordi det ser ud som et svar.
   *
   * PRØVEN ANKRER PÅ GRENEN OG IKKE PÅ ORDLYDEN. Teksten i den fysiske del
   * skal kunne skrives om, uden at denne prøve fejler; det, der skal være
   * sandt, er at boksen SPØRGER, om varen har et skilt, og at den svarer FØR
   * antalsvælgeren. Kommentarerne er skåret væk, så begrundelsen lige over
   * grenen ikke kan bestå prøven i kodens sted.
   */
  it("buy-boksen har en gren uden stander, og den kommer før antalsvælgeren", () => {
    const boks = kilde("src/components/quantity-order.tsx");
    const gren = boks.indexOf("if (!harFysiskSkilt(product))");
    expect(gren).toBeGreaterThan(-1);

    for (const standerdel of [
      "Antal standere",
      "Pris pr. stander",
      "Køb flere, spar mere",
      "I alt i dag",
    ]) {
      const hvor = boks.indexOf(standerdel);
      expect(hvor, `${standerdel} findes stadig i boksen`).toBeGreaterThan(-1);
      expect(hvor, `${standerdel} tegnes efter grenen`).toBeGreaterThan(gren);
    }
  });

  /*
   * OG KNAPPEN MÅ IKKE LOVE EN TILPASNING. "Tilpas og bestil" peger på farve,
   * logo og link på et skilt, og designeren er spærret ad samme regel — der er
   * ingenting at tilpasse på denne vej.
   */
  it("knappen på den digitale vare lover ikke et design", () => {
    const boks = kilde("src/components/quantity-order.tsx");
    const gren = boks.indexOf("if (!harFysiskSkilt(product))");
    const digital = boks.slice(gren, boks.indexOf("const href =", gren));
    expect(digital).not.toContain("Tilpas");
    expect(digital).toContain("Bestil");
  });

  /*
   * OG DEN STRUKTUREREDE DATA MÅ HELLER IKKE SIGE NUL — ELLER VISE EN STANDER.
   *
   * MÅLT på produktsiden 2026-09-18: JSON-LD'en stod med `"price": 0` og
   * `"image": ".../mockups/stander-loyalsum-komplet.svg"`. Begge dele går til
   * Google og kan ende i et søgeresultat, altså FØR kunden har set siden —
   * en pris på nul kroner og et billede af netop den stander, varen ikke har.
   */
  it("JSON-LD oplyser månedsprisen og ikke et nul", () => {
    const ld = toProductJsonLd(ONLINE) as {
      image: string;
      offers: { price: number; priceSpecification?: { price?: number } };
    };
    expect(ld.offers.price).toBe(ONLINE.monthlyPrice);
    expect(ld.offers.price).toBeGreaterThan(0);
    /* Og den siger, at beløbet er pr. måned — ellers ser 399 ud som en
       engangspris, og vi har byttet ét forkert tal ud med et andet. */
    expect(ld.offers.priceSpecification?.price).toBe(ONLINE.monthlyPrice);

    /* De fysiske varer er URØRT: dér er engangsprisen stadig prisen. */
    const kompletLd = toProductJsonLd(KOMPLET) as {
      offers: { price: number; priceSpecification?: unknown };
    };
    expect(kompletLd.offers.price).toBe(KOMPLET.price);
    expect(kompletLd.offers.priceSpecification).toBeUndefined();
  });

  it("den strukturerede data viser ikke et standerbillede", () => {
    expect(ONLINE.image).not.toContain("stander");
    const ld = toProductJsonLd(ONLINE) as { image: string };
    expect(ld.image).not.toContain("stander");
  });

  /*
   * ET NUL ER IKKE EN PRIS.
   *
   * MÅLT på /produkter, før grenen fandtes: kortet stod med "0 kr. pr.
   * stander + 399 kr./md i abonnement". Det store, fede tal — dét øjet går
   * til først, og det eneste, der kan sammenlignes på tværs af fire kort ved
   * siden af hinanden — var et nul, mens den rigtige pris stod med småt
   * nedenunder. Tre nabokort siger 499 på samme plads, så nullet læses som
   * "gratis".
   *
   * Her prøves TALLET og ikke ordlyden: det, der skal være sandt, er at
   * varens synlige pris er månedsprisen.
   */
  it("kortets pris er månedsprisen og ikke et nul", () => {
    const boks = kilde("src/components/product-price.tsx");
    const gren = boks.indexOf("if (!harFysiskSkilt(product))");
    expect(gren, "der er en gren for varen uden skilt").toBeGreaterThan(-1);

    /* Standerprisen må først tegnes EFTER grenen har svaret. */
    const standerpris = boks.indexOf("formatCurrency(product.price)");
    expect(standerpris).toBeGreaterThan(gren);

    const digital = boks.slice(gren, standerpris);
    expect(digital).toContain("product.monthlyPrice");
    expect(digital).not.toContain("pr. stander");
  });

  /*
   * PLADSHOLDEREN MÅ IKKE TEGNE EN STANDER — OG IKKE LOVE ET FOTO.
   *
   * Der findes ikke noget billede af varen, fordi der ikke er noget at
   * fotografere. Begge billedfelter faldt derfor tilbage på
   * `StanderPlaceholder`, som gør to ting, der er forkerte her: den tegner et
   * skilt med en fod — præcis dét, kunden IKKE får — og den sætter badgen
   * "Foto på vej", som betyder "varen er klar, billedet mangler". Her kommer
   * der aldrig et foto, så løftet ville blive stående for evigt.
   *
   * MÅLT på /produkter/loyalsum-komplet-online, før grenen fandtes: "Foto på
   * vej" stod på siden, under en overskrift der siger "uden fysisk stander".
   */
  it("varen uden stander har sit eget billedfelt uden et løfte om foto", () => {
    const felter = kilde("src/components/product-placeholder.tsx");
    expect(felter).toContain("export function DigitalPlaceholder");

    /* Badgen hører til standerens felt og må ikke være med i det digitale. */
    const digitalt = felter.slice(felter.indexOf("export function DigitalPlaceholder"));
    expect(digitalt).not.toContain("Foto på vej");

    /* Begge de to steder, et produktbillede tegnes, skal vælge felt. */
    for (const sti of [
      "src/app/produkter/page.tsx",
      "src/app/produkter/[slug]/page.tsx",
    ]) {
      const side = kilde(sti);
      expect(side, `${sti} kender det digitale felt`).toContain(
        "DigitalPlaceholder",
      );
      expect(side, `${sti} vælger felt efter varen`).toContain(
        "harFysiskSkilt",
      );
    }
  });

  /*
   * OG FARVETEKSTEN HØRER TIL TRYKKET. "Vælg selv farve på stjernerne uden
   * beregning — og evt. din egen baggrundsfarve mod tillæg" er to valg, man
   * træffer om et SKILT. Målt på produktsiden, før grenen fandtes: linjen
   * stod der, altså et tilvalg med et TILLÆG på en vare, der ikke har det.
   */
  it("farveteksten står kun, hvor der er noget at trykke", () => {
    const side = kilde("src/app/produkter/[slug]/page.tsx");
    const hvor = side.indexOf("FOTO_FARVETEKST}");
    expect(hvor, "farveteksten tegnes på siden").toBeGreaterThan(-1);

    /* Den skal stå inde i en gren, der spørger om et fysisk skilt. */
    const foer = side.slice(Math.max(0, hvor - 200), hvor);
    expect(foer).toContain("harFysiskSkilt(product) ?");
  });

  /*
   * EN NY KUNDE MÅ IKKE FÅ AT VIDE, AT VAREN ER ET TILKØB.
   *
   * /bestil havde ÉN besked til "ingen-virksomhed", og den sagde "Tilkøb
   * hører til en butik, der allerede er kunde". Den var sand med tre varer:
   * hertil kom man kun på noget, der ikke kan købes uden konto, og det var
   * kun "Ekstra stander". LoyalSum Komplet Online kan heller ikke købes
   * gennem skiltflowet — der er intet at trykke og sende — så en helt ny
   * kunde blev mødt af en besked om, at varen krævede en butik, de ikke har.
   *
   * Her prøves EGENSKABEN: ordet "Tilkøb" må kun stå i den gren, der spørger
   * om `addon`. Ordlyden i begge beskeder er fri.
   */
  it("beskeden om tilkøb står kun i tilkøbets egen gren", () => {
    const side = kilde("src/app/bestil/page.tsx");
    const gren = side.indexOf("selected.addon ?");
    expect(gren, "der er en gren for tilkøbet").toBeGreaterThan(-1);

    const tilkoeb = side.indexOf("Tilkøb");
    expect(tilkoeb, "beskeden om tilkøb findes").toBeGreaterThan(-1);
    expect(
      tilkoeb,
      "beskeden om tilkøb står efter grenen, altså inde i den",
    ).toBeGreaterThan(gren);

    /* Og den står kun ÉT sted — ellers er der en kopi uden for grenen. */
    expect(side.split("Tilkøb").length - 1).toBe(1);
  });
});

describe("Stripe er sat op i BEGGE tilstande", () => {
  /*
   * HER STOD DET MODSATTE INDTIL 21. SEPTEMBER 2026, og prøvens egen
   * kommentar sagde, at den skulle udskiftes den dag id'erne kom ind. Det
   * gjorde de: test er lavet af `setup-stripe-products.mjs`, live er oprettet
   * i Stripes dashboard, fordi live-nøglen ligger som `[SENSITIVE]` i Vercel
   * og ikke kan hentes ned.
   *
   * EGENSKABEN ER NU DEN OMVENDTE — og den er vigtigere. "En halv opsætning
   * er værre end ingen": id'er i test og ikke i live giver en købsknap, der
   * virker for os og fejler for enhver rigtig kunde. Tilkøbet "Ekstra
   * stander" stod og gjorde præcis dét indtil 13. september.
   */
  it("har id'er i både test og live", () => {
    expect(ONLINE.stripe?.test?.productId).toBeTruthy();
    expect(ONLINE.stripe?.live?.productId).toBeTruthy();
    expect(ONLINE.stripe?.test?.monthlyPriceId).toBeTruthy();
    expect(ONLINE.stripe?.live?.monthlyPriceId).toBeTruthy();
  });

  it("kan sælges i begge tilstande", () => {
    const foer = process.env.STRIPE_SECRET_KEY;
    for (const noegle of ["sk_test_abc", "sk_live_abc"]) {
      process.env.STRIPE_SECRET_KEY = noegle;
      expect(canSell(ONLINE), noegle).toBe(true);
    }
    if (foer === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = foer;
  });

  /*
   * DER ER INGEN `priceId`, OG DET ER IKKE EN FORGLEMMELSE. De øvrige varer
   * har et engangs-prisobjekt til standeren; her er der ingen stander at
   * betale for. Et prisobjekt på nul kroner ville være et beløb, der KUNNE
   * blive opkrævet — se advarslen om `priceId` i AGENTS.md.
   */
  it("har ingen engangspris, fordi der ikke er en stander", () => {
    expect(ONLINE.price).toBe(0);
    expect(ONLINE.stripe?.test?.priceId).toBeUndefined();
    expect(ONLINE.stripe?.live?.priceId).toBeUndefined();
  });

  /*
   * SCRIPTET FINDER PRODUKTER PÅ `metadata.loyalsum_slug` (`findProduct()`).
   * Live-produktet er oprettet i HÅNDEN i dashboardet, og feltet er sat
   * manuelt dér — uden det ville en senere kørsel med live-nøglen oprette en
   * DUBLET af varen, og kunder ville abonnere på hver sit produkt. Prøven
   * kan ikke se ind i Stripe; den holder fast i, at de to produkt-id'er er
   * forskellige objekter, så ingen kommer til at genbruge test-id'et i live.
   */
  it("test og live er to forskellige produkter", () => {
    expect(ONLINE.stripe?.live?.productId).not.toBe(
      ONLINE.stripe?.test?.productId,
    );
  });
});

describe("teksterne lover kun det, der findes", () => {
  const SIDER = [
    "src/app/loyalsum-komplet-online/page.tsx",
    "src/app/loyalitetsprogram/page.tsx",
    "src/app/stempelkort/page.tsx",
    "src/app/page.tsx",
    "src/lib/constants.ts",
  ];

  /*
   * DER FINDES INGEN WEBSHOP-INTEGRATION. Ikke Shopify, ikke WooCommerce,
   * ingen ordreimport og ingen automatisk pointtildeling. Produktet er DIGITAL
   * ADGANG: et link og en QR-kode, butikken selv deler. En sætning om
   * "integration" ville sælge noget, der ikke er bygget — og det er den slags,
   * en kunde opdager efter købet.
   */
  it("ingen side påstår en integration med et webshopsystem", () => {
    for (const sti of SIDER) {
      const tekst = kilde(sti).toLowerCase();

      /*
       * NAVNENE MÅ NÆVNES — men kun i en sætning, der siger, at vi IKKE
       * integrerer. Derfor kigges der på, hvad der står FORAN navnet: en
       * benægtelse inden for et par linjer. Første udgave af prøven krævede
       * blot, at en benægtelse fandtes et sted på siden, og den ville altså
       * have godkendt "Integrér med Shopify" nederst, fordi der stod "ingen
       * integration" øverst.
       */
      for (const ord of ["shopify", "woocommerce", "magento", "prestashop"]) {
        let fra = tekst.indexOf(ord);
        while (fra !== -1) {
          const foran = tekst.slice(Math.max(0, fra - 200), fra);
          expect(
            /ingen integration|ikke integreret|uden integration/.test(foran),
            `${sti} nævner ${ord} uden at sige, at vi ikke integrerer`,
          ).toBe(true);
          fra = tekst.indexOf(ord, fra + 1);
        }
      }

      expect(
        /integrer(et|es|ing|)? (direkte )?med (din |en )?webshop/.test(tekst),
        `${sti} påstår en webshop-integration`,
      ).toBe(false);
    }
  });

  it("ingen side lover automatiske point fra et webshopkøb", () => {
    for (const sti of SIDER) {
      const tekst = kilde(sti).toLowerCase();
      expect(
        /point (optjenes|gives|tildeles) automatisk/.test(tekst),
        `${sti} lover automatiske point`,
      ).toBe(false);
    }
  });

  /*
   * OG VI PUBLICERER IKKE PÅ SOCIALE MEDIER. Opslagsværktøjet laver billedet
   * og teksten; butikken henter det og deler det selv. Den forskel er hele
   * forskellen på en beskrivelse og et løfte.
   */
  it("ingen side påstår, at LoyalSum publicerer opslag", () => {
    for (const sti of SIDER) {
      const tekst = kilde(sti).toLowerCase();
      expect(
        /(poster|publicerer|slår op) (automatisk )?(på|til) (dine )?sociale medier/.test(
          tekst,
        ),
        `${sti} påstår automatisk publicering`,
      ).toBe(false);
    }
  });

  it("Online-siden siger, at man deler opslaget selv", () => {
    const side = kilde("src/app/loyalsum-komplet-online/page.tsx");
    expect(side).toMatch(/del det selv|deler det selv/);
  });
});

describe("siden kan findes", () => {
  it("står i sitemappet", () => {
    const sitemap = kilde("src/app/sitemap.ts");
    expect(sitemap).toContain("/loyalsum-komplet-online");
  });

  it("er linket fra footeren", () => {
    const footer = kilde("src/components/site-footer.tsx");
    expect(footer).toContain("/loyalsum-komplet-online");
  });

  it("er linket fra forsiden og fra loyalitetsprogram-siden", () => {
    expect(kilde("src/app/page.tsx")).toContain("/loyalsum-komplet-online");
    expect(kilde("src/app/loyalitetsprogram/page.tsx")).toContain(
      "/loyalsum-komplet-online",
    );
  });

  it("har canonical og et delebillede, der ikke er en SVG", () => {
    const side = kilde("src/app/loyalsum-komplet-online/page.tsx");
    expect(side).toContain('canonical: "/loyalsum-komplet-online"');
    expect(side).toContain("openGraph");
    const produktside = kilde("src/app/produkter/[slug]/page.tsx");
    expect(produktside).toContain("/opengraph-image");
  });
});

describe("kataloget er stadig til at forstå", () => {
  it("har fire varer i to familier", () => {
    const standere = KATALOG.filter((p) => !p.includesLoyalSum);
    const platform = KATALOG.filter((p) => p.includesLoyalSum);
    expect(standere.map((p) => p.slug)).toEqual([
      "reviewstander",
      "reviewstander-pro",
    ]);
    expect(platform.map((p) => p.slug)).toEqual([
      "loyalsum-komplet",
      "loyalsum-komplet-online",
    ]);
  });

  /*
   * ALLE FIRE I ÉN RÆKKE — BEGGE STEDER, VARERNE VISES.
   *
   * De stod før i to grupper à to, og så man dem aldrig ved siden af
   * hinanden. Kunden vælger ved at kigge på tværs, så striben er kravet:
   * kataloget OG prissektionen på /bestil tegner alle fire i ét gitter, der
   * går til fire spor på en bærbar.
   *
   * Her prøves EGENSKABEN og ikke klassenavnet: at intet filtrerer varer fra
   * (`KATALOG.map`, ikke `KATALOG.filter`), og at gitteret har et fire-spors
   * trin. Ordlyden i overskrifterne er fri.
   */
  it("begge produktgitre viser hele kataloget", () => {
    for (const sti of [
      "src/app/produkter/page.tsx",
      "src/components/pricing.tsx",
    ]) {
      const side = kilde(sti);
      expect(side, `${sti} tegner hele kataloget`).toMatch(
        /KATALOG\.map\(\(p, nr\) =>/,
      );
      expect(
        side.includes("KATALOG.filter(harFysiskSkilt).map"),
        `${sti} må ikke filtrere varer ud af gitteret`,
      ).toBe(false);
    }
  });

  it("gitrene går til fire spor", () => {
    for (const sti of [
      "src/app/produkter/page.tsx",
      "src/components/pricing.tsx",
    ]) {
      const side = kilde(sti);
      expect(side, `${sti} har et fire-spors trin`).toMatch(
        /grid-cols-4/,
      );
      /* Billedernes `sizes` skal følge gitteret — ellers hentes et billede
         til en tredjedels bredde ned i en fjerdedels kolonne. */
      expect(side, `${sti}: sizes følger gitteret`).toContain("25vw");
    }
  });

  /*
   * OG FORSKELLEN SKAL STADIG KUNNE SES. Gruppeoverskrifterne var dét, der
   * sagde "stander" kontra "platform". Uden dem skal kortet selv sige det:
   * pladsholderen er en QR-kode frem for et skilt, og prisen står som et
   * abonnement frem for "pr. stander".
   */
  it("kortet siger selv, at varen ikke har en stander", () => {
    for (const sti of [
      "src/app/produkter/page.tsx",
      "src/components/pricing.tsx",
    ]) {
      expect(kilde(sti), `${sti} vælger pladsholder efter varen`).toContain(
        "DigitalPlaceholder",
      );
    }
    expect(ONLINE.features).toContain("Uden fysisk stander");
  });

  /*
   * TILKØBET TÆLLER IKKE MED. Det er ikke et selvstændigt tilbud og har
   * hverken produktside eller plads i kataloget.
   */
  it("tilkøbet står stadig uden for kataloget", () => {
    const tilkoeb = PRODUCTS.filter((p) => p.addon);
    expect(tilkoeb.length).toBeGreaterThan(0);
    for (const p of tilkoeb) {
      expect(KATALOG.map((k) => k.slug)).not.toContain(p.slug);
    }
  });

  /*
   * MÆRKET MÅ IKKE SIGE "KOMPLET" PÅ DEN DIGITALE VARE.
   *
   * Det kom af `includesLoyalSum` og var sandt for begge Komplet-varer — men
   * LoyalSum Komplet er `featured` og bærer "Mest populær", så i kataloget
   * stod ordet i praksis KUN på Online, lige ved siden af den vare, der
   * hedder Komplet. På et blik siger det, at den anden ikke er den komplette.
   *
   * Prøven spørger til egenskaben og ikke til ordet "Digital": et andet ord
   * må gerne vælges, men det må ikke være pakkens navn.
   */
  it("den digitale vares mærke låner ikke den anden vares navn", () => {
    const maerke = kortMaerke(ONLINE);
    expect(maerke, "den digitale vare har et mærke").toBeTruthy();
    expect(maerke!.tekst.toLowerCase()).not.toContain("komplet");
  });

  it("mærket tegnes ét sted og ikke i hver gren af kortet", () => {
    /* Kortet har en foto-gren og en pladsholder-gren. Stod if-kæden i dem
       begge, ville den ene kunne rettes uden den anden — og i den gren, der
       ikke blev rettet, ville "Komplet" blive stående. */
    const side = kilde("src/app/produkter/page.tsx");
    expect(side, "siden spørger hjælperen").toContain("kortMaerke(");
    expect(side, "ingen mærketekst skrevet ud i grenene").not.toMatch(
      />\s*Komplet\s*</,
    );
  });
});
