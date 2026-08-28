/**
 * Adressen, pakken skal sendes til.
 *
 * ÉN KOMPONENT, fordi adressen skal stå to steder i admin: på ordren, hvor
 * der pakkes, og på virksomheden, hvor man slår kunden op. Skrevet to steder
 * ville den ene før eller siden mangle en linje — og en adresse, der mangler
 * `line2`, sender pakken det forkerte sted hen uden at se forkert ud.
 *
 * FELTERNE ER STRIPES EGNE navne, fordi jsonb'en gemmes, som Stripe leverede
 * den (migration 0020). De oversættes ikke undervejs: skal en adresse tjekkes
 * mod betalingen, skal de to kunne læses side om side.
 */
export function Leveringsadresse({
  navn,
  adresse,
}: {
  /** Firmanavnet ovenover — det står ikke i Stripes adresseobjekt. */
  navn?: string | null;
  adresse: Record<string, string | null> | null;
}) {
  if (!adresse) return null;

  return (
    <address className="text-sm not-italic leading-relaxed">
      {navn ? (
        <>
          {navn}
          <br />
        </>
      ) : null}
      {adresse.line1}
      {adresse.line2 ? (
        <>
          <br />
          {adresse.line2}
        </>
      ) : null}
      <br />
      {[adresse.postal_code, adresse.city].filter(Boolean).join(" ")}
      <br />
      {adresse.country}
    </address>
  );
}
