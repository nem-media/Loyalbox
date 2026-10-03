import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getProduct, hasLoyaltyAccess } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard-shell";

/**
 * Webshopintegrationen hører til LoyalSum Komplet og LoyalSum Komplet Online.
 *
 * Den er en KANAL til loyalitetsprogrammerne — point og stempler optjent i
 * webshoppen — og uden et program er der intet at forbinde en webshop til.
 * Derfor samme spærring som `/dashboard/loyalitet` og `/dashboard/personale`:
 * PRODUKTET afgør det (`hasLoyaltyAccess`), ikke `plan`, fordi Reviewstander
 * Pro og LoyalSum Komplet er samme niveau.
 *
 * ET LAYOUT ER IKKE ADGANGSKONTROL. Handlingerne spørger `commerceIPlan()`
 * hver for sig, og API'et afviser selv en butik, hvis abonnement er faldet
 * bort (`entitlement_required`). Punktet bliver stående i menuen, så en
 * Pro-kunde kan se, at funktionen findes.
 */
export default async function IntegrationerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const productSlug = user?.company?.product_slug ?? null;

  if (!hasLoyaltyAccess(productSlug)) {
    const komplet = getProduct("loyalsum-komplet");

    return (
      <>
        <PageHeader
          title="Integrationer"
          description="Forbind din webshop med LoyalSum Komplet."
        />

        <div className="box-shape max-w-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold tracking-tight">
            WooCommerce-integrationen er inkluderet i LoyalSum Komplet og
            LoyalSum Komplet Online
          </h2>
          <p className="mt-2 leading-relaxed text-muted">
            Med LoyalSum Komplet kan dine kunder optjene point og stempler, når
            de handler i din webshop — på det samme kort, som de bruger i
            butikken. Du beholder din stander, dine links og dine anmeldelser
            præcis som nu.
          </p>

          {komplet?.monthlyPrice ? (
            <p className="mt-4 text-sm text-muted">
              LoyalSum Komplet koster {formatCurrency(komplet.monthlyPrice)}/md
              ex moms.
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
            <Link
              href="/produkter/loyalsum-komplet"
              className="trykmaal text-accent"
            >
              Se LoyalSum Komplet →
            </Link>
            <Link href="/dashboard/abonnement" className="trykmaal text-accent">
              Se dit abonnement →
            </Link>
          </div>
        </div>
      </>
    );
  }

  return <>{children}</>;
}
