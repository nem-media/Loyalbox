import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard-shell";
import { BekraeftForm } from "./bekraeft-form";
import { COMPANY } from "@/lib/constants";
import { tokenPasser, udfoeresDen } from "@/lib/sletning";
import { formatDate } from "@/lib/utils";
import { SLETNING_ANGREFRIST_DAGE } from "@/lib/abonnement";

export const metadata = { title: "Bekræft sletning" };

/**
 * Landingssiden for linket i bekræftelsesmailen.
 *
 * SIDEN SKRIVER IKKE NOGET. Den viser en knap. Grunden er, at mailfiltre og
 * sikkerhedsscannere åbner links i indgående post for at tjekke dem — et link,
 * der slettede noget bare ved at blive hentet, ville kunne udløses af en
 * maskine, ingen havde bedt om noget.
 *
 * At siden ligger under /dashboard er ikke tilfældigt: så kræver den login, og
 * en scanner uden session når aldrig hertil. Tokenet skal OVENIKØBET tilhøre
 * netop den virksomhed, der er logget ind.
 */
export default async function BekraeftPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await getCurrentUser();
  const company = user?.company;
  if (!company) redirect("/dashboard");

  const gyldigt = tokenPasser(token, company.sletning_token);

  if (!gyldigt) {
    return (
      <>
        <PageHeader
          title="Linket virker ikke"
          description="Der er ikke sket noget med dine data."
        />
        <div className="box-shape max-w-2xl border border-border bg-card p-6">
          <p className="leading-relaxed">
            Linket passer ikke til en sletning, der venter på bekræftelse. Det
            sker typisk af én af tre grunde: sletningen er allerede bekræftet,
            den er annulleret, eller der er bestilt en ny bagefter — så bliver
            det gamle link ugyldigt med det samme.
          </p>
          <p className="mt-3 leading-relaxed text-muted">
            Uanset hvad er der ikke slettet noget. Er du i tvivl om, hvad der
            står på din konto, kan du se det på siden herunder eller skrive til{" "}
            {COMPANY.email}.
          </p>
          <Link
            href="/dashboard/abonnement/slet"
            className="mt-4 inline-block font-medium text-accent hover:underline"
          >
            Se status på sletning →
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Bekræft sletning"
        description={`Sidste skridt for ${company.name}.`}
      />

      <div className="box-shape max-w-2xl border border-danger/40 bg-danger/5 p-6">
        <h2 className="text-lg font-bold tracking-tight">
          Trykker du her, sættes sletningen i gang
        </h2>
        <p className="mt-2 leading-relaxed">
          Alt for <strong>{company.name}</strong> slettes{" "}
          {formatDate(udfoeresDen().toISOString())} — om{" "}
          {SLETNING_ANGREFRIST_DAGE} dage. Indtil da sker der ingenting, og du
          kan fortryde med ét klik.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Dine kunders stempelkort og stempler, al feedback, dine standere og
          deres QR-koder, medarbejdernes adgange og dit login. Fakturaerne
          gemmes, som bogføringsloven kræver. Det kan ikke gøres om bagefter.
        </p>

        <div className="mt-5">
          <BekraeftForm token={token!} />
        </div>
      </div>

      <p className="mt-6">
        <Link
          href="/dashboard/abonnement/slet"
          className="text-sm font-medium text-accent hover:underline"
        >
          ← Nej, jeg fortryder
        </Link>
      </p>
    </>
  );
}
