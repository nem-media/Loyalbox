import { reviewUrl } from "./site";
import type { DestinationType } from "./types/database";

/**
 * Hvad står der i QR-koden på et trykt skilt?
 *
 * TO SVAR, OG FORSKELLEN ER ABONNEMENTET.
 *
 * MED abonnement peger koden på `loyalsum.dk/r/<slug>`. Butikken har en side
 * hos os — anmeldelsesflowet, stempelkortet, statistikken — og adressen kan
 * pege et nyt sted hen uden et nyt tryk. Det er noget, vi passer, og det er
 * dét, abonnementet betaler for.
 *
 * UDEN abonnement peger koden DIREKTE på butikkens eget link. Det er et
 * engangskøb: vi trykker et skilt og sender det. Går koden gennem os, har vi
 * påtaget os at holde en viderestilling kørende i al fremtid for en vare, der
 * blev betalt én gang — og skiltet holder op med at virke den dag, vi ikke
 * gør. Et trykt skilt, kunden ejer, skal ikke afhænge af en tjeneste, de ikke
 * betaler for.
 *
 * PRISEN ER, AT LINKET IKKE KAN ÆNDRES. Det er allerede sådan, resten af
 * systemet er skruet sammen: `kraeverDestination()` spørger netop, fordi
 * destinationen afgøres én gang for alle i det øjeblik, skiltet går i
 * trykken. Kun bestillingen uden konto lovede noget andet.
 *
 * Skal linket skiftes senere, skal der et nyt skilt til. Det er ikke en
 * ekstra regning: et abonnement KØBES med en stander, så den, der opgraderer,
 * får et nyt skilt med i købet.
 *
 * QR-koden bliver ikke nævneværdigt tættere af det. Målt på feltets 40,8 mm:
 * vores egen adresse giver 1,24 mm pr. modul, et typisk Google-anmeldelseslink
 * 1,00 mm, og selv 300 tegn giver 0,56 mm — stadig over det, et telefonkamera
 * skal bruge.
 */

/** De kolonner, en stander kan have sin destination i. */
export interface StandDestination {
  destination_type: DestinationType | null;
  google_review_url: string | null;
  trustpilot_url: string | null;
  facebook_url: string | null;
  custom_url: string | null;
}

/**
 * Butikkens eget link, læst ud af den kolonne, typen peger på.
 *
 * TYPEN AFGØR KOLONNEN og ikke omvendt. En stander kan have flere udfyldte —
 * en butik, der har skiftet fra Google til Trustpilot, har begge stående — og
 * uden typen ville rækkefølgen i koden bestemme, hvor skiltet førte hen.
 */
export function standensDestination(s: StandDestination): string | null {
  const url =
    s.destination_type === "google"
      ? s.google_review_url
      : s.destination_type === "trustpilot"
        ? s.trustpilot_url
        : s.destination_type === "facebook"
          ? s.facebook_url
          : s.custom_url;

  return url?.trim() || null;
}

/**
 * Adressen, der skal stå i QR-koden — reglen ét sted.
 *
 * `null` betyder, at der ikke er noget at trykke: så bliver skabelonens
 * pladsholder stående. Et skilt med en FORKERT kode er værre end et med en
 * pladsholder, for den forkerte bliver trykt og opdaget af en kunde, der står
 * og scanner.
 */
export function qrAdresseFor(
  stand: StandDestination & { slug: string; kun_viderestilling: boolean },
): string | null {
  if (!stand.kun_viderestilling) return reviewUrl(stand.slug);
  return standensDestination(stand);
}
