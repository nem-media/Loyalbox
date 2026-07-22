import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Pricing } from "@/components/pricing";
import { QuantityOrder } from "@/components/quantity-order";
import { PRODUCTS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Bestil din stander",
  description:
    "Bestil din LoyalBox-stander — vælg antal op til 30 stk. med mængderabat. Reviewstander, Reviewstander Pro eller LoyalBox Komplet med digitalt stempelkort.",
  alternates: { canonical: "/bestil" },
};

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ produkt?: string; antal?: string }>;
}) {
  const { produkt, antal } = await searchParams;
  const selected = PRODUCTS.find((p) => p.slug === produkt);
  const initialQty = Number(antal) || 1;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        {selected ? (
          <div className="mx-auto max-w-lg space-y-5">
            <div>
              <Badge tone="accent">Valgt produkt</Badge>
              <h1 className="mt-3 text-2xl font-bold tracking-tight">
                {selected.name}
              </h1>
              <p className="mt-1 text-muted">{selected.tagline}</p>
            </div>

            <ul className="space-y-1 text-sm text-muted">
              {selected.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>

            <QuantityOrder
              product={selected}
              initialQty={initialQty}
              mode="checkout"
            />

            <div className="box-shape border border-accent/20 bg-accent/5 p-4 text-sm text-muted">
              Betaling med kort er på vej (Stripe). Opret din konto nu, så står
              din bestilling klar.
            </div>

            <Link href="/bestil" className="inline-block text-sm font-medium text-accent">
              ← Se alle produkter
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-10 text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                Bestil din stander
              </h1>
              <p className="mt-2 text-muted">
                Vælg det produkt der passer til din forretning — og antal op til
                30 stk. med mængderabat.
              </p>
            </div>
            <Pricing />
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
