/**
 * Kontoen, der oprettes EFTER købet.
 *
 * Pro og Komplet krævede før en konto, før man kunne bestille. Basic gør det
 * modsatte, og det er den vej, abonnementerne nu følger: bestil, betal, og
 * få DEREFTER adgang. Virksomheden oprettes uden ejer, og køberen gør den til
 * sin med et token.
 *
 * TOKENET ER AUTORISATIONEN — samme regel som `/kort/<public_token>`: den, der
 * har adressen, må bruge den. Det er derfor det kun sendes til den e-mail,
 * betalingen blev gennemført med, og aldrig til en adresse, nogen taster ind
 * bagefter.
 *
 * TO VEJE IND, OG DET ER MED VILJE. Tak-siden aktiverer med `session_id` fra
 * Stripes redirect, så kunden kommer i gang uden at forlade flowet — og
 * mailen bærer tokenet som RESERVE, hvis fanen bliver lukket. Uden den første
 * ville en tastefejl i e-mailen koste en betalende kunde adgangen til det, de
 * lige har købt; uden den anden ville en lukket fane gøre det samme.
 *
 * INTET HERI RØRER DATABASEN. Reglerne skal kunne prøves uden hverken Stripe
 * eller Supabase, fordi det er dem, der afgør, om en fremmed kan overtage en
 * betalende kundes virksomhed.
 */

/**
 * Hvor længe et aktiveringstoken gælder.
 *
 * 30 DAGE, og det er ikke rundet af på må og få: skiltet er 3-5 hverdage om
 * at komme frem, og en del kunder sætter sig først med opsætningen, når det
 * står på disken. Et kortere vindue ville ramme netop dem.
 *
 * Men det SKAL udløbe. Et token uden udløb bliver liggende i en indbakke for
 * altid, og en videresendt kvittering ville kunne overtage virksomheden år
 * senere.
 */
export const AKTIVERING_DAGE = 30;

/** Felterne, aktiveringen afgøres ud fra. */
export interface AktiveringsFelter {
  user_id: string | null;
  aktivering_token: string | null;
  aktivering_udloeber: string | null;
}

/** Hvornår et token, udstedt nu, holder op med at gælde. */
export function aktiveringUdloeber(nu = new Date()): Date {
  const d = new Date(nu);
  d.setDate(d.getDate() + AKTIVERING_DAGE);
  return d;
}

/**
 * Hvorfor kan virksomheden IKKE aktiveres? Null betyder at den kan.
 *
 * SVARER MED EN GRUND og ikke bare falsk, af samme årsag som `koebSpaerre()`:
 * "den er allerede aktiveret" og "linket er udløbet" er to vidt forskellige
 * beskeder, og en side, der bare siger nej, efterlader en betalende kunde
 * uden at vide, om de skal logge ind eller skrive til os.
 */
export type AktiveringSpaerre =
  /** Virksomheden har allerede en ejer — kunden skal logge ind i stedet. */
  | "allerede-aktiveret"
  /** Der er intet token; virksomheden er ikke købt gennem dette flow. */
  | "intet-token"
  /** Tokenet er for gammelt. */
  | "udloebet";

export function aktiveringSpaerre(
  c: AktiveringsFelter | null | undefined,
  nu = new Date(),
): AktiveringSpaerre | null {
  if (!c) return "intet-token";

  // REKKEFØLGEN ER IKKE LIGEGYLDIG. En virksomhed med ejer skal have beskeden
  // "log ind", også selv om der stadig ligger et token — ellers ville et
  // gammelt link kunne overtage en konto, der er i brug.
  if (c.user_id) return "allerede-aktiveret";
  if (!c.aktivering_token) return "intet-token";

  const udloeb = c.aktivering_udloeber
    ? new Date(c.aktivering_udloeber)
    : null;
  if (!udloeb || Number.isNaN(udloeb.getTime())) return "udloebet";
  if (udloeb.getTime() <= nu.getTime()) return "udloebet";

  return null;
}

export function kanAktiveres(
  c: AktiveringsFelter | null | undefined,
  nu = new Date(),
): boolean {
  return aktiveringSpaerre(c, nu) === null;
}

/**
 * Adgangskodens eneste krav.
 *
 * SAMME GRÆNSE SOM `/signup` (seks tegn). To forskellige krav to steder ville
 * betyde, at en kode, der blev afvist her, virkede der — og kunden ville ikke
 * kunne se hvorfor.
 */
export const KODE_MINIMUM = 6;
export const KODE_FEJL = `Adgangskoden skal være mindst ${KODE_MINIMUM} tegn.`;

export function erGyldigKode(kode: string | null | undefined): boolean {
  return (kode ?? "").length >= KODE_MINIMUM;
}

/** Det kunden får at vide, samlet så tak-siden og /aktiver siger det samme. */
export const AKTIVERING_TEKSTER = {
  overskrift: "Vælg en adgangskode, så er du i gang",
  hjaelp:
    "Din stander er oprettet og venter kun på, hvor QR-koden skal føre hen. Det tager et minut.",
  alleredeAktiveret:
    "Den her konto er allerede oprettet. Log ind med din e-mail og adgangskode.",
  udloebet:
    "Linket er for gammelt. Skriv til os, så sender vi et nyt — dit køb og din stander er urørt.",
  intetToken:
    "Vi kan ikke finde en bestilling til det her link. Skriv til os, så finder vi ud af det.",
} as const;
