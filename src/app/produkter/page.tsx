import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PRODUCTS } from "@/lib/constants";
import { ProductPrice } from "@/components/product-price";

export const metadata = {
  title: "Review standere & Google review skilt",
  description:
    "Vælg din review stander — Google, Trustpilot, Tripadvisor, Facebook eller alt-i-én. QR + NFC, klar med dit logo. Fås også komplet med LoyalBox-platformen.",
  alternates: { canonical: "/produkter" },
};

export default function ProductsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold text-accent">Produkter</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Review standere til Google-anmeldelser
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-muted">
            Et elegant review skilt med QR og NFC til bordet eller kassen. Vælg
            platform — eller gå komplet med LoyalBox-platformen oveni.
          </p>
          <p className="mt-2 text-xs text-muted">Alle priser er ex moms.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PRODUCTS.map((p) => (
            <Link
              key={p.slug}
              href={`/produkter/${p.slug}`}
              className="group box-shape flex flex-col overflow-hidden border border-border bg-card transition-shadow hover:shadow-[0_20px_40px_-24px_rgba(0,0,0,0.4)]"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#e9ebee]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt={p.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {p.featured ? (
                  <div className="absolute left-3 top-3">
                    <Badge tone="accent">Mest populær</Badge>
                  </div>
                ) : p.includesLoyalbox ? (
                  <div className="absolute left-3 top-3">
                    <Badge tone="neutral">Komplet</Badge>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-bold tracking-tight">{p.name}</h2>
                <p className="mt-1 text-sm text-muted">{p.tagline}</p>
                <div className="mt-4">
                  <ProductPrice product={p} />
                </div>
                <span className="mt-4 text-sm font-medium text-accent">
                  Se produkt →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <ButtonLink href="/signup" size="lg">
            Kom i gang
          </ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
