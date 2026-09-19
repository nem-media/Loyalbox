import {
  EGEN_FRONTFARVE_PRIS,
  STANDARD_STANDERFARVE,
  standerTillaeg,
  type StanderFarve,
} from "@/lib/stander-tilvalg";

export const SITE_NAME = "LoyalSum.dk";

/**
 * Brandet uden domæneendelse — dét, en kunde kalder os.
 *
 * BRUGES DÉR, HVOR VI SKRIVER SOM OS SELV: hilsenen i ordrebekræftelsen og
 * lignende. `SITE_NAME` er sitets navn og hører hjemme i titler og manifest;
 * `COMPANY.legalName` er selskabet og hører hjemme dér, hvor det ER et krav
 * — faktura, footer, databehandleraftale, privatlivspolitik. En kunde, der
 * har købt hos LoyalSum, skal ikke have en mail underskrevet af et navn, de
 * aldrig har set.
 */
export const BRAND_NAVN = SITE_NAME.replace(/\.dk$/, "");
export const SITE_TAGLINE =
  "Anmeldelser, loyalitet, feedback og synlighed samlet i én platform — så lokale forretninger får flere nye kunder og flere genbesøg.";

/**
 * SELSKABSOPLYSNINGER — UDFYLD FØR LIVE
 *
 * Det er et lovkrav (e-handelsloven), at selskabsnavn, CVR og adresse fremgår
 * af sitet, og Stripe kontrollerer det samme, når en konto skal godkendes til
 * rigtige betalinger. Felter markeret UDFYLD vises som en tydelig markering på
 * siderne i stedet for at blive udeladt i stilhed — så kan de ikke glemmes.
 *
 * Bruges af footeren, handelsbetingelserne og privatlivspolitikken.
 */
export const COMPANY = {
  legalName: "Nem Media ApS",
  cvr: "37811769",
  address: "Spotorno Allé 4",
  postalCode: "2630",
  city: "Høje Taastrup",
  email: "kontakt@loyalsum.dk",
  /** Tom = telefon vises ikke. */
  phone: "",
  /** Hvor lang tid går der typisk, fra bestilling til standeren er sendt? */
  deliveryDays: "3–5 hverdage",
} as const;

/**
 * Handelsbetingelsernes version og dato.
 *
 * Accepten gemmes MED versionen på virksomheden ved købet, præcis som
 * databehandleraftalen (se DPA_VERSION). Uden det kan vi ikke svare på, hvilke
 * vilkår en kunde faktisk sagde ja til — og et vilkår, ingen kan bevise blev
 * accepteret, er ikke meget værd i en tvist.
 *
 * Hæv versionen, når et vilkår ændres materielt, og ret datoen med.
 */
// 1.3 (2026-08-26): CVR er ikke længere et krav for at bestille. Vi sælger
// stadig kun til virksomheder, men §1 lovede en spærre, der ikke findes mere,
// og §2 lovede et nummer på fakturaen, vi ikke altid har.
// 1.4 (2026-08-28): §1 lukkede døren for en privatperson, men handlen er
// erhvervskøb uanset hvem der trykker — og en, der er ved at starte op, har
// endnu intet CVR-nummer at vise. Vilkåret siger nu, hvad KØBET er, i stedet
// for hvem køberen ikke må være. Hvem der kan indgå aftalen er materielt,
// derfor en ny version og ikke bare en rettet formulering.
// 1.5 (2026-09-15): §2 lovede "en fast månedlig pris, uanset hvor mange
// standere du har" og sagde intet om ADRESSER. Skilte er stadig ubegrænsede,
// men en butik mere er nu en linje mere på det samme abonnement — og et
// vilkår, der ikke nævner en betaling, kunden kan komme til at foretage, er
// et forkert vilkår. Afsnittet siger nu, hvad abonnementet dækker, hvad en
// adresse mere koster, hvordan den faktureres midt i en måned, og at der
// følger et skilt med.
export const TERMS_VERSION = "1.5";
export const TERMS_DATE = "2026-09-15";

/**
 * Hvor vi sælger og leverer.
 *
 * Danmark alene, og det er et bevidst valg med to grunde. Momsen lægges på som
 * en fast dansk sats (se STRIPE_TAX_RATES): sælges der til en momsregistreret
 * køber i et andet EU-land, ville satsen være forkert, og fakturaen ubrugelig
 * for begge parter. Og standeren er en fysisk vare, der skal sendes.
 *
 * Skal der sælges uden for Danmark en dag, er det ikke en linje her — det er
 * momshåndtering og fragt, og begge dele skal bygges først.
 */
/**
 * Den faste trækdato for abonnementer.
 *
 * ÉT STED, fordi tre ting skal være enige: `nextBillingAnchor()` sætter
 * ankeret hos Stripe, bestillingen forklarer kunden hvorfor første betaling
 * er mindre, og ordrebekræftelsen gentager det. Stod tallet tre steder, ville
 * en flyttet trækdato efterlade to tekster, der lover noget andet, end der
 * bliver trukket — og dét opdages først på en kontoudskrift.
 */
export const TRAEKDAG = 20;

/**
 * HVORFOR FØRSTE BETALING IKKE ER MÅNEDSPRISEN.
 *
 * Stripe fakturerer perioden fra købet frem til trækdatoen med det samme
 * (pro rata) og trækker derefter fuld pris. Uden en forklaring ser det ud
 * som et vilkårligt beløb, og et beløb, kunden ikke kan genkende, er dét,
 * indsigelser og opkald er lavet af.
 */
export const PRORATA_FORKLARING = `Ved købet betaler du kun for dagene frem til den ${TRAEKDAG}. Derefter trækkes abonnementet fast den ${TRAEKDAG}. i hver måned.`;

export const LEVERINGSLANDE = ["DK"] as const;
export const LEVERINGSLAND_NAVN = "Danmark";

/** True hvis feltet stadig venter på en rigtig værdi. */
export function mangler(v: string): boolean {
  return !v || v === "UDFYLD";
}

/**
 * Målsøgeord kunder skal finde os på (organisk + Shopping). Dækker begge motorer:
 * loyalitet/stempelkort OG anmeldelser. Væves naturligt ind i titler/beskrivelser
 * — ikke keyword-stuffing.
 */
export const SEO_KEYWORDS = [
  // Platformen (forsidens semantiske tyngdepunkt)
  "kundeloyalitet",
  "kunderelationer",
  "flere genbesøg",
  "kundeklub til lokale virksomheder",
  "online synlighed lokal virksomhed",
  // Loyalitet / stempelkort
  "digitalt stempelkort",
  "stempelkort uden app",
  "stempelkort til café",
  "loyalitetsprogram lille virksomhed",
  "kundeklub",
  "NFC stempelkort",
  "digitalt loyalitetskort",
  // Anmeldelser
  "reviewstander",
  "review stander",
  "google review skilt",
  "flere google anmeldelser",
  "anmeldelsesstander",
  "QR anmeldelse skilt",
];

export type Tier = "basic" | "premium" | "pro";

/** Capabilities that a company's plan unlocks in the control panel. */
export type Capability =
  | "customBranding" // eget logo + tilpasset design
  | "feedbackInbox" // se privat feedback i dashboardet
  | "statistics" // scan-/klik-/rating-statistik
  | "reputation" // omdømme: Reputation Score, eksterne profiler, historik
  | "dynamicLinks"; // skift destination + flere destinationstyper

export const TIER_CAPABILITIES: Record<Tier, Record<Capability, boolean>> = {
  basic: {
    customBranding: false,
    feedbackInbox: false,
    statistics: false,
    reputation: false,
    dynamicLinks: false,
  },
  premium: {
    customBranding: true,
    feedbackInbox: false,
    statistics: false,
    reputation: false,
    dynamicLinks: false,
  },
  pro: {
    customBranding: true,
    feedbackInbox: true,
    statistics: true,
    reputation: true,
    dynamicLinks: true,
  },
};

/** Danske labels til hvad et niveau låser op — vises i dashboardet. */
export const CAPABILITY_LABELS: Record<Capability, string> = {
  customBranding: "Eget logo og design på kundens side",
  feedbackInbox: "Privat feedback-indbakke",
  reputation: "Omdømme og Reputation Score",
  statistics: "Statistik i realtid",
  dynamicLinks: "Skift links når som helst + flere platforme",
};

