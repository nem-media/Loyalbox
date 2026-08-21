import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getProduct, hasLoyaltyAccess } from "@/lib/constants";
import { abonnementTilstand } from "@/lib/abonnement";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard-shell";
import { LoyaltySubnav } from "./subnav";

/**
 * Stempelkortet hører til LoyalSum Komplet. Indtil migration 0008 fandtes der
 * ingen kontrol: enhver virksomhed — også på Basic — kunne oprette et program
 * og køre en fuld kundeklub uden at have betalt for den.
 *
 * Adgangen afgøres af `companies.product_slug`, ikke af `plan`. Grunden er, at
 * både Reviewstander Pro og LoyalSum Komplet er niveau `pro`: de har samme
 * review-funktioner, og det er netop stempelkortet, der skiller dem.
 *
 * Bemærk at spærringen kun dækker DASHBOARDET. Personalet kan fortsat stemple
 * eksisterende kort fra `/kort/[token]`, så en kunde med et halvt fyldt kort
 * ikke står tilbage med et dødt kort, hvis abonnementet falder.
 *
 * To forskellige spærringer, to forskellige beskeder: har butikken slet ikke
 * købt stempelkortet, er det en salgssituation. Er abonnementet suspenderet,
 * HAR de købt det — og skal ikke mødes af en reklame for noget, de allerede
 * ejer, men af hvornår de har det tilbage.
 */
export default async function LoyaltyLayout({
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
          title="Stempelkort"
          description="Sat på pause, indtil betalingen er på plads."
        />

        <div className="box-shape max-w-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold tracking-tight">
            Dine stempelkort kører videre — du kan bare ikke styre dem herfra
          </h2>
          <p className="mt-2 leading-relaxed text-muted">
            Dine kunder samler stadig stempler, personalet kan stadig give og
            indløse dem, og ingenting er slettet. Det er kun administrationen
            her i panelet, der er lukket, mens betalingen mangler.
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
          title="Stempelkort"
          description="Digitalt stempelkort er en del af LoyalSum Komplet."
        />

        <div className="box-shape max-w-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold tracking-tight">
            Stempelkort er ikke med i dit abonnement
          </h2>
          <p className="mt-2 leading-relaxed text-muted">
            Med LoyalSum Komplet kan dine kunder samle stempler på telefonen og
            optjene den belønning, du selv vælger — så de har en grund til at
            komme igen. Du beholder din stander og dine anmeldelser præcis som
            nu.
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

  return (
    <>
      <LoyaltySubnav />
      {children}
    </>
  );
}
