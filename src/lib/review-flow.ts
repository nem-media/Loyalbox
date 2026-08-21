/**
 * Valgene på anmeldelsessiden — og reglen om, at de er ENS uanset stjerner.
 *
 * HVORFOR DET LIGGER I EN FUNKTION OG IKKE BARE I JSX'EN: flowet delte før
 * ved fire stjerner. Tilfredse kunder fik "Anmeld os på Google" som den store
 * knap, mens utilfredse fik den samme mulighed nedtonet under en primær knap,
 * der sendte feedback ind i huset. Det er review gating — den offentlige
 * opfordring gives fortrinsvis til dem, der er glade.
 *
 * Markedsføringslovens bilag 1 forbyder at give urigtige oplysninger om
 * forbrugeranmeldelser for at fremme et produkt, og Forbrugerombudsmanden har
 * lagt sig fast på, at man ikke må opfordre selektivt til positive
 * anmeldelser. Googles egen anmeldelsespolitik forbyder det samme, og
 * konsekvensen dér rammer butikken: dens anmeldelser kan blive fjernet.
 *
 * Det er samme regel som REVIEW_INDEPENDENCE_NOTICE i loyalty/constants ét
 * skridt længere ude: en anmeldelse må hverken købes eller sorteres frem.
 *
 * DERFOR TAGER `reviewChoices()` IKKE BEDØMMELSEN SOM ARGUMENT. Den kan ikke
 * sortere efter noget, den ikke får at vide. Skulle nogen få den idé at give
 * den stjernerne igen, er det en signaturændring og ikke en tilføjet
 * if-sætning — og så bliver det opdaget i en gennemgang.
 */

export interface PublicLink {
  type: string;
  url: string;
  platform: string;
}

export interface ReviewChoice {
  /** "public" = videre til en anmeldelsesplatform. "private" = direkte til butikken. */
  kind: "public" | "private";
  /** Nøgle til React-lister. */
  key: string;
  /** Knapteksten. */
  label: string;
  /**
   * Visuel vægt. ALLE valg har samme vægt — det er hele pointen, og
   * `review-flow.test.ts` fejler, hvis et valg får en anden.
   */
  weight: "primary";
  /** Hvor der sendes hen. Kun på offentlige valg. */
  url?: string;
}

export const PRIVATE_CHOICE_KEY = "privat";

/**
 * De valg kunden får efter at have sat stjerner.
 *
 * Rækkefølgen er fast: de offentlige platforme butikken har valgt, og derefter
 * feedback direkte til butikken. Rækkefølgen afhænger IKKE af bedømmelsen.
 */
export function reviewChoices(publicLinks: PublicLink[]): ReviewChoice[] {
  const choices: ReviewChoice[] = publicLinks.map((link) => ({
    kind: "public",
    key: link.type,
    label: `Anmeld os på ${link.platform}`,
    weight: "primary",
    url: link.url,
  }));

  choices.push({
    kind: "private",
    key: PRIVATE_CHOICE_KEY,
    label: "Send feedback direkte til os",
    weight: "primary",
  });

  return choices;
}

/**
 * Teksten i kommentarfeltet må gerne følge bedømmelsen.
 *
 * Det er forskellen på at hjælpe og at sortere: her ændres ordlyden af ét
 * spørgsmål, ikke hvilke muligheder kunden får. En utilfreds kunde skal ikke
 * spørges, hvad der gjorde oplevelsen god.
 *
 * Teksten må ALDRIG nævne en anmeldelsesplatform — så ville den blive en
 * opfordring forklædt som et spørgsmål. Testen håndhæver det.
 */
export function commentPrompt(rating: number): string {
  if (rating >= 4) {
    return "Vil du fortælle hvad der gjorde din oplevelse god? (valgfrit)";
  }
  if (rating === 3) {
    return "Hvad skulle der til, for at det havde været en god oplevelse? (valgfrit)";
  }
  return "Fortæl os hvad vi kan gøre bedre… (valgfrit)";
}

/** Overskriften over valgene. Også den er ens for alle bedømmelser. */
export const CHOICE_HEADING = "Hvad vil du gøre nu?";