/** En sætning pr. funktion — så en kunde forstår, hvad den dækker. */
export const CAPABILITY_HELP: Record<Capability, string> = {
  customBranding:
    "Dit eget logo og farver på den side, kunderne lander på, når de scanner.",
  dynamicLinks:
    "Skift hvor QR-koden fører hen når som helst — uden et nyt tryk — og brug flere anmeldelsesplatforme.",
  feedbackInbox:
    "Læs kundernes private feedback i dashboardet, også den der ikke bliver til en offentlig anmeldelse.",
  statistics:
    "Følg scanninger, klik til anmeldelse og gennemsnitlig bedømmelse i realtid.",
  reputation:
    "Reputation Score, eksterne profiler og udviklingen i dit omdømme over tid.",
};

export const CAPABILITY_ORDER: Capability[] = [
  "customBranding",
  "dynamicLinks",
  "feedbackInbox",
  "statistics",
  "reputation",
];

/**
 * PREMIUM TILDELES ALDRIG AF ET KØB. `planForProduct()` svarer kun `pro`
 * (abonnement) eller `basic` (alt andet), så ingen virksomhed kan ende der
 * ad den vej.
 *
 * Niveauet bliver alligevel stående: `company_plan` er en Postgres-enum
 * (migration 0003) med præcis de tre værdier, og fjernes det her, kan typen
 * ikke længere beskrive, hvad kolonnen må indeholde. Det kan også sættes i
 * hånden i admin.
 *
 * Det er altså IKKE et produkt og må aldrig vises som et. Skal en vare give
 * mellemniveauet, er stedet `planForProduct()` — ikke en liste et sted i UI.
 */
export const TIER_LABELS: Record<Tier, string> = {
  basic: "Basic",
  premium: "Premium",
  pro: "Pro",
};

export const TIER_ORDER: Tier[] = ["basic", "premium", "pro"];

/**
 * Niveauerne, en administrator må vælge i hånden.
 *
 * `premium` er IKKE med. Ingen vare giver det, og det stod alligevel i
 * vælgeren mellem basic og pro, hvor det ligner det naturlige mellemtrin —
 * så en rigtig kunde, der blev solgt LoyalSum Komplet manuelt, endte dér og
 * mistede feedback-indbakke, statistik og dynamiske links.
 *
 * Niveauet bliver i `TIER_ORDER` og i typen, fordi `company_plan` er en
 * Postgres-enum med de tre værdier, og rækker kan stå med det.
 */
export const VALGBARE_NIVEAUER: Tier[] = ["basic", "pro"];

/** True if the given tier unlocks the capability. Unknown tier → basic. */
export function tierCan(
  tier: Tier | null | undefined,
  cap: Capability,
): boolean {
  return TIER_CAPABILITIES[tier ?? "basic"]?.[cap] ?? false;
}

export type Platform =
  "google" | "trustpilot" | "tripadvisor" | "facebook" | "multi";

export type StripeMode = "test" | "live";

export interface StripeIds {
  productId: string;
  /**
   * Engangsbeløbet (standeren) som et GEMT prisobjekt hos Stripe.
   *
   * DET BRUGES IKKE TIL AT OPKRÆVE NOGET, og det er vigtigt at vide, før man
   * gør det. Standerlinjen sendes som `price_data` med en enhedspris, der
   * REGNES UD af `priceFor()` — fordi beløbet afhænger af antallet
   * (`VOLUME_DISCOUNTS`) og af standerfarven (`SORT_STANDER_TILLAEG`), og et
   * fast prisobjekt kan ikke bære en mængderabat. Kun `productId` bruges fra
   * denne blok ved et engangskøb, så varens NAVN står rigtigt på fakturaen.
   *
   * MÅLT 2026-09-16: prisobjekterne i testtilstand står på **399 kr**, mens
   * kataloget — og den offentlige produktside, og det kunden opkræves — står
   * på **499 kr**. Tallet i Stripe er efterladt fra dengang standeren kostede
   * 399, og det er harmløst netop så længe ingen tager det i brug.
   *
   * SKIFTER NOGEN LINJEN TIL `price: ids.priceId`, ville hver eneste kunde
   * blive opkrævet 100 kr for lidt, uden at noget som helst fejlede.
   * `pris-graenseflade.test.ts` er sat til at fange præcis dét.
   *
   * `monthlyPriceId` er en anden sag: den BRUGES, og live-priserne er
   * efterprøvet i Stripes dashboard (Pro 99 kr/md, Komplet 399 kr/md).
   *
   * VALGFRI, FORDI EN VARE KAN VÆRE REN SOFTWARE. Feltet var påkrævet, så
   * længe hver vare havde en stander at lægge et engangsbeløb på. LoyalSum
   * Komplet Online har ingen, og alternativet til at gøre feltet valgfrit var
   * at opfinde et prisobjekt på nul kroner — altså at gemme et beløb, der
   * ville blive opkrævet, hvis nogen en dag gjorde dét, advarslen ovenfor
   * handler om. Mangler den, er det fordi varen ikke HAR en engangspris;
   * `commerce.test.ts` kræver stadig, at den er der, når `price > 0`.
   */
  priceId?: string;
  /** Det månedlige abonnement. Kun på abonnementsvarer. BRUGES ved købet. */
  monthlyPriceId?: string;
}

export interface Product {
  slug: string;
  platform: Platform;
  name: string;
  /** Primært SEO-søgeord for produktets side. */
  keyword: string;
  /** Valgfri override til <title>; ellers bruges name. */
  metaTitle?: string;
  /**
   * Valgfri override til meta description.
   *
   * `description` er skrevet til at stå PÅ siden og er derfor for lang til et
   * søgeresultat — Reviewstander Pro fyldte 401 tegn, hvor Google klipper ved
   * omkring 155. Uden en override afkortes der på hele sætninger
   * (`kortMetabeskrivelse`), så et nyt produkt aldrig står med en halv
   * sætning. Teksten her må sige det samme som `description`, kortere — ikke
   * noget andet.
   */
  metaDescription?: string;
  /** Pris pr. stander (engangs, DKK ex moms). Ganges med antal + mængderabat. */
  price: number;
  interval: "one_time" | "month";
  /** Fast månedligt abonnement (DKK ex moms) — UAFHÆNGIGT af antal standere. */
  monthlyPrice?: number;
  /** Engangs opsætningsgebyr (DKK ex moms) — fast, uafhængigt af antal. */
  setupPrice?: number;
  /** True hvis produktet inkluderer hele LoyalSum-platformen (komplet pakke). */
  includesLoyalSum?: boolean;
  tagline: string;
  description: string;
  image: string;
  features: string[];
  featured?: boolean;

  // --- Betaling (Stripe) ---
  /**
   * Stripe-id'er PR. TILSTAND. Test og live har hver deres id'er — bruges et
   * test-id med live-nøglen, fejler checkout. Derfor er de adskilt her frem
   * for i ét felt, der skal huskes udskiftet ved go-live.
   *
   * Oprettes med `node scripts/setup-stripe-products.mjs`, som printer dem.
   */
  stripe?: Partial<Record<StripeMode, StripeIds>>;

  /**
   * TILKØB. Varen er ikke et selvstændigt tilbud, men noget en kunde, der
   * allerede har en konto, køber oveni.
   *
   * Konsekvenserne er ens for alle tilkøb og hænger sammen: varen får ingen
   * offentlig produktside, står ikke i katalog, footer eller sitemap, og et
   * køb af den ændrer ALDRIG kundens niveau eller `product_slug`. Det sidste er
   * det vigtigste — se webhooken.
   */
  addon?: boolean;

  /**
   * Sæt kun denne, hvis varen IKKE sender et fysisk skilt. Så bortfalder
   * farvevalg, logo-upload og leveringsadresse. Ingen nuværende vare er
   * digital — flaget findes, så en fremtidig kan sige det udtrykkeligt.
   */
  kunDigital?: boolean;

  /**
   * Sæt kun denne, hvis varen IKKE giver adgang til at indsamle oplysninger om
   * butikkens egne kunder. Alle nuværende varer indeholder en stander, der
   * tager imod feedback med navn og fritekst, så de kræver alle en
   * databehandleraftale. Se requiresDpa() i src/lib/dpa.ts.
   */
  noPersonalData?: boolean;

