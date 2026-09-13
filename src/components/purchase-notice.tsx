import { VentelisteForm } from "@/components/venteliste-form";
import { COMPANY } from "@/lib/constants";
import { salgetErAabent } from "@/lib/commerce";

/**
 * "Køb er ikke åbnet endnu"-besked.
 *
 * Vises FØR købsknappen alle de steder, en besøgende kan nå at forsøge et køb.
 * Grunden til at den ligger her og ikke som løs tekst pr. side: den skal kunne
 * fjernes ét sted den dag betalingen åbner.
 *
 * VIGTIGT om ordlyden: der gemmes ingen ordre i dag. At oprette en konto
 * opretter en virksomhed — ikke en bestilling. Derfor må teksten ikke love, at
 * "din bestilling står klar", som den tidligere gjorde på /bestil.
 *
 * VENTELISTEN ER DEN VIGTIGE DEL. Beskeden bad før folk skrive en mail, og
 * det gør de færreste — så en besøgende, der kom for at købe, gik bare igen.
 * Nu kan de skrive sig op på stedet, og vi har dem den dag, salget åbner.
 * Formularen er foldet sammen, fordi beskeden står SYV steder.
 *
 * DEN SKJULER SIG SELV, NÅR SALGET ÅBNER. Beskeden står otte steder, og et
 * go-live, hvor nogen skulle huske dem alle, ville ende med et site, der sagde
 * "du kan ikke købe online endnu" ved siden af en virkende købsknap. Den
 * spørger derfor `salgetErAabent()` og render ingenting i live-tilstand — også
 * de steder, hvor beskeden står i en else-gren.
 *
 * NÅR SALGET ER ÅBNET, og de sidste på ventelisten har hørt fra os, kan filen
 * og dens importer slettes. Ventelisten er ikke en detalje: de mennesker har
 * bedt om at høre fra os, og formularen forsvinder sammen med beskeden her.
 */
export function PurchaseNotice({ className }: { className?: string }) {
  if (salgetErAabent()) return null;

  return (
    <div
      className={
        "box-shape border border-secondary/40 bg-secondary/10 p-4 text-sm " +
        (className ?? "")
      }
    >
      <p className="font-bold tracking-tight">Du kan ikke købe online endnu</p>
      <p className="mt-1 text-muted">
        Vi er ved at sætte betaling op. Skriv dig op, så siger vi til, så snart
        du kan købe — eller skriv til{" "}
        <a
          href={`mailto:${COMPANY.email}?subject=Bestilling`}
          className="font-medium text-accent"
        >
          {COMPANY.email}
        </a>
        , hvis du vil bestille allerede nu.
      </p>
      <VentelisteForm />
    </div>
  );
}
