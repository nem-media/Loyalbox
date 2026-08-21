import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard-shell";
import { SletForm, AnnullerKnap } from "./slet-form";
import { COMPANY } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { SLETNING_ANGREFRIST_DAGE, dageTil } from "@/lib/abonnement";

export const metadata = { title: "Slet alle data" };

/**
 * Siden hvor butikken selv kan komme af med alt.
 *
 * DEN SKAL FINDES. Butikken er dataansvarlig for sine egne kunders
 * oplysninger og skal kunne slette dem uden at bede os om lov — det er ikke
 * en service, det er deres ret over deres eget materiale.
 *
 * MEN DEN SKAL VÆRE SVÆR AT RAMME VED ET UHELD. Derfor ligger den under
 * Abonnement og ikke i menuen, listen over hvad der forsvinder står FØR
 * knappen, og der er tre spærrer plus en angrefrist. Se src/lib/sletning.ts.
 */
export default async function SletPage() {
  const user = await getCurrentUser();
  const company = user?.company;
  if (!company) redirect("/dashboard");

  const bestilt = Boolean(company.sletning_bestilt_den);
  const udfoeres = company.sletning_udfoeres_den
    ? new Date(company.sletning_udfoeres_den)
    : null;
  const dage = dageTil(udfoeres);

  return (
    <>
      <PageHeader
        title="Slet alle data"
        description="Dine kunders oplysninger er dine. Her kommer du af med dem — permanent."
      />

      {/* ------------------------------------------- en sletning er undervejs */}
      {udfoeres ? (
        <div className="box-shape mb-6 border border-danger/40 bg-danger/5 p-5">
          <p className="font-semibold">
            Alt slettes {formatDate(udfoeres.toISOString())}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed">
            Der er {dage} {dage === 1 ? "dag" : "dage"} tilbage. Indtil da sker
            der ingenting: dine kunder kan stadig få stempler, standeren virker,
            og alt kan komme tilbage, hvis du fortryder.
          </p>
          <div className="mt-4">
            <AnnullerKnap />
          </div>
        </div>
      ) : bestilt ? (
        <div className="box-shape mb-6 border border-secondary/50 bg-secondary/10 p-5">
          <p className="font-semibold">Venter på din bekræftelse</p>
          <p className="mt-1.5 text-sm leading-relaxed">
            Vi har sendt et link til{" "}
            {company.contact_email ?? user!.email}. Der sker ingenting, før du
            klikker det. Kan du ikke finde mailen, så bestil forfra herunder —
            eller skriv til {COMPANY.email}.
          </p>
          <div className="mt-4">
            <AnnullerKnap />
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------ hvad der forsvinder */}
      <div className="box-shape max-w-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold tracking-tight">
          Hvad der bliver slettet
        </h2>
        <ul className="mt-3 space-y-1.5 text-sm leading-relaxed">
          <li>
            Dine kunders stempelkort, stempler, belønninger og rabatter — også
            dem, de har gjort sig fortjent til og ikke har brugt endnu
          </li>
          <li>Al feedback og alle anmeldelser, du har modtaget</li>
          <li>
            Dine standere og deres QR-koder. <strong>De holder op med at
            virke</strong> — en kunde, der scanner, får en fejlside
          </li>
          <li>Dine medarbejderes adgange</li>
          <li>Din virksomhedsprofil, dit logo og dit login</li>
        </ul>

        <h2 className="mt-6 text-lg font-bold tracking-tight">
          Hvad der bliver gemt
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Fakturaerne, med virksomhedens navn og adresse. Det er ikke et valg
          fra vores side: bogføringsloven kræver regnskabsmateriale gemt i fem
          år efter regnskabsårets udløb. De indeholder intet om dine kunder.
        </p>

        <div className="mt-6 border-t border-border pt-5">
          <p className="text-sm leading-relaxed text-muted">
            Når du bestiller, sender vi et bekræftelseslink til virksomhedens
            mailadresse. Først når du har klikket det, sættes en dato — og der
            går {SLETNING_ANGREFRIST_DAGE} dage mere, hvor du kan fortryde.
            Sletningen kan ikke gøres om bagefter.
          </p>
        </div>

        {!bestilt && !udfoeres ? (
          <div className="mt-6">
            <SletForm firmanavn={company.name} />
          </div>
        ) : null}
      </div>

      <p className="mt-6 max-w-2xl text-sm text-muted">
        Vil du hellere have os til at gøre det, skal det gå hurtigere, eller kan
        du ikke komme til virksomhedens mail? Skriv til{" "}
        <a
          href={`mailto:${COMPANY.email}`}
          className="font-medium text-accent hover:underline"
        >
          {COMPANY.email}
        </a>
        , så klarer vi det — vi bekræfter altid først, hvem der spørger.
      </p>

      <p className="mt-4">
        <Link
          href="/dashboard/abonnement"
          className="text-sm font-medium text-accent hover:underline"
        >
          ← Tilbage til abonnement
        </Link>
      </p>
    </>
  );
}