  // --- Google Shopping / Merchant Center ---
  /** Med i et Google Shopping-feed? Som udgangspunkt kun fysiske engangsprodukter. */
  shoppable?: boolean;
  /** Vores eget varenummer. Bruges som identifier når produktet ikke har GTIN. */
  mpn?: string;
  /** Stregkode (EAN/UPC), hvis produktet får en. Ellers udeladt. */
  gtin?: string;
  /** Vises som product_type i feedet, fx "LoyalSum > Standere > Basic". */
  productType?: string;
  /** Ekstra produktbilleder (additional_image_link). Stier under /public. */
  additionalImages?: string[];
}

/**
 * Globale handelsdata delt af hele kataloget — til Stripe-checkout og et kommende
 * Google Shopping-feed. Ét sted, så vi ikke gentager dem pr. produkt.
 */
export const COMMERCE = {
  brand: SITE_NAME.replace(".dk", ""), // "LoyalSum"
  currency: "DKK",
  /** Google Shopping: alle standere er nye. */
  condition: "new",
  /** Google Shopping: lagerstatus (juster hvis den skal styres pr. produkt). */
  availability: "in_stock",
  /**
   * Google Merchant produktkategori. Kvalificeret bud for en bord-/displaystander
   * — verificér/justér i Merchant Center, når feedet oprettes.
   */
  googleProductCategory:
    "Business & Industrial > Retail > Retail Display Props",
} as const;

// ===========================================================================
// PRODUKTER & PRISER  —  REDIGÉR HER
// Tre varer i en klar stige. Kunden vælger antal 1–30 med automatisk
// mængderabat. Priser står direkte på hver vare herunder; mængderabatten
// styres ét sted (VOLUME_DISCOUNTS). Alt væves automatisk ud i katalog,
// produktsider og checkout.
// ===========================================================================

/**
 * Maksimalt antal standere i selvbetjeningen. Ikke en forretningsgrænse, men en
 * sikkerhedsventil: større ordrer skal aftales med os, ikke klikkes igennem.
 * Antalsvælgeren viser en kontaktbesked, når loftet er nået.
 */
export const MAX_QTY = 100;

/**
 * Mængderabat: rabat pr. stander når man køber mindst `minQty` stk. Rediger frit
 * — sæt discountPct: 0 for at slå et trin fra, eller tilføj/fjern trin. Rabatten
 * gælder pr. stander (og evt. månedspris).
 */
export const VOLUME_DISCOUNTS: { minQty: number; discountPct: number }[] = [
  { minQty: 1, discountPct: 0 },
  { minQty: 3, discountPct: 10 },
  { minQty: 10, discountPct: 15 },
  { minQty: 20, discountPct: 20 },
];

/** Alle priser i shoppen vises ex moms. */
export const PRICES_EX_VAT = true;

/**
 * De tre varer — REDIGÉR pris/opsætning direkte på hver vare herunder.
 * 1) Reviewstander (engangskøb, selvvalgt link)
 * 2) Reviewstander Pro (review-platform: smart flow + dynamiske links, abonnement)
 * 3) LoyalSum Komplet (alt inkl. stempelkort & opslag, abonnement)
 */
