import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getProduct, hasLoyaltyAccess } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard-shell";

/**
 * Personale hører til LoyalSum Komplet.
 *
 * SPÆRRINGEN HANG FØR PÅ `harAbonnement()`, altså "har du købt en løbende
 * vare" — og både Reviewstander Pro (99 kr.) og LoyalSum Komplet (399 kr.)
 * svarer ja på dét. En Pro-kunde kunne derfor invitere ansatte ind til en
 * funktion, de ikke har købt.
 *
 * HVORFOR DET ER FORKERT: en medarbejder findes for at kunne stemple, give
 * rabat og indløse — alt sammen stempelkort, og stempelkortet er Komplet.
 * Uden det er medarbejderfladen en invitationsflade til rettigheder, ingen af
 * parterne kan bruge til noget: den ansatte logger ind og møder et panel uden
 * kort at stemple.
 *
 * Fejlen var TAVS og til kundens fordel — intet gik i stykker, ingen klagede.
 * Præcis samme klasse som `/dashboard/opslag`, der heller ikke var spærret.
 *
 * SPÆRRINGEN LIGGER I ET LAYOUT OG IKKE I MENUEN. Et menupunkt, man skjuler,
 * er ikke adgangskontrol — siden kan stadig åbnes ved at skrive adressen — og
 * server-handlingerne kan kaldes direkte, så de spørger `medarbejdereIPlan()`
 * hver for sig. Punktet BLIVER stående i menuen, ligesom Stempelkort og
 * Opslag: det er sådan en Pro-kunde opdager, at funktionen findes.
 *
 * Adgangen afgøres af `companies.product_slug` og ikke af `plan`, fordi både
 * Reviewstander Pro og LoyalSum Komplet er niveau `pro`.
 *
 * DER SPØRGES BEVIDST IKKE TIL SUSPENSION. Samme regel som stempelkortet: en
 * manglende betaling lukker dashboardets indsigt, ikke det personalet står og
 * bruger ved disken — og en butik i restance skal stadig kunne fjerne en
 * medarbejder, der er stoppet.
 */
export default async function PersonaleLayout({
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
          title="Personale"
          description="Medarbejderadgang er en del af LoyalSum Komplet."
        />

        <div className="box-shape max-w-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold tracking-tight">
            Medarbejderadgang er ikke med i dit abonnement
          </h2>
          <p className="mt-2 leading-relaxed text-muted">
            Medarbejdere kan stemple kort, give point, give rabatter og
            indløse belønninger — uden at du deler din egen adgangskode. Det
            hører til loyalitetsdelen, og den følger med LoyalSum Komplet. Du
            beholder din stander, dine links og dine anmeldelser præcis som nu.
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
