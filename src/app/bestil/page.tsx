import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Pricing } from "@/components/pricing";
import { QuantityOrder } from "@/components/quantity-order";
import { PRODUCTS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { PurchaseNotice } from "@/components/purchase-notice";
import { CheckoutButton } from "@/components/checkout-button";
import { getCurrentUser } from "@/lib/auth";
import { canStartCheckout } from "@/lib/commerce";
import { requiresDpa } from "@/lib/dpa";

export const metadata = {
  title: "Bestil din stander",
  description:
    "Bestil din LoyalSum-stander med mængderabat. Reviewstander, Reviewstander Pro eller LoyalSum Komplet med digitalt stempelkort.",
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

  // Betalingsknappen vises kun, når den rent faktisk virker for den besøgende.
  // Samme regel som /api/checkout håndhæver — ét sted, så de ikke kan komme i
  // utakt: knappen må aldrig vises til nogen, ruten vil afvise.
  const user = await getCurrentUser();
  const canPay = canStartCheckout(user, selected);

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

            {canPay ? (
              <div className="box-shape border border-accent/30 bg-accent/5 p-4">
                <p className="text-sm font-medium">Klar til betaling</p>
                <p className="mt-1 mb-3 text-sm text-muted">
                  Du betaler standeren nu. Abonnementet trækkes den 20. hver
                  måned for den kommende måned.
                </p>
                <CheckoutButton slug={selected.slug} qty={initialQty} />
                {requiresDpa(selected) ? (
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    Når du køber, indgås samtidig vores{" "}
                    <Link
                      href="/databehandleraftale"
                      className="font-medium text-accent"
                    >
                      databehandleraftale
                    </Link>{" "}
                    og{" "}
                    <Link
                      href="/handelsbetingelser"
                      className="font-medium text-accent"
                    >
                      handelsbetingelser
                    </Link>
                    . Aftalen er lovpligtig, fordi vi behandler oplysninger om
                    dine kunder på dine vegne.
                  </p>
                ) : null}
              </div>
            ) : (
              <PurchaseNotice />
            )}

            <QuantityOrder
              product={selected}
              initialQty={initialQty}
              mode="checkout"
            />

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
                Vælg det produkt der passer til din forretning — og hvor mange
                du skal bruge. Jo flere standere, jo lavere pris pr. stk.
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