export const PRODUCTS: Product[] = [
  {
    slug: "reviewstander",
    metaDescription:
      "Elegant bordstander i sort eller hvid akryl med QR og NFC. Du sætter selv linket — til Google, Trustpilot, Tripadvisor, Facebook eller din egen side.",
    platform: "multi",
    name: "Reviewstander",
    keyword: "reviewstander",
    /*
      KANNIBALISERING MED `/reviewstander`. Begge titler åbnede med
      "Reviewstander" og nævnte QR og NFC, og så konkurrerer de om samme
      søgeresultat. Landingssiden er hovedsiden for ordet — den har flest
      indgående links, FAQ-strukturdata og hele forklaringen. DENNE side er
      den bestemte VARE, og det, der adskiller den fra Pro og Komplet, er, at
      den er et engangskøb. Det står nu først.
    */
    metaTitle: "Reviewstander uden abonnement — vælg selv linket",
    price: 499,
    interval: "one_time",
    includesLoyalSum: false,
    tagline: "Selvvalgt anmeldelseslink",
    description:
      "Elegant bordstander i sort eller hvid akryl med QR og NFC. Du sætter selv linket — til Google, Trustpilot, Tripadvisor, Facebook eller din egen side. Dit logo trykkes på skiltet. Sæt den på disken, og du er klar. Ingen abonnement.",
    image: "/mockups/stander-reviewstander.svg",
    features: [
      "Selvvalgt link (Google, Trustpilot, Tripadvisor, Facebook…)",
      "QR + NFC — kunden scanner eller tapper",
      "Dit logo & link",
      "Klar til brug — ingen abonnement",
    ],
    shoppable: true,
    stripe: {
      test: {
        productId: "prod_V60HuKNAn27bkH",
        priceId: "price_1U5oH7Rr2uZmH0wdNTNoPm6T",
      },
      live: {
        productId: "prod_V60HuKNAn27bkH",
        priceId: "price_1UFJN52LQpGDZNEW0uyF2OfU",
      },
    },
    mpn: "LS-REVIEW",
    productType: "LoyalSum > Standere > Reviewstander",
  },
  {
    slug: "reviewstander-pro",
    metaDescription:
      "Stander med din egen anmeldelsesside: vælg selv platformene (Google, Trustpilot, Facebook), skift links når som helst, og få feedback privat i stedet.",
    platform: "multi",
    name: "Reviewstander Pro",
    keyword: "reviewstander abonnement",
    // 80 tegn med sitenavnet var for langt: Google klipper omkring 60, og
    // "& dynamiske links" forsvandt alligevel. Det står i beskrivelsen.
    metaTitle: "Reviewstander Pro — din egen anmeldelsesside",
    price: 499,
    interval: "one_time",
    monthlyPrice: 99,
    includesLoyalSum: false,
    tagline: "Egen anmeldelsesside + dynamiske links",
    description:
      "Standeren med LoyalSum review-platformen oveni. På din dedikerede anmeldelsesside vælger du selv, hvilke platforme kunderne kan anmelde dig på (Google, Trustpilot, Facebook) — plus et eget link til fx dit menukort eller booking. Kunden kan også vælge at sende feedback direkte til dig i stedet, så du hører om en dårlig oplevelse og kan rette op. Skift links når som helst, og følg det hele i realtid.",
    image: "/mockups/stander-reviewstander-pro.svg",
    features: [
      "Dedikeret anmeldelsesside — vælg selv platforme (Google, Trustpilot, Facebook)",
      "Eget link til fx menukort eller booking",
      "Kunden vælger selv: offentlig anmeldelse eller feedback direkte til dig",
      "Dynamiske links — skift når som helst",
      "Privat feedback-indbakke & statistik",
    ],
    shoppable: false,
    stripe: {
      test: {
        productId: "prod_V60HMfPVGevsVG",
        priceId: "price_1U5oH8Rr2uZmH0wdDsW9uYPy",
        monthlyPriceId: "price_1U5oH8Rr2uZmH0wdyDTaXF1J",
      },
      live: {
        productId: "prod_V60HMfPVGevsVG",
        priceId: "price_1UFJN62LQpGDZNEWpXFjR4qA",
        monthlyPriceId: "price_1U5tg72LQpGDZNEW8omPhStB",
      },
    },
    mpn: "LS-REVIEW-PRO",
    productType: "LoyalSum > Abonnement > Reviewstander Pro",
  },
  {
    slug: "loyalsum-komplet",
    metaDescription:
      "Alt i Reviewstander Pro plus digitalt stempelkort og pointprogram uden app: kunderne tilmelder sig selv, og personalet stempler eller giver point med ét scan.",
    platform: "multi",
    name: "LoyalSum Komplet",
    keyword: "digitalt stempelkort og anmeldelser",
    // Samme grund. LOYALITETEN er dét, der adskiller Komplet fra Pro, så den
    // står først; opslagene står i beskrivelsen. Pointprogrammet er med i
    // titlen, fordi det er den halvdel af forskellen, teksten tav om — se
    // punktet om de to loyalitetsformer i AGENTS.md.
    metaTitle: "LoyalSum Komplet — stempelkort, point & anmeldelser",
    price: 499,
    interval: "one_time",
    monthlyPrice: 399,
    includesLoyalSum: true,
    featured: true,
    tagline: "Hele platformen — reviews, stempelkort og point",
    description:
      "Alt i Reviewstander Pro — plus to måder at få kunderne til at komme igen: et digitalt stempelkort og et pointprogram, begge uden app. Kunderne tilmelder sig selv på standeren, personalet stempler eller giver point med ét scan, og du laver opslag af dine bedste anmeldelser. Flere nye kunder, og flere der kommer igen — samlet ét sted.",
    image: "/mockups/stander-loyalsum-komplet.svg",
    features: [
      "Alt i Reviewstander Pro",
      "Digitalt stempelkort — uden app",
      "Pointprogram — kunden samler point og vælger selv belønning",
      "Scan-til-stempel over disken",
      "Opslag af dine bedste anmeldelser",
      "Kundeklub & belønninger",
    ],
    shoppable: false,
    stripe: {
      test: {
        productId: "prod_V60HgN0EFCzxre",
        priceId: "price_1U5oH9Rr2uZmH0wdOE6p6lJ1",
        monthlyPriceId: "price_1U5oH9Rr2uZmH0wdVzW1v3Wc",
      },
      live: {
        productId: "prod_V60HgN0EFCzxre",
        priceId: "price_1UFJN72LQpGDZNEWsbEPIvRG",
        monthlyPriceId: "price_1U5tg82LQpGDZNEWTFSgdiEe",
      },
    },
    mpn: "LS-KOMPLET",
    productType: "LoyalSum > Abonnement > LoyalSum Komplet",
  },
  {
    /*
     * SAMME SOFTWARE SOM KOMPLET — UDEN DET FYSISKE SKILT.
     *
     * Adgangen til platformen afgøres ÉT sted: `includesLoyalSum`, som
     * `hasLoyaltyAccess()` spørger, og som `KOMPLET_FUNKTIONER` hænger på.
     * Den er sat her, og dermed har Online nøjagtig de samme funktioner som
     * Komplet — stempelkort, pointprogram, opslag og medarbejderadgang — uden
     * at en eneste af de fire ruter skal lære et produktnavn at kende. Havde
     * adgangen været en liste af slugs, ville en ny vare kræve en rettelse
     * hvert sted, og den næste funktion ville blive glemt for Online.
     *
     * `kunDigital` er det eneste, der skiller dem, og flaget fandtes i
     * forvejen: det slår farvevalg, logo-upload og leveringsadresse fra. Indtil
     * nu var der ingen vare, der brugte det.
     *
     * PRISEN ER SOFTWAREPRISEN FRA KOMPLET. Komplet er 499 kr. for standeren
     * (engangs) + 399 kr./md. for platformen. Uden stander står månedsprisen
     * alene — den er ikke gættet, den er den samme linje.
     *
     * DER ER INGEN `priceId` — OG DET ER IKKE EN FORGLEMMELSE. De øvrige varer
     * har et engangs-prisobjekt til standeren; her er der ingen stander at
     * betale for. `setup-stripe-products.mjs` opretter derfor kun månedsprisen
     * (den sprang før over `monthlyPrice` og `setupPrice`, men lavede
     * standerlinjen ubetinget — altså et gyldigt prisobjekt på NUL kroner).
     * Skriver nogen et `priceId` ind her, er det enten et fremmed objekt eller
     * et nul; se advarslen om `priceId` i AGENTS.md.
     */
    slug: "loyalsum-komplet-online",
    metaDescription:
      "Hele LoyalSum-platformen uden fysisk stander. Del dit loyalitetsprogram via hjemmeside, webshop, e-mail, QR-kode eller et direkte link.",
    platform: "multi",
    name: "LoyalSum Komplet Online",
    keyword: "loyalitetsprogram til webshop",
    // 65 tegn er loftet MED " — LoyalSum.dk"; se metadata-kvalitet.test.ts.
    metaTitle: "LoyalSum Komplet Online — uden fysisk stander",
    // Ingen engangspris: der er ingen stander at betale for.
    price: 0,
    interval: "month",
    monthlyPrice: 399,
    includesLoyalSum: true,
    kunDigital: true,
    tagline: "Hele platformen — uden fysisk stander",
    description:
      "Hele LoyalSum-platformen uden en fysisk stander. Du får dit eget LoyalSum-link og en QR-kode, som du selv deler — på din hjemmeside, i din webshop, i mails eller hvor du ellers møder dine kunder. Softwaren er den samme som i LoyalSum Komplet: digitalt stempelkort, pointprogram, feedback, kundescore og opslag af dine bedste anmeldelser.",
    /*
     * IKKE STANDER-MOCKUPPEN. `image` går i JSON-LD (og i Google Shopping-
     * feedet, hvis det bygges), og det lånte billede tegner en stander — altså
     * præcis dét, varen IKKE indeholder. Målt på produktsiden 2026-09-18 stod
     * `"image": ".../mockups/stander-loyalsum-komplet.svg"` i den struktu-
     * rerede data for varen "uden fysisk stander".
     *
     * `/opengraph-image` er sitets eget genererede kort — en rigtig PNG i
     * 1200 × 630, ikke et pladsholderikon, og den viser ikke noget, kunden
     * ikke får. Den er samtidig dét, delebilledet falder tilbage på, så
     * søgeresultat og delt link viser det samme.
     */
    image: "/loyalsum-komplet-online-dashboard-og-mobil.jpg",
    features: [
      "Alle funktioner fra LoyalSum Komplet",
      "Dit eget LoyalSum-link og QR-kode",
      "Digitalt stempelkort og pointprogram",
      "Feedback, kundescore og opslag",
      "Uden fysisk stander",
    ],
    /*
      TEST-ID'ERNE ER OPRETTET, MEN SKRIVES IKKE IND ALENE.

      `setup-stripe-products.mjs` har oprettet varen i TESTtilstand
      (prod_VHrFc2PIk8a1vD · price_1UHHXKRr2uZmH0wdJvucMJLn, 399 kr./md).
      Live-nøglen ligger som `[SENSITIVE]` i Vercel og kan ikke hentes ned,
      så live-halvdelen mangler endnu.

      EN HALV OPSÆTNING ER VÆRRE END INGEN. `commerce.test.ts` kræver, at en
      vare med en `stripe`-blok kan sælges i BEGGE tilstande — netop fordi
      id'er i test og ikke i live giver en købsknap, der virker for os og
      fejler for enhver rigtig kunde. Tilkøbet "Ekstra stander" stod og gjorde
      præcis dét indtil 13. september. Uden blokken er varen derimod spærret i
      begge verdener, og dét er en tilstand, systemet kan forklare.

      Kør scriptet med live-nøglen og skriv BEGGE tilstande ind på én gang.
    */
    shoppable: false,
    mpn: "LS-KOMPLET-ONLINE",
    productType: "LoyalSum > Abonnement > LoyalSum Komplet Online",
  },

  // -------------------------------------------------------------- TILKØB --
  // Står i PRODUCTS og ikke for sig selv, fordi hele betalingsmaskineriet —
  // priceFor, stripeIdsFor, canSell, mængderabatten — arbejder på `Product`.
  // At lave en parallel type ville betyde en parallel checkout.
  //
  // `addon: true` er det, der holder den ude af de offentlige lister. Brug
  // KATALOG dér, hvor kunder skal se varer; brug PRODUCTS til opslag og køb.
  {
    slug: "ekstra-stander",
    platform: "multi",
    name: "Ekstra stander",
    keyword: "ekstra reviewstander",
    price: 499,
    interval: "one_time",
    addon: true,
    tagline: "Endnu et skilt til disken",
    description:
      "Et skilt mere til din forretning — samme akryl med QR og NFC, med dit logo. Det peger på den QR-adresse, du har i forvejen, så alle dine skilte fører hen til den samme side. Du kan have så mange, du vil: ved døren, på bordene, i receptionen. Købes uanset hvilket abonnement du har, og ændrer ikke noget ved det.",
    image: "/mockups/stander-reviewstander.svg",
    features: [
      "Samme stander som dine nuværende",
      "QR + NFC",
      "Dit logo",
      "Påvirker ikke dit abonnement",
    ],
    shoppable: false,
    mpn: "LS-EKSTRA",
    stripe: {
      test: {
        productId: "prod_V77rcHM3RsTaUq",
        priceId: "price_1U6tc6Rr2uZmH0wddf9e17pl",
      },
      // OPRETTET 2026-09-13 med live-nøglen. Tilkøbet var den ENESTE vare
      // uden live-id'er, og uden dem ville "Ekstra stander" have været
      // usælgelig den dag salget åbnede — canSell() svarer falsk uden dem,
      // og knappen ville bare mangle. Produktet er nyt i live og har derfor
      // sit eget prod_-id, modsat de tre andre, hvor test og live deler.
      live: {
        productId: "prod_VFp1tICwfO2AW2",
        priceId: "price_1UFJN82LQpGDZNEWM0USmnER",
      },
    },
  },
];

