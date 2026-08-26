import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { harAbonnement } from "@/lib/abonnement";
import { PRODUCTS } from "@/lib/constants";
import { PageHeader } from "@/components/dashboard-shell";

/** Varerne med et abonnement. Udledt, så navnene ikke kan drive. */
const ABONNEMENTER = PRODUCTS.filter((p) => p.monthlyPrice && !p.addon).map(
  (p) => p.name,
);

/**
 * Personale kræver et abonnement.
 *
 * En medarbejder findes for at kunne stemple, give rabat og indløse — alt
 * sammen ting bag et abonnement. Uden et var siden en invitationsflade til
 * rettigheder, ingen af parterne kunne bruge til noget.
 *
 * Spærret på PRODUKTET og ikke på `plan`: planen kan sættes i hånden i admin
 * og havde været sat forkert på en rigtig kunde. Se `harAbonnement()`.
 *
 * Der spørges bevidst ikke til suspension her. Samme regel som stempelkortet:
 * en manglende betaling lukker administrationen, ikke det personalet står og
 * bruger ved disken.
 */
export default async function PersonaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!harAbonnement(user?.company)) {
    return (
      <>
        <PageHeader
          title="Personale"
          description="Medarbejderadgang følger med et abonnement."
        />

        <div className="box-shape max-w-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold tracking-tight">
            Du har ingen medarbejderadgang endnu
          </h2>
          <p className="mt-2 leading-relaxed text-muted">
            Medarbejdere kan stemple kort, give rabatter og indløse belønninger
            — det følger med {ABONNEMENTER.join(" eller ")}. Indtil da er der
            ikke noget for dem at gøre.
          </p>

          <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
            <Link href="/dashboard/abonnement" className="text-accent">
              Se dit abonnement →
            </Link>
            <Link href="/bestil" className="text-accent">
              Design og bestil et skilt →
            </Link>
          </div>
        </div>
      </>
    );
  }

  return <>{children}</>;
}
