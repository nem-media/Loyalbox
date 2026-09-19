import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import {
  FOTO_FARVETEKST,
  harFysiskSkilt,
  KATALOG,
  PRODUKT_FOTO,
  PRODUKT_FOTO_ALT,
  PRODUKT_FOTO_TEKST,
  getProduct,
} from "@/lib/constants";
import { toProductJsonLd } from "@/lib/commerce";
import { formatCurrency } from "@/lib/utils";
import { getSiteUrl, kortMetabeskrivelse } from "@/lib/site";
import { QuantityOrder } from "@/components/quantity-order";
import {
  StanderPlaceholder,
  DigitalPlaceholder,
} from "@/components/product-placeholder";
import { FluebenListe } from "@/components/ui/flueben-liste";

export function generateStaticParams() {
  return KATALOG.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Produkt" };
  /**
   * OG:IMAGE SKAL VÆRE ET FOTO OG IKKE EN SVG. `product.image` er
   * mockup-tegningen, som siden bruger — men **Facebook, LinkedIn og Slack
   * gengiver ikke SVG**, så et delt produktlink stod uden billede. Fotoet i
   * `PRODUKT_FOTO` er en JPG af den rigtige stander og findes i forvejen.
   * Falder tilbage på mockup'en, hvis en vare en dag ikke har et foto.
   */
  /*
   * EN VARE UDEN FOTO FALDER TILBAGE PÅ SITETS EGET KORT — ikke på mockup'en.
   *
   * `product.image` er en SVG, og hverken Facebook, LinkedIn eller Slack
   * gengiver SVG: et delt link stod uden billede. Det gjaldt før alle varer og
   * blev løst med fotoet; LoyalSum Komplet Online har ingen fysisk ting at
   * fotografere, og så er det genererede LoyalSum-kort (`/opengraph-image`)
   * det rigtige — det er en rigtig PNG og siger det rigtige om afsenderen.
   */
  const delebilled =
    PRODUKT_FOTO[product.slug] ??
    (harFysiskSkilt(product) ? product.image : "/opengraph-image");
  // `description` er skrevet til at stå PÅ siden; her klippes den til et
  // søgeresultat på hele sætninger. Se `kortMetabeskrivelse`.
  const beskrivelse =
    product.metaDescription ?? kortMetabeskrivelse(product.description);

  return {
    title: product.metaTitle ?? product.name,
    description: beskrivelse,
    alternates: { canonical: `/produkter/${product.slug}` },
    openGraph: {
      type: "website",
      /*
       * PRISEN I DELETITLEN SKAL VÆRE DEN, VAREN KOSTER. En vare uden
       * engangspris ville ellers blive delt som "0 kr." — og det er den
       * eneste pris, der er værre end ingen.
       */
      title: `${product.name} – ${
        product.price > 0
          ? formatCurrency(product.price)
          : product.monthlyPrice
            ? `${formatCurrency(product.monthlyPrice)}/md`
            : ""
      }`.trim(),
      description: beskrivelse,
      url: `/produkter/${product.slug}`,
      images: [{ url: delebilled }],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  // Tilkøb har ingen offentlig side. De står ikke i generateStaticParams,
  // men en direkte adresse ville ellers stadig kunne rendere en side, ingen
  // uden konto kan bruge til noget.
  if (!product || product.addon) notFound();

  /**
   * BRØDKRUMMER — SAMME FORM SOM `/stempelkort` OG BLOGGEN.
   *
   * Produktsiderne er de eneste i sitets hierarki med to niveauer over sig og
   * havde som de eneste ingen. Google viser stien i stedet for den rå adresse
   * i søgeresultatet, og "loyalsum.dk › Produkter › Reviewstander" siger mere
   * om siden end en URL gør. Hierarkiet er sandt: kataloget ligger faktisk på
   * `/produkter`, og der linkes derop fra siden.
   */
  const base = getSiteUrl();
  const jsonLd = [
    toProductJsonLd(product),
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: base },
        {
          "@type": "ListItem",
          position: 2,
          name: "Produkter",
          item: `${base}/produkter`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: product.name,
          item: `${base}/produkter/${product.slug}`,
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />
      <SiteHeader />
      <main id="indhold" className="mx-auto max-w-side px-4 py-12 sm:py-16">
        <nav className="mb-8 text-sm text-muted">
          <Link href="/produkter" className="hover:text-foreground">
            Produkter
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Billede + billedtekst.
              Fotoet er det SAMME på alle tre varer (se PRODUKT_FOTO), så det
              er teksten under, der siger hvad netop denne vare kan. To linjer:
              varens egen først, dernæst det, der gælder alle tre skilte. */}
          <div>
            {PRODUKT_FOTO[product.slug] ? (
              /* PRODUKT_LOFT OG INGEN STREG. Fotoet er et emne på en
                 bordplade — se `.produkt-loft` i globals.css, hvis skygge er
                 målt i netop dette billede. En 1 px kant om det gjorde det
                 til en illustration i en ramme. */
              <div className="produkt-loft box-shape relative aspect-[4/5] overflow-hidden">
                {/* `relative` er tilføjet, fordi `fill` måler sig mod nærmeste
                    positionerede forælder. Spalten er halv bredde fra `md` og
                    hel derunder. */}
                <Image
                  src={PRODUKT_FOTO[product.slug]}
                  alt={PRODUKT_FOTO_ALT[product.slug] ?? product.name}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : harFysiskSkilt(product) ? (
              <StanderPlaceholder
                className="box-shape aspect-[2/3] overflow-hidden border border-border"
                iconClassName="h-32 w-32"
              />
            ) : (
              /* Ingen stander at tegne og intet foto på vej — se
                 DigitalPlaceholder for hvorfor badgen ikke må stå her. */
              <DigitalPlaceholder
                className="box-shape aspect-[2/3] overflow-hidden border border-border"
                iconClassName="h-32 w-32"
              />
            )}
            {PRODUKT_FOTO_TEKST[product.slug] ? (
              <p className="mt-4 text-sm text-muted">
                {PRODUKT_FOTO_TEKST[product.slug]}
              </p>
            ) : null}
            {/*
              FARVETEKSTEN HØRER TIL TRYKKET. Den lover et gratis farvevalg på
              stjernerne og en egen baggrundsfarve mod tillæg — altså to valg,
              man træffer om et SKILT. På LoyalSum Komplet Online er der intet
              at trykke, så linjen ville sælge et tilvalg, varen ikke har, og
              oven i købet et der koster penge.
            */}
            {harFysiskSkilt(product) ? (
              <p className="mt-2 text-sm text-muted">{FOTO_FARVETEKST}</p>
            ) : null}
          </div>

          {/* Detaljer */}
          <div className="flex flex-col">
            {product.featured ? (
              <div className="mb-3">
                <Badge tone="accent">Mest populær</Badge>
              </div>
            ) : null}
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {product.name}
            </h1>
            <p className="mt-2 text-lg text-muted">{product.tagline}</p>

            <p className="mt-6 text-muted">{product.description}</p>

            <FluebenListe punkter={product.features} className="mt-6" />


            <div className="mt-4">
              <QuantityOrder product={product} mode="order" />
            </div>
            <div className="mt-3">
              <Link href="/produkter" className="text-sm font-medium text-accent">
                Se alle produkter →
              </Link>
            </div>

            <div className="mt-6 box-shape border border-accent/20 bg-accent/5 p-4 text-sm text-muted">
              {/*
                "Ingen binding" — uden forbehold, også på abonnementsvarerne.
                Der stod før "ud over løbende måned", men den løbende måned er
                ikke en binding: den er den periode, kunden allerede HAR betalt
                for, og som hun beholder adgangen i. Handelsbetingelsernes §6
                siger ligeud, at der ingen bindingsperiode er. Detaljen om,
                hvornår opsigelsen træder i kraft, hører hjemme dér — ikke som
                et forbehold i en salgslinje.
              */}
              Fri fragt i Danmark · Klar til brug ud af kassen · Ingen binding ·
              Alle priser ex moms
            </div>

            {/* LoyalSum: hele platformen inkluderet — ellers op-salg til Komplet */}
            {product.includesLoyalSum ? (
              <div className="mt-4 box-shape border border-accent/30 bg-accent/5 p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-accent-fg text-xs font-bold">
                    L
                  </span>
                  <h2 className="font-bold">Hele LoyalSum er med</h2>
                </div>
                {/* BEGGE LOYALITETSFORMER. Blokken er varens „hvad får du"
                    på den side, der sælger den, og den nævnte kun
                    stempelkortet — samme halve svar som oversigterne. */}
                <p className="mt-2 text-sm text-muted">
                  <Link href="/stempelkort" className="font-medium text-accent">
                    Digitalt stempelkort
                  </Link>{" "}
                  og{" "}
                  <Link
                    href="/loyalitetsprogram"
                    className="font-medium text-accent"
                  >
                    pointprogram
                  </Link>{" "}
                  uden app, flere Google-anmeldelser, privat feedback, opslag af
                  dine bedste anmeldelser og statistik i realtid — sat op og klar
                  til disken.
                </p>
              </div>
            ) : (
              <div className="mt-4 box-shape border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-accent-fg text-xs font-bold">
                    L
                  </span>
                  <h2 className="font-bold">Vil du også have faste kunder?</h2>
                </div>
                <p className="mt-2 text-sm text-muted">
                  Med <strong>LoyalSum Komplet</strong> får du et digitalt
                  stempelkort uden app oveni — så nye kunder bliver til
                  gengangere. Plus opslag af dine bedste anmeldelser.
                </p>
                <Link
                  href="/produkter/loyalsum-komplet"
                  className="mt-3 inline-block text-sm font-medium text-accent"
                >
                  Se LoyalSum Komplet →
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