/**
 * Varerne kunder skal kunne SE.
 *
 * PRODUCTS er den fulde liste og bruges til opslag og køb. KATALOG er den
 * offentlige delmængde og driver katalogside, produktsider, prissektion,
 * footer og sitemap. Et tilkøb hører ingen af de steder hjemme: det giver kun
 * mening for en, der allerede er kunde, og en produktside for "Ekstra stander"
 * ville være en blindgyde for enhver anden.
 */
export const KATALOG: Product[] = PRODUCTS.filter((p) => !p.addon);

/**
 * Produktfoto pr. vare (i /public). Slår en vare ikke op her, falder
 * kataloget og produktsiderne tilbage på pladsholderen.
 *
 * BASIC OG PRO DELER FOTO, KOMPLET HAR SIT EGET — og det er ikke en
 * tilfældighed, at de ikke er ens tre veje rundt.
 *
 * De to første varer er den samme akryl med det samme tryk; forskellen ligger
 * i, hvad QR-koden fører hen til, og dét kan et foto ikke vise. Tre
 * forskellige miljøer fik dem til at ligne tre forskellige produkter, så de
 * står med ét og samme billede, og punkterne under (KORT_PUNKTER) siger
 * forskellen.
 *
 * KOMPLET KAN DERIMOD SES: klistermærket "Indeholder Stempelkort" ligger
 * fysisk i kassen og sidder på skiltet på fotoet. Det er den eneste forskel,
 * der findes som et fysisk emne, og derfor den eneste, der fortjener sit eget
 * billede.
 *
 * MÆRKET MÅ VISES, MEN IKKE SKRIVES. Fotoet er sandt, fordi mærket følger med
 * — men det må ikke ind i `tagline`, `description`, `features`, KORT_PUNKTER
 * eller nogen anden kundevendt tekst. `produktfoto.test.ts` håndhæver det, og
 * begrundelsen står i AGENTS.md.
 */
export const PRODUKT_FOTO: Record<string, string> = {
  reviewstander: "/reviewstander-boutique.jpg",
  "reviewstander-pro": "/reviewstander-boutique.jpg",
  "loyalsum-komplet": "/reviewstander-cafe-komplet.jpg",
  /*
    DEN DIGITALE VARE FIK SIT EGET MOTIV. Den har stået med QR-pladsholderen,
    fordi der ikke var noget at fotografere — en stander findes ikke i den.
    Billedet viser dét, varen FAKTISK er: panelet på en skærm og kundens kort
    på en telefon. Pladsholderen forsvinder derfor for den nu, og
    `DigitalPlaceholder` bliver stående til den næste vare uden billede.
  */
  "loyalsum-komplet-online": "/loyalsum-komplet-online-dashboard-og-mobil.jpg",
};

/**
 * Alt-teksten til produktfotoet.
 *
 * DEN VAR SKREVET I KODEN SOM `${p.name} — reviewstander i brug`, og det var
 * sandt, så længe alle varer var en stander. LoyalSum Komplet Online viser en
 * bærbar og en telefon, og en skærmlæser fik altså at vide, at der stod en
 * reviewstander på billedet. Teksten hører til BILLEDET og ikke til varen, så
 * den står her ved siden af filen.
 */
export const PRODUKT_FOTO_ALT: Record<string, string> = {
  reviewstander:
    "LoyalSum reviewstander på disken i en butik, med QR-kode og NFC-felt",
  "reviewstander-pro":
    "LoyalSum reviewstander på disken i en butik, med QR-kode og NFC-felt",
  "loyalsum-komplet":
    "LoyalSum reviewstander på cafédisken med mærkatet om stempelkort",
  "loyalsum-komplet-online":
    "LoyalSum-panelet på en bærbar og kundens stempelkort og point på en telefon",
};

/**
 * Billeder til de materialer, der er PÅ VEJ.
 *
 * Egen liste og ikke `PRODUKT_FOTO`: de her er ikke varer i kataloget, de kan
 * ikke købes, og de har hverken slug, pris-id eller produktside. Nøglen er
 * `UpcomingItem.key`.
 *
 * ET FOTO GØR DEM IKKE BESTILBARE. Badgen "På vej" bliver stående oven på
 * billedet, og teksten under siger stadig, at de ikke kan bestilles endnu.
 * Grunden til at vise dem er den modsatte af et løfte: et streg-ikon på
 * råhvid fortæller ikke en butik, om en "selvklæbende plakat" sidder på ruden
 * eller på væggen — det gør billedet på ét blik.
 */
export const KOMMENDE_FOTO: Record<string, string> = {
  plakater: "/loyalsum-plakat-qr-kode-anmeldelser.jpg",
  selvklaebende: "/loyalsum-selvklaebende-plakat-rude.jpg",
  maerkater: "/loyalsum-vindues-og-bordmaerkater.jpg",
  flyers: "/loyalsum-flyers-qr-kode-til-posen.jpg",
};

/**
 * Alt-teksten til hvert af dem. SKREVET OG IKKE UDLEDT af navnet: en
 * skærmlæser skal høre, hvad der er PÅ billedet — hvor materialet sidder, og
 * hvad der står på det — og ikke varenavnet en gang til, som allerede står
 * som overskrift lige under.
 */
export const KOMMENDE_FOTO_ALT: Record<string, string> = {
  plakater:
    "A4-plakat med QR-kode og fem stjerner hængt på væggen i en café, klar til at blive scannet",
  selvklaebende:
    "Selvklæbende LoyalSum-plakat sat direkte på butiksruden, med QR-kode og NFC-felt",
  maerkater:
    "Vinduesmærkat på ruden og et bordmærkat i holder på disken — samme QR-kode begge steder",
  flyers:
    "Stak LoyalSum-flyers på disken, og en medarbejder lægger en ned i kundens pose",
};

/**
 * Det, man kan vælge på selve SKILTET. Gælder alle tre varer, fordi standeren
 * er den samme — derfor står linjen ét sted og ikke i hver billedtekst.
 *
 * Ordlyden følger `ACCENT_TEKSTER`/`FRONT_TEKSTER` i stander-tilvalg.ts:
 * accenten farver stjernerne og "Scan eller tap" og koster ikke ekstra, mens
 * en egen baggrundsfarve er et selvstændigt tryk og koster pr. ordre. Begge
 * halvdele skal med — en gratis farve nævnt uden den, der koster, læses som
 * om begge er gratis.
 */
export const FOTO_FARVETEKST =
  "Vælg selv farve på stjernerne uden beregning — og evt. din egen baggrundsfarve mod tillæg.";

/**
 * Modstykket til FOTO_FARVETEKST på varen UDEN skilt.
 *
 * Farvelinjen står under punkterne på de tre standerkort og handler om
 * trykket. LoyalSum Komplet Online har intet tryk, og uden en linje i samme
 * bås stod kortet med et tomt hul dér, hvor naboerne havde to linjer tekst —
 * set i en stribe på fire, hvor alt andet flugter. Hullet er ikke bare grimt:
 * det læses som om der MANGLER noget på den vare.
 *
 * Linjen siger derfor dét, den anden siger for et skilt — hvad du gør med
 * varen — og lover ikke noget nyt: linket og QR-koden er præcis det, man får.
 */
export const DIGITAL_DELETEKST =
  "Du deler selv linket og QR-koden — på din hjemmeside, i din webshop eller i dine mails.";

