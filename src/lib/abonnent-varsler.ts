import { dageTil, sletningSker } from "@/lib/abonnement";
import type { AbonnentFelter, BadgeTone } from "@/lib/abonnenter";

/**
 * Det, ingen opdager af sig selv.
 *
 * Abonnentlisten viser tilstanden, men tilstanden er kun det, der ALLEREDE er
 * sket. Varslerne her er de ting, der er på vej — eller som er gået galt et
 * sted, hvor systemet ikke selv siger fra:
 *
 *   Et kort, der udløber om seks uger, er den hyppigste årsag til, at et
 *   velfungerende abonnement pludselig går i past_due. Det er også den eneste
 *   af dem, der kan afværges med et opkald, før noget går galt.
 *
 *   En uenighed mellem vores status og Stripes betyder, at en webhook er gået
 *   tabt. Så bygger kundens adgang på det forkerte af to tal, og der er intet
 *   i systemet, der opdager det — webhooken fejlede jo ikke, den kom aldrig.
 *
 * EGEN FIL UDEN `server-only`. Varslerne er ren regning på tal, vi allerede
 * har, og skal kunne prøves uden et netværk. Derfor tager de et UDDRAG af
 * Stripe-svaret og ikke `Betaling` selv — den type bor i en server-only fil,
 * og en import derfra ville trække hele Stripe-klienten med ind i prøverne.
 */

/**
 * Hvor lang tid før et kort udløber, vi vil vide det.
 *
 * TO MÅNEDER, fordi det skal kunne nå at blive til et opkald og et nyt kort,
 * FØR en betaling fejler. Et varsel, der kommer samme uge, som kortet udløber,
 * er ikke et varsel — det er en besked om, at det er for sent.
 */
export const KORT_VARSEL_DAGE = 60;

/** Hvor tidligt en forestående sletning skal stå på skærmen. */
export const SLETNING_VARSEL_DAGE = 60;

/** Kun det, varslerne har brug for at vide om betalingen. */
export interface BetalingsUddrag {
  status: string;
  stopperVedPeriodeslut: boolean;
  kort: { udloebMaaned: number; udloebAar: number } | null;
}

export type VarselType =
  | "ikke-faktureret"
  | "status-uenig"
  | "kort-udloebet"
  | "kort-udloeber"
  | "opsagt"
  | "sletning-naer";

export interface Varsel {
  type: VarselType;
  tone: BadgeTone;
  overskrift: string;
  detalje: string;
}

/**
 * Hvornår holder kortet op med at virke?
 *
 * ET KORT ER GYLDIGT MÅNEDEN UD. "04/2027" betyder til og med 30. april, ikke
 * til den 1. Regnes der fra den første, varsler vi en måned for tidligt og —
 * værre — kalder et kort udløbet, mens det stadig trækker fint.
 */
export function kortUdloeberDen(kort: {
  udloebMaaned: number;
  udloebAar: number;
}): Date {
  // Den 1. i måneden EFTER, minus et millisekund.
  return new Date(Date.UTC(kort.udloebAar, kort.udloebMaaned, 1) - 1);
}

/**
 * Alle varsler for én abonnent, alvorligste først.
 *
 * `nu` kan sættes, så prøverne ikke afhænger af, hvornår de køres.
 */
export function varslerFor(
  company: AbonnentFelter,
  betaling: BetalingsUddrag | undefined,
  nu: Date = new Date(),
): Varsel[] {
  const varsler: Varsel[] = [];

  /*
   * DEN DYRESTE. En abonnementsvare uden noget abonnement hos Stripe er en
   * kunde, der er sat op i hånden i admin og aldrig faktureret. Der kommer
   * ingen penge ind, alt ser normalt ud, og intet andet i systemet siger fra.
   */
  if (!company.stripe_subscription_id) {
    varsler.push({
      type: "ikke-faktureret",
      tone: "danger",
      overskrift: "Aldrig faktureret",
      detalje:
        "Virksomheden står med en abonnementsvare, men har intet abonnement hos Stripe. Der bliver ikke trukket noget.",
    });
  }

  /*
   * En tabt webhook. Stripes tal er det rigtige; vores er det, resten af
   * systemet bygger kundens adgang på.
   */
  if (betaling && betaling.status !== company.stripe_status) {
    varsler.push({
      type: "status-uenig",
      tone: "danger",
      overskrift: "Uenig med Stripe",
      detalje: `Vi har "${company.stripe_status ?? "ingen"}", Stripe har "${
        betaling.status
      }". En webhook er sandsynligvis gået tabt — Stripes tal er det rigtige.`,
    });
  }

  if (betaling?.kort) {
    const udloeb = kortUdloeberDen(betaling.kort);
    const dage = dageTil(udloeb, nu);
    if (udloeb.getTime() < nu.getTime()) {
      varsler.push({
        type: "kort-udloebet",
        tone: "danger",
        overskrift: "Kortet er udløbet",
        detalje: `Betalingskortet udløb ${maanedAar(betaling.kort)}. Næste træk vil fejle.`,
      });
    } else if (dage !== null && dage <= KORT_VARSEL_DAGE) {
      varsler.push({
        type: "kort-udloeber",
        tone: "warning",
        overskrift: "Kortet udløber snart",
        detalje: `Betalingskortet udløber ${maanedAar(
          betaling.kort,
        )} — om ${dage} dage. Et nyt kort nu forhindrer en fejlet betaling.`,
      });
    }
  }

  /*
   * Ikke en fejl, men penge på vej ud. Det er værd at vide FØR sidste træk og
   * ikke den måned, hvor omsætningen falder uden forklaring.
   */
  if (betaling?.stopperVedPeriodeslut) {
    varsler.push({
      type: "opsagt",
      tone: "warning",
      overskrift: "Opsagt",
      detalje:
        "Abonnementet kører perioden ud og fornys ikke. Der trækkes ikke igen bagefter.",
    });
  }

  const sletning = sletningSker(company);
  const dageTilSletning = dageTil(sletning, nu);
  if (
    sletning &&
    dageTilSletning !== null &&
    dageTilSletning <= SLETNING_VARSEL_DAGE
  ) {
    varsler.push({
      type: "sletning-naer",
      tone: "danger",
      overskrift: "Data slettes snart",
      detalje: `Alt om kundens egne medlemmer, stempler og feedback slettes om ${dageTilSletning} dage. Det kan ikke gøres om.`,
    });
  }

  return varsler;
}

/** "04/2027". Egen funktion, fordi den bruges i to varseltekster. */
function maanedAar(kort: { udloebMaaned: number; udloebAar: number }): string {
  return `${String(kort.udloebMaaned).padStart(2, "0")}/${kort.udloebAar}`;
}

/**
 * Er der noget, der haster?
 *
 * Bruges til tallet på admin-oversigten. Kun de røde tæller med: en opsigelse
 * og et kort, der udløber om syv uger, skal ses, men de skal ikke få et tal på
 * forsiden til at lyse rødt hver eneste dag, indtil nogen rydder dem — og det
 * kan man ikke, for der er intet at rydde.
 */
export function erAlvorligt(v: Varsel): boolean {
  return v.tone === "danger";
}
