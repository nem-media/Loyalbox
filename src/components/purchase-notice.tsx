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
 * NÅR STRIPE ÅBNER: slet denne fil og de steder, den importeres.
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
        Vi er ved at sætte betaling op. Vil du bestille allerede nu, så skriv
        til{" "}
        <a
          href="mailto:kontakt@loyalsum.dk?subject=Bestilling"
          className="font-medium text-accent"
        >
          kontakt@loyalsum.dk
        </a>{" "}
        — så vender vi tilbage med det samme.
      </p>
    </div>
  );
}
