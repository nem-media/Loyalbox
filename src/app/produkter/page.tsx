import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PRODUCTS, UPCOMING_MERCH } from "@/lib/constants";
import { ProductPrice } from "@/components/product-price";
import { PurchaseNotice } from "@/components/purchase-notice";
import {
  PlaceholderPanel,
  StanderPlaceholder,
  UPCOMING_ICONS,
} from "@/components/product-placeholder";

export const metadata = {
  title: "Standere og materialer til din forretning",
  description:
    "Bestil din LoyalSum-reviewstander med QR og NFC — med mængderabat fra 3 stk. Flere materialer til disken, døren og bordet er på vej.",
  alternates: { canonical: "/produkter" },
};

/* -------------------------------------------------------------------- page */

export default function ProductsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold text-accent">Materialer</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Standere og materialer til din forretning
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Det fysiske, der får kunderne til at scanne. Standeren kan bestilles
            nu — resten af materialerne til disken, døren og bordet er på vej.
          </p>
        </div>

        {/* ------------------------------------------------ kan bestilles nu */}
        <section aria-labelledby="kan-bestilles">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="kan-bestilles" className="text-xl font-bold tracking-tight">
              Kan bestilles nu
            </h2>
            <p className="text-xs text-muted">
              Alle priser er ex moms · mængderabat fra 3 stk.
            </p>
          </div>

          <PurchaseNotice className="mb-6" />

          <div className="grid gap-6 md:grid-cols-3">
            {PRODUCTS.map((p) => (
              <Link
                key={p.slug}
                href={`/produkter/${p.slug}`}
                className="group box-shape flex flex-col overflow-hidden border border-border bg-card transition-shadow hover:shadow-[0_20px_40px_-24px_rgba(0,0,0,0.4)]"
              >
                <StanderPlaceholder
                  className="aspect-[4/5]"
                  iconClassName="h-24 w-24 transition-transform duration-300 group-hover:scale-110"
                >
                  {p.featured ? (
                    <div className="absolute left-3 top-3">
                      <Badge tone="accent">Mest populær</Badge>
                    </div>
                  ) : p.includesLoyalSum ? (
                    <div className="absolute left-3 top-3">
                      <Badge tone="neutral">Komplet</Badge>
                    </div>
                  ) : null}
                </StanderPlaceholder>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-bold tracking-tight">{p.name}</h3>
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
        </section>

        {/* ------------------------------------------------------------ på vej */}
        <section aria-labelledby="paa-vej" className="mt-20">
          <div className="mb-6">
            <h2 id="paa-vej" className="text-xl font-bold tracking-tight">
              På vej
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Vi er i gang med flere materialer, så kunderne møder dig flere
              steder end ved disken. De kan ikke bestilles endnu, og priserne er
              ikke fastlagt.
            </p>
          </div>

          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {UPCOMING_MERCH.map((m) => (
              <li
                key={m.key}
                className="box-shape flex flex-col border border-dashed border-border bg-card"
              >
                <PlaceholderPanel
                  className="aspect-[4/3]"
                  icon={UPCOMING_ICONS[m.key]}
                >
                  <div className="absolute left-3 top-3">
                    <Badge tone="warning">På vej</Badge>
                  </div>
                </PlaceholderPanel>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    {m.placering}
                  </p>
                  <h3 className="mt-1 font-bold tracking-tight">{m.name}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted">{m.tagline}</p>
                  <p className="mt-4 text-sm text-muted">Pris annonceres senere</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-16 text-center">
          <ButtonLink href="/signup" size="lg">
            Kom i gang
          </ButtonLink>
          <p className="mt-3 text-sm text-muted">
            Du kan altid tilføje materialer senere.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