/**
 * Salgspunkterne på katalogkortet — korte nok til at kunne skimmes på en
 * telefon, og ÉN ting pr. linje.
 *
 * De er skrevet her og ikke taget fra `features`, fordi de to lister har hver
 * sit job: `features` står på produktsiden, hvor der er plads til en hel
 * sætning, mens kortet skal kunne læses på et blik. Begge skal dog beskrive
 * den SAMME vare, og `produktfoto.test.ts` holder fast i, at et punkt, der
 * kun gælder ét niveau, ikke kan liste sig ind på et andet:
 *
 * - **Opslag hører til Komplet.** Spærringen ligger i
 *   `src/app/dashboard/opslag/layout.tsx` og spørger om PRODUKTET
 *   (`hasLoyaltyAccess`), ikke om `plan` — Pro og Komplet er samme niveau.
 * - **Statistik og feedback-indbakke følger NIVEAUET** (`TIER_CAPABILITIES`,
 *   `pro`), så de gælder både Pro og Komplet — men aldrig Basic, der slet
 *   ikke har et dashboard.
 *
 * Og opslag er IKKE automatiske: kunden vælger tekst og baggrund, henter
 * billedet og deler det selv. Punktet må derfor ikke love, at der bliver
 * slået noget op af sig selv.
 */
export const KORT_PUNKTER: Record<string, string[]> = {
  reviewstander: [
    "Selvvalgt link til Google, Trustpilot m.fl.",
    "QR + NFC — kunden scanner eller tapper",
    "Dit logo trykt på skiltet",
    // IKKE "Ingen abonnement": det står allerede i prisblokken lige under, og
    // to gange på samme kort læses som to forskellige ting.
    "Klar til brug ud af kassen",
  ],
  "reviewstander-pro": [
    "Egen anmeldelsesside med flere platforme",
    "Eget link til fx menukort eller booking",
    "Skift links når som helst — uden nyt tryk",
    "Privat feedback-indbakke",
    "Statistik i realtid",
  ],
  "loyalsum-komplet": [
    "Alt i Reviewstander Pro",
    "Stempelkort og pointprogram — uden app",
    "Scan-til-stempel over disken",
    "Opslag af dine anmeldelser — klar til at dele",
    "Statistik og omdømme i realtid",
  ],
  /*
   * ONLINE SIGER DET SAMME OM SOFTWAREN — og ét punkt om forskellen.
   *
   * Punkterne må ikke gøre den til en mindre pakke: den ENESTE forskel er
   * standeren. Derfor står "Alle funktioner fra LoyalSum Komplet" først og
   * ikke en opremsning, der ved et uheld kunne komme til at mangle noget.
   */
  "loyalsum-komplet-online": [
    "Alle funktioner fra LoyalSum Komplet",
    "Dit eget LoyalSum-link og QR-kode",
    "Digitalt stempelkort og pointprogram",
    "Feedback, statistik og omdømme i realtid",
    "Uden fysisk stander",
  ],
};

/**
 * Billedtekst pr. vare: den ENE sætning, der skiller varen fra de to andre,
 * skrevet i kundens sprog frem for i funktionsnavne. Står under fotoet
 * sammen med FOTO_FARVETEKST, så kataloget kan læses uden at klikke ind.
 */
export const PRODUKT_FOTO_TEKST: Record<string, string> = {
  reviewstander:
    "QR og NFC peger på ét link, du selv vælger — Google, Trustpilot, Facebook eller din egen side.",
  "reviewstander-pro":
    "Vælg flere anmeldelsesplatforme på din egen anmeldelsesside — og et eget link til fx dit menukort eller booking.",
  "loyalsum-komplet":
    "Alt i Pro — plus stempelkort og pointprogram uden app, som kunderne tilmelder sig selv på standeren.",
  /*
   * INGEN FOTO, MEN EN BILLEDTEKST. Der er ingen fysisk ting at fotografere,
   * og et lånt standerfoto ville vise præcis dét, varen ikke indeholder.
   * Kortet tegner pladsholderen, og teksten her siger, hvad man får.
   */
  "loyalsum-komplet-online":
    "Samme platform som LoyalSum Komplet — men delt via dit eget link, en QR-kode, din hjemmeside eller dine mails i stedet for en stander.",
};

/**
 * HVAD FØLGER MED KOMPLET — OG IKKE MED PRO?
 *
 * TRE TING, OG DE HÆNGER SAMMEN. Stempelkortet er varen; opslagene er lavet
 * af anmeldelserne, kortet samler op; og medarbejderne findes for at kunne
 * betjene kortet ved disken. Køber man Pro, får man ingen af dem — og det er
 * ikke tre uafhængige flag, men ét køb.
 *
 * DERFOR STÅR DE HER OG IKKE I HVER SIN SIDE. Listen bruges af
 * abonnementsoversigten til at sige BÅDE ja og nej: en Pro-kunde skal kunne
 * se, hvad der ikke er med, ellers opdager de det først, når de rammer en
 * mur. `komplet-spaerring.test.ts` kræver, at hver linje her har en rute med
 * en spærring bag sig — en funktion, vi siger nej til på oversigten, men
 * lader stå åben, er værre end ingen af delene.
 *
 * `plan` kan ikke svare på det: både Reviewstander Pro og LoyalSum Komplet er
 * niveau `pro`. Det er PRODUKTET, der skiller dem — se `hasLoyaltyAccess()`.
 *
 * TEKSTERNE MÅ KUN LOVE DET, PRODUKTET GØR. Opslag laves ikke af sig selv:
 * kunden vælger tekst og baggrund, henter billedet og deler det selv.
 */
export const KOMPLET_FUNKTIONER = [
  {
    /** Ruten under /dashboard, hvor spærringen skal ligge. */
    rute: "loyalitet",
    label: "Stempelkort og pointprogram",
    help: "Opret et stempelkort, et pointprogram eller begge dele — og få kunderne til at komme igen.",
  },
  {
    rute: "opslag",
    label: "Opslag til sociale medier",
    help: "Lav et delbart opslag ud af jeres bedste anmeldelser — vælg tekst og baggrund, hent billedet og del det selv.",
  },
  {
    rute: "personale",
    label: "Medarbejderadgang",
    help: "Giv dine ansatte adgang til at stemple og indløse — uden at dele din egen adgangskode.",
  },
] as const;

/**
 * Har virksomheden købt et produkt, der indeholder stempelkortet?
 *
 * `plan` kan ikke svare på det: både Reviewstander Pro og LoyalSum Komplet er
 * niveau `pro`, fordi de har samme review-funktioner. Forskellen er netop
 * stempelkortet, og den kendes kun via det købte produkt.
 */
export function hasLoyaltyAccess(
  productSlug: string | null | undefined,
): boolean {
  if (!productSlug) return false;
  return Boolean(getProduct(productSlug)?.includesLoyalSum);
}

/**
 * Fast dansk moms pr. Stripe-tilstand.
 *
 * BEVIDST ikke Stripe Tax (`automatic_tax`): den kræver en aktiv
 * momsregistrering i Stripe, og uden den opkræver Stripe slet ingen moms —
 * uden at fejle. En fast sats kan ikke fejle stille. Oprettes af
 * scripts/setup-stripe-products.mjs.
 */
export const STRIPE_TAX_RATES: Partial<Record<StripeMode, string>> = {
  test: "txr_1U5oRfRr2uZmH0wdIbfWhyuN",
  live: "txr_1U64CL2LQpGDZNEWyQ4Ty36P",
};

/**
 * Hvilket adgangsniveau følger med et produkt?
 *
 * Reviewstander uden abonnement giver ingen dashboardfunktioner — standeren
 * virker med sit eget link. Begge abonnementsvarer giver Pro; forskellen på
 * dem er stempelkortet, som styres af product_slug (se hasLoyaltyAccess).
 */
export function planForProduct(slug: string | null | undefined): Tier {
  const p = slug ? getProduct(slug) : undefined;
  return p?.monthlyPrice ? "pro" : "basic";
}

/**
 * Hvor højt oppe ad abonnementsstigen ligger varen?
 *
 * MÅNEDSPRISEN ER RANGEN, og det er ikke dovenskab: stigen ER prisen.
 * Reviewstander uden abonnement er 0, Pro er 99, Komplet er 399, og
 * Komplet indeholder ordret alt i Pro. En håndskrevet rækkefølge ved
 * siden af priserne kunne komme i utakt med dem; det her kan ikke.
 *
 * Tilkøb rammer 0 og er uden betydning — de spørges aldrig (se
 * `abonnementsSkifteSpaerre()`, der kun kigger på varer MED månedspris).
 */
