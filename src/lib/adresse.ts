import { LEVERINGSLANDE } from "./constants";

/**
 * Virksomhedens egen leveringsadresse — den kunden vedligeholder selv.
 *
 * IKKE DET SAMME SOM ORDRENS. `orders.leveringsadresse` er bilaget: dét, der
 * blev bekræftet ved BETALINGEN af netop den ordre, og som admin pakker
 * efter. Den her er kundens adressekartotek, og dens ene opgave er at komme
 * FORUD for næste betaling, så en kunde, der er flyttet, ikke skal huske det
 * i checkouten.
 *
 * HVORFOR STRUKTURERET OG IKKE ÉN LINJE: Stripe vil have `line1`,
 * `postal_code` og `city` hver for sig, og en dansk adresse kan ikke deles
 * pålideligt op ud fra fritekst — "Spotorno Allé 4, 2630 Høje Taastrup" og
 * "Spotorno Alle 4 2630 Høje-Taastrup" skal give samme resultat, og det gør
 * ingen regulæretryk. Feltet var fritekst indtil migration 0029.
 *
 * LANDET GEMMES IKKE. Vi sender kun til Danmark (`LEVERINGSLANDE`), og en
 * gemt landekode ville være et felt, der kan komme i modstrid med den liste.
 */

/** Dansk postnummer: præcis fire cifre. Samme håndhævelse som i 0029. */
export const POSTNUMMER_FEJL = "Postnummeret skal være fire cifre.";

export function erGyldigtPostnummer(v: string | null | undefined): boolean {
  return /^[0-9]{4}$/.test((v ?? "").trim());
}

/** Adressens tre dele, som de ligger på virksomheden. */
export interface Adresse {
  address: string | null;
  postnummer: string | null;
  by: string | null;
}

/**
 * Er adressen komplet nok til at sende noget til?
 *
 * ALLE TRE DELE KRÆVES. En halv adresse er værre end ingen: den ser udfyldt
 * ud i profilen og ville blive sendt til Stripe som en mangelfuld
 * forudfyldning, hvor kunden så skal opdage, hvad der mangler.
 */
export function harKompletAdresse(a: Adresse | null | undefined): boolean {
  return Boolean(
    a?.address?.trim() && erGyldigtPostnummer(a.postnummer) && a.by?.trim(),
  );
}

/**
 * Adressen som Stripe vil have den — eller null, hvis den ikke er komplet.
 *
 * `name` er MED, fordi Stripes `shipping` kræver et navn. Uden det afvises
 * opdateringen, og forudfyldningen ville stille udeblive.
 */
export function tilStripeShipping(
  a: Adresse | null | undefined,
  navn: string,
): { name: string; address: { line1: string; postal_code: string; city: string; country: string } } | null {
  if (!harKompletAdresse(a)) return null;
  return {
    name: navn,
    address: {
      line1: a!.address!.trim(),
      postal_code: a!.postnummer!.trim(),
      city: a!.by!.trim(),
      country: LEVERINGSLANDE[0],
    },
  };
}

/**
 * Ordrens gemte adresse læst tilbage som vores tre felter.
 *
 * BRUGES TIL AT FORUDFYLDE PROFILEN for de kunder, der allerede har bestilt,
 * før feltet fandtes. Uden den ville enhver bestående kunde møde tre tomme
 * felter og skulle skrive en adresse, vi i forvejen har fået af dem.
 *
 * Formen er Stripes: `line1`, `postal_code`, `city`. Den læses defensivt,
 * fordi kolonnen er `jsonb` og har rummet det, Stripe nu sendte på det
 * tidspunkt — feltnavne har flyttet sig mellem API-versioner før.
 */
export function adresseFraOrdre(
  gemt: Record<string, string | null> | null | undefined,
): Adresse | null {
  if (!gemt) return null;
  const line1 = gemt.line1?.trim();
  const postal = gemt.postal_code?.trim();
  const city = gemt.city?.trim();
  if (!line1 || !postal || !city) return null;
  return { address: line1, postnummer: postal, by: city };
}
