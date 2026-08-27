import { VentelisteForm } from "@/components/venteliste-form";
import { COMPANY } from "@/lib/constants";

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
 * NÅR STRIPE ÅBNER: slet denne fil og de steder, den importeres. Husk også
 * ventelisten — de mennesker har bedt om at høre fra os.
 */
export function PurchaseNotice({ className }: { className?: string }) {
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