export function abonnementsRang(p: Product | undefined): number {
  return p?.monthlyPrice ?? 0;
}

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

// ===========================================================================
// MATERIALER PÅ VEJ  —  PLACEHOLDERE
// Kommende fysiske varer ud over standeren. De er BEVIDST holdt uden for
// PRODUCTS, fordi den liste driver sitemap, footer-links, produktsider
// (generateStaticParams) og et kommende Google Shopping-feed — placeholdere
// hører ingen af de steder hjemme.
//
// EN PRIS HER BLIVER VIST SOM EN RIGTIG PRIS. Derfor er `pris` valgfri pr.
// størrelse, og reglen er enkel: skriv KUN et tal, når det er besluttet.
// Mangler det, står der "Pris annonceres senere" på kortet, og et gæt hører
// hjemme i en kommentar — aldrig i feltet. Det var netop derfor, blokken før
// slet ikke måtte have priser: dengang var ingen af dem fastlagt.
//
// Priserne er EX MOMS som alle andre priser på sitet (se AGENTS.md), og
// kortene skriver det, så et tal her ikke kan forveksles med en pris inkl.
//
// En vare bliver her, indtil den kan BESTILLES. En pris gør den ikke
// købbar — det kræver en plads i PRODUCTS med Stripe-id'er, billede og egen
// side, og det er dét skridt, der flytter den ud af listen.
// ===========================================================================

/**
 * Papirformaternes mål i MILLIMETER (ISO 216).
 *
 * Tallene står ÉT sted og skrives ikke af pr. vare: "A5" betyder det samme,
 * uanset om det er en plakat eller en flyer, og to lister ville før eller
 * siden sige hver sit om samme format. `paa-vej.test.ts` prøver dem mod
 * standardens egne mål.
 */
export const A_FORMAT_MM: Record<string, [number, number]> = {
  A4: [210, 297],
  A5: [148, 210],
  A6: [105, 148],
  A7: [74, 105],
};

/**
 * Målet som kunden skal læse det: "10,5 × 14,8 cm".
 *
 * CENTIMETER OG IKKE MILLIMETER. Et "A6" siger ingenting til en, der skal
 * vurdere, om mærkatet passer på en rude — og 105 × 148 mm kræver et ekstra
 * regnestykke i hovedet. Centimeter er det mål, folk holder fingrene op mod.
 * Dansk decimalkomma, og et helt tal skrives uden ",0".
 */
export function formatMaal(format: string): string | null {
  const mm = A_FORMAT_MM[format];
  if (!mm) return null;
  const cm = (v: number) =>
    (v / 10).toFixed(1).replace(/\.0$/, "").replace(".", ",");
  return `${cm(mm[0])} × ${cm(mm[1])} cm`;
}

export interface UpcomingSize {
  /** Papirformat, fx "A4". Målet i cm slås op med formatMaal(). */
  format: string;
  /**
   * Pris i kroner EX MOMS — eller udeladt, hvis den ikke er besluttet.
   *
   * Et tal her vises til kunder. Gæt hører til i en kommentar; se blokkens
   * regel ovenfor.
   */
  pris?: number;
  /**
   * Antal stykker, prisen dækker. Udeladt betyder ét stykke.
   *
   * SKAL MED, HVOR DEN GÆLDER. Mærkater og flyers sælges i pakker, og 99 kr.
   * for otte er noget helt andet end 99 kr. for ét — står antallet ikke ved
   * beløbet, læser kunden den dyreste af de to muligheder.
   */
  antal?: number;
}

export interface UpcomingItem {
  /** Bruges kun som React-key og til ikonvalg — ikke som URL. */
  key: string;
  name: string;
  tagline: string;
  /** Hvor i forretningen varen sidder. Holder listen konkret. */
  placering: string;
  /** Størrelser, største først. Med pris når den er fastlagt. */
  stoerrelser: UpcomingSize[];
}

export const UPCOMING_MERCH: UpcomingItem[] = [
  {
    key: "plakater",
    name: "Plakater",
    tagline:
      "Papirplakat til en ramme eller en opslagstavle. Viser allerede ved døren, at I samler anmeldelser — og at der er en kundeklub indenfor.",
    placering: "Døren og væggen",
    /*
      KUN A4. A5 er bevidst droppet: en A5 på en væg forsvinder, og skal
      budskabet være mindre, er det den selvklæbende til ruden, der løser det.

      99 OG IKKE 139. Den stod 10 kr. under den selvklæbende A4, og med så
      lille en forskel havde papirplakaten ingen grund til at findes: den
      skal tapes op eller i en ramme, mens den anden klæber selv. Nu er den
      det billige valg, og de 50 kr. op til den selvklæbende er prisen for at
      slippe for rammen. Rollen står nu også i teksten.
    */
    stoerrelser: [{ format: "A4", pris: 99 }],
  },
  {
    key: "selvklaebende",
    name: "Selvklæbende plakat",
    tagline:
      "Sættes direkte på ruden eller væggen — ingen ramme, ingen tape, og den kan tages af igen.",
    placering: "Ruden og væggen",
    /*
      A5 ER SAT OP FRA 99 TIL 129. Til 99 kostede den præcis det samme som
      fire A6-mærkater — men gav det halve materiale (311 mod 622 cm²), og
      begge sælges til ruden. Den sammenligning ville enhver kunde lave, og
      den faldt ud til mærkaternes fordel hver gang. Nu er trappen 99 for et
      ark mærkater, 129 for den lille selvklæbende og 149 for den store.
    */
    stoerrelser: [
      { format: "A4", pris: 149 },
      { format: "A5", pris: 129 },
    ],
  },
  {
    key: "maerkater",
    name: "Vindues- & bordmærkater",
    tagline:
      "Samme QR på ruden og på bordet. Fylder ingenting, virker døgnet rundt — og kan sættes op og tages af igen.",
    placering: "Ruden og bordet",
    /*
      PRISEN FØLGER ARKET, IKKE ANTALLET. Fire A6 og otte A7 dækker hver især
      620 cm² — præcis ét A4-ark — og koster derfor begge 99. Ændres en
      pakkestørrelse, skal prisen følge med, ellers er de to pludselig uenige
      om, hvad et ark materiale koster.

      DEN STORE PAKKE ER TIL BORDENE. Otte A7 rækker til otte borde, og en
      café med tyve skulle købe tre pakker. 24 stk. er tre ark, som efter
      samme regel ville koste 297; 249 er de 16 % rabat, mængden fortjener —
      samme tanke som VOLUME_DISCOUNTS på standerne. Kun A7 får en stor
      pakke: A6 sidder på ruden, og dér er der brug for én, ikke tyve.
    */
    stoerrelser: [
      { format: "A6", pris: 99, antal: 4 },
      { format: "A7", pris: 99, antal: 8 },
      { format: "A7", pris: 249, antal: 24 },
    ],
  },
  {
    key: "flyers",
    name: "Flyers",
    tagline:
      "Følger med i posen eller ligger på disken, så kunden kan scanne igen hjemmefra.",
    placering: "Disken og posen",
    stoerrelser: [
      { format: "A5", pris: 289, antal: 100 },
      { format: "A6", pris: 189, antal: 100 },
    ],
  },
];

/**
 * Har varen mindst én fastlagt pris? Afgør, hvad kortet skriver.
 *
 * Alle fire varer HAR en pris i dag. Grenen uden bliver stående, fordi det er
 * sådan enhver ny vare begynder — de fire startede selv dér.
 */
export function harPris(vare: UpcomingItem): boolean {
  return vare.stoerrelser.some((s) => typeof s.pris === "number");
}

/** Højeste mængderabat (%) kunden opnår ved et givet antal standere. */
export function volumeDiscountPct(qty: number): number {
  let pct = 0;
  for (const b of VOLUME_DISCOUNTS) if (qty >= b.minQty) pct = b.discountPct;
  return pct;
}

