import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import {
  FOTO_FARVETEKST,
  KATALOG,
  PRODUKT_FOTO,
  PRODUKT_FOTO_TEKST,
  getProduct,
} from "@/lib/constants";
import { toProductJsonLd } from "@/lib/commerce";
import { formatCurrency } from "@/lib/utils";
import { QuantityOrder } from "@/components/quantity-order";
import { PurchaseNotice } from "@/components/purchase-notice";
import { StanderPlaceholder } from "@/components/product-placeholder";
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
  return {
    title: product.metaTitle ?? product.name,
    description: product.description,
    alternates: { canonical: `/produkter/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} – ${formatCurrency(product.price)}`,
      description: product.description,
      url: `/produkter/${product.slug}`,
      images: [{ url: product.image }],
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(toProductJsonLd(product)),
        }}
      />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
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
              <div className="box-shape aspect-[4/5] overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={PRODUKT_FOTO[product.slug]}
                  alt={`${product.name} — reviewstander i brug`}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <StanderPlaceholder
                className="box-shape aspect-[2/3] overflow-hidden border border-border"
                iconClassName="h-32 w-32"
              />
            )}
            {PRODUKT_FOTO_TEKST[product.slug] ? (
              <p className="mt-4 text-sm text-muted">
                {PRODUKT_FOTO_TEKST[product.slug]}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-muted">{FOTO_FARVETEKST}</p>
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

            <PurchaseNotice className="mt-8" />

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
                <p className="mt-2 text-sm text-muted">
                  <Link href="/stempelkort" className="font-medium text-accent">
                    Digitalt stempelkort
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
