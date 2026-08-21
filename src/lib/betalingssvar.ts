/**
 * Læser svaret fra /api/checkout uden at kunne kaste.
 *
 * HVORFOR DEN FINDES: klienterne kaldte `res.json()` direkte. Svarede ruten
 * med en TOM krop — hvilket den gør, når en undtagelse slipper igennem og Next
 * returnerer 500 uden indhold — kastede `res.json()` med beskeden
 * "Unexpected end of JSON input", og DEN endte foran kunden.
 *
 * Det er ikke en fejlbesked; det er en implementeringsdetalje fra en
 * JSON-parser. Kunden kan ikke handle på den, og vi kan ikke se af den, hvad
 * der gik galt.
 *
 * Ruten er rettet, så den altid svarer med JSON. Denne findes, fordi "altid"
 * er et løfte om fremtiden, og en tom krop kan opstå igen — fra en timeout,
 * en proxy eller et nyt kodesti, ingen tænkte på.
 */
export interface Betalingssvar {
  url?: string;
  fejl?: string;
}

const GENEREL_FEJL =
  "Betalingen kunne ikke startes. Prøv igen, eller skriv til os, hvis det bliver ved.";

export async function laesBetalingssvar(res: Response): Promise<Betalingssvar> {
  let data: unknown = null;
  try {
    const tekst = await res.text();
    data = tekst ? JSON.parse(tekst) : null;
  } catch {
    // Ugyldig eller tom krop. Behandles som "ingen besked" frem for at kaste.
    data = null;
  }

  const objekt = (data ?? {}) as { url?: unknown; error?: unknown };

  if (res.ok && typeof objekt.url === "string" && objekt.url) {
    return { url: objekt.url };
  }

  return {
    fejl: typeof objekt.error === "string" && objekt.error
      ? objekt.error
      : GENEREL_FEJL,
  };
}