export interface PriceBreakdown {
  qty: number;
  discountPct: number;
  /** Pris pr. stander efter mængderabat (engangs, afrundet). */
  standUnit: number;
  /**
   * Listepris pr. stander før rabat — INKLUSIVE farvetillægget.
   *
   * Sort er en variant af standeren og ikke en ekstra vare, så tillægget
   * ligger i enhedsprisen. Det er også dét, der gør, at rabatten rammer det
   * af sig selv: der er kun ét tal at give rabat på.
   */
  standUnitBase: number;
  /**
   * Farvetillægget pr. stander FØR rabat (0 for hvid, 49 for sort).
   *
   * Står med som sit eget tal, så en prisopsummering kan skrive "heraf 49 kr.
   * for sort" uden at regne baglæns — men det er allerede talt med i
   * `standUnitBase` og må aldrig lægges til igen.
   */
  farveTillaeg: number;
  /** standUnit × antal — samlet engangs standerpris. */
  standTotal: number;
  /** Fast månedligt abonnement (0 hvis ingen) — UAFHÆNGIGT af antal. */
  monthly: number;
  /** Fast engangs opsætning (0 hvis ingen) — uafhængigt af antal. */
  setup: number;
  /**
   * Tillæg for egen farve på fronten (0 hvis ikke valgt).
   *
   * PR. ORDRE og UDEN mængderabat — det er én opsætning i trykket, uanset hvor
   * mange skilte der laves af den. Derfor ganges den ikke med antallet.
   */
  frontfarve: number;
  /** Samlet engangsbeløb: standere + opsætning + tilvalg. */
  oneTimeTotal: number;
}

/**
 * Beregner prisen for et antal standere. Kun standerprisen ganges med antal
 * (og får mængderabat); abonnement og opsætning er faste — uafhængigt af antal.
 */
/** Tilvalg, der ændrer prisen på en standerbestilling. */
export interface Tilvalg {
  /** Egen farve på den printede front. Fast pris pr. ORDRE, uden rabat. */
  egenFrontfarve?: boolean;
  /**
   * Standerens farve. Sort akryl koster et tillæg PR. STANDER og får
   * mængderabat — modsat frontfarven, der er én opsætning i trykket.
   *
   * Udelades den, regnes der med standardfarven, så et kald uden viden om
   * farven aldrig kan komme til at opkræve et tillæg, kunden ikke har valgt.
   */
  standerFarve?: StanderFarve;
}

export function priceFor(
  product: Product,
  qty: number,
  tilvalg: Tilvalg = {},
): PriceBreakdown {
  const q = Math.max(1, Math.min(MAX_QTY, Math.floor(qty) || 1));
  const pct = volumeDiscountPct(q);

  // Farvetillægget lægges til FØR rabatten og indgår i enhedsprisen: sort er
  // en variant af emnet, ikke en ekstra vare. En digital vare har intet emne
  // at farve, så den slipper — samme betingelse som frontfarven.
  const farveTillaeg = harFysiskSkilt(product)
    ? standerTillaeg(tilvalg.standerFarve ?? STANDARD_STANDERFARVE)
    : 0;
  const standUnitBase = product.price + farveTillaeg;

  const standUnit = Math.round(standUnitBase * (1 - pct / 100));
  const standTotal = standUnit * q;
  const setup = product.setupPrice ?? 0;

  // Tilvalget lægges til ÉN gang og får ingen rabat: rabatten hører til
  // enheden, og der er kun én opsætning i trykket.
  const frontfarve =
    tilvalg.egenFrontfarve && harFysiskSkilt(product)
      ? EGEN_FRONTFARVE_PRIS
      : 0;

  return {
    qty: q,
    discountPct: pct,
    standUnit,
    standUnitBase,
    farveTillaeg,
    standTotal,
    monthly: product.monthlyPrice ?? 0,
    setup,
    frontfarve,
    oneTimeTotal: standTotal + setup + frontfarve,
  };
}

/**
 * Sender varen et fysisk skilt med posten?
 *
 * Alle varer gør det i dag, og derfor er flaget en UNDTAGELSE frem for et
 * krav: en ny vare er fysisk, medmindre nogen aktivt siger andet. Havde det
 * været omvendt, ville en glemt markering stille fjerne farvevalget og
 * logo-uploadet fra en vare, der skal sendes.
 */
export function harFysiskSkilt(product: Pick<Product, "kunDigital">): boolean {
  return !product.kunDigital;
}

/**
 * MÆRKET I HJØRNET AF ET KATALOGKORT — ét sted, fordi kortet tegnes to gange.
 *
 * Kortet har en gren med foto og en gren med pladsholder, og mærket stod
 * skrevet ud i dem begge. To kopier af den samme if-kæde driver fra hinanden
 * den dag, kun den ene bliver rettet.
 *
 * **„KOMPLET" MÅ IKKE STÅ PÅ DEN DIGITALE VARE.** Mærket kom af
 * `includesLoyalSum`, altså „denne vare giver hele platformen", og det var
 * sandt for begge Komplet-varer. Men LoyalSum Komplet er `featured` og bærer
 * derfor „Mest populær", så i kataloget stod ordet **Komplet** i praksis kun
 * på LoyalSum Komplet **Online** — lige ved siden af den vare, der faktisk
 * hedder Komplet. Læst på et blik siger det, at den anden ikke er den
 * komplette, og dét er det modsatte af sandheden: de to har nøjagtig samme
 * software, og forskellen er standeren.
 *
 * Derfor spørges `kunDigital` FØR `includesLoyalSum`. Mærket siger nu, hvad
 * varen ER, og ikke hvilken pakke den hører til — og „Digital" er valgt frem
 * for „Uden stander", fordi et mærke, der starter med et fravær, sælger en
 * vare på det, den ikke har.
 */
export function kortMaerke(
  product: Pick<Product, "featured" | "kunDigital" | "includesLoyalSum">,
): { tekst: string; fremhaevet: boolean } | null {
  if (product.featured) return { tekst: "Mest populær", fremhaevet: true };
  if (product.kunDigital) return { tekst: "Digital", fremhaevet: false };
  if (product.includesLoyalSum) return { tekst: "Komplet", fremhaevet: false };
  return null;
}

/**
 * Varerne, der giver hele LoyalSum-platformen — uanset om der følger en
 * stander med.
 *
 * DEN FINDES FOR AT KUNNE PRØVES, ikke for at blive spurgt i en if-sætning:
 * adgangen afgøres fortsat af `hasLoyaltyAccess()` på ÉT sted. Listen her gør
 * det muligt for en prøve at kræve, at de to Komplet-varer har nøjagtig de
 * samme softwarefunktioner — så den dag en ny funktion kommer til, kan den
 * ikke stille blive glemt for den digitale udgave.
 */
export function komplette(): Product[] {
  return PRODUCTS.filter((p) => p.includesLoyalSum && !p.addon);
}

/*
 * HER LÅ EN PARALLEL PRISSTIGE — `Plan`, `LOYALSUM_PLANS` og `getPlan()` —
 * med Basic 0 kr., Premium 79 kr./md. og Pro 149 kr./md.
 *
 * INGEN AF DE PRISER FANDTES. Abonnementet købes som en del af et produkt
 * (Reviewstander Pro 99 kr./md., LoyalSum Komplet 399 kr./md.), og
 * basic/premium/pro er ADGANGSNIVEAUER, der følger med købet — ikke varer.
 * Dashboardets abonnementsside blev rettet, dengang det blev opdaget, men
 * stigen blev stående og kunne rendres af den næste, der ledte efter en
 * prisliste i constants.
 *
 * Der er derfor ét sted at sælge fra: PRODUCTS, og KATALOG som den
 * offentlige delmængde.
 */

export const DESTINATION_LABELS: Record<string, string> = {
  google: "Google Anmeldelse",
  trustpilot: "Trustpilot",
  facebook: "Facebook",
  custom: "Eget link",
};

/**
 * Ordrens mulige tilstande — LISTEN, ikke bare etiketterne.
 *
 * Den fandtes før som en løs `as const` inde i `order-status.tsx` og som en
 * enum i basen, mens server-handlingen kastede en vilkårlig streng til
 * `OrderStatus` uden at prøve den. Står listen ét sted, kan brugerfladen,
 * valideringen og etiketterne ikke komme til at være uenige.
 */
export const ORDER_STATUSSER = [
  "new",
  "needs_onboarding",
  "ready_for_production",
  "shipped",
  "cancelled",
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  new: "Ny ordre",
  needs_onboarding: "Mangler onboarding",
  ready_for_production: "Klar til produktion",
  shipped: "Afsendt",
  cancelled: "Annulleret",
};
