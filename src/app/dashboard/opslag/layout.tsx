import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getProduct, hasLoyaltyAccess } from "@/lib/constants";
import { abonnementTilstand } from "@/lib/abonnement";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard-shell";

/**
 * Opslag hører til LoyalSum Komplet.
 *
 * DER VAR INGEN SPÆRRING. Produktlisten har hele tiden sagt "Opslag af dine
 * bedste anmeldelser" under LoyalSum Komplet, men enhver med et dashboard —
 * også en Reviewstander Pro-kunde — kunne bruge siden. Salgsteksten og koden
 * sagde altså hver sit, og forskellen var til kundens fordel, hvilket er
 * præcis den slags, ingen opdager, før den er blevet en vane.
 *
 * SPÆRRINGEN LIGGER I ET LAYOUT OG IKKE I MENUEN. Et menupunkt, man skjuler,
 * er ikke adgangskontrol — siden kan stadig åbnes ved at skrive adressen.
 * Punktet BLIVER derfor stående i menuen, ligesom Stempelkort: det er sådan
 * en Pro-kunde opdager, at funktionen findes.
 *
 * Adgangen afgøres af `companies.product_slug` og ikke af `plan`, fordi både
 * Reviewstander Pro og LoyalSum Komplet er niveau `pro` — det er netop
 * produktet, der skiller dem. Samme regel som stempelkortet.
 *
 * To forskellige spærringer, to forskellige beskeder: har butikken slet ikke
 * købt Komplet, er det en salgssituation. Er abonnementet suspenderet, HAR de
 * købt det og skal ikke mødes af en reklame for noget, de allerede ejer.
 */
export default async function OpslagLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const productSlug = user?.company?.product_slug ?? null;
  const suspenderet =
    user?.company != null && abonnementTilstand(user.company) !== "aktiv";

  if (hasLoyaltyAccess(productSlug) && suspenderet) {
    return (
      <>
        <PageHeader
          title="Opslag"
          description="Sat på pause, indtil betalingen er på plads."
        />

        <div className="box-shape max-w-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold tracking-tight">
            Dine anmeldelser er her stadig
          </h2>
          <p className="mt-2 leading-relaxed text-muted">
            Der er ikke slettet noget. Det er kun værktøjet til at lave opslag,
            der er lukket, mens betalingen mangler.
          </p>
          <Link
            href="/dashboard/abonnement"
            className="mt-4 inline-block font-medium text-accent hover:underline"
          >
            Se hvad der skal til →
          </Link>
        </div>
      </>
    );
  }

  if (!hasLoyaltyAccess(productSlug)) {
    const komplet = getProduct("loyalsum-komplet");

    return (
      <>
        <PageHeader
          title="Opslag"
          description="Opslag er en del af LoyalSum Komplet."
        />

        <div className="box-shape max-w-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold tracking-tight">
            Opslag er ikke med i dit abonnement
          </h2>
          <p className="mt-2 leading-relaxed text-muted">
            Med LoyalSum Komplet kan du lave færdige opslag ud af de bedste
            tilbagemeldinger, dine kunder allerede har givet dig — så det, der
            sker i forretningen, også bliver synligt udadtil. Du beholder din
            stander og dine anmeldelser præcis som nu.
          </p>

          {komplet?.monthlyPrice ? (
            <p className="mt-4 text-sm text-muted">
              LoyalSum Komplet koster {formatCurrency(komplet.monthlyPrice)}/md
              ex moms.
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
            <Link href="/produkter/loyalsum-komplet" className="text-accent">
              Se LoyalSum Komplet →
            </Link>
            <Link href="/dashboard/abonnement" className="text-accent">
              Se dit abonnement →
            </Link>
          </div>
        </div>
      </>
    );
  }

  return <>{children}</>;
}
