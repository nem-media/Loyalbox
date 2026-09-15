/**
 * Et stempelkorts EFFEKTIVE tilstand — status og datovindue lagt sammen.
 *
 * HVORFOR PÅ STEDET OG IKKE EN CRON. Start- og slutdato blev før gemt uden at
 * nogen læste dem: et kort med en slutdato blev aldrig deaktiveret. Vi kunne
 * flippe `status` med et natligt job, men et job kan fejle i stilhed — og "har
 * ikke kørt" ligner "kørte fint". I stedet regnes vinduet ud, hver gang det
 * bruges: `status` er butikkens INTENTION (aktiv/pause/kladde), datoerne er et
 * vindue oven på den. Så kan de to aldrig drive fra hinanden, og der er intet,
 * der kan glemme at køre.
 *
 * DATOERNE ER `date` (YYYY-MM-DD), altså en KALENDERDAG uden klokkeslæt. De
 * sammenlignes derfor mod dagen i dansk tid — ikke serverens UTC, der ved
 * midnat ville tælle en dag forkert. ISO-datoer kan sammenlignes som tekst.
 * Slutdatoen er INKLUSIV: kortet virker dagen ud.
 */

export interface ProgramVindueFelter {
  start_date: string | null;
  end_date: string | null;
}
export interface ProgramStatusFelter extends ProgramVindueFelter {
  status: string;
}

/*
 * Dagens dato i dansk tid boede her, indtil to andre steder viste sig at have
 * hver sin udgave af den — og den ene af dem regnede i UTC. Den ligger nu i
 * `@/lib/dansk-dag` sammen med begyndelsen af dagen som tidspunkt.
 * Genudgives herfra, så alt, der allerede henter den her, bliver ved at virke.
 */
export { iDagDatoKoebenhavn } from "@/lib/dansk-dag";
import { iDagDatoKoebenhavn } from "@/lib/dansk-dag";

export type Vindue = "foer" | "aktiv" | "efter";

/** Er vi før, i, eller efter kortets datovindue? Tomme datoer = ingen grænse. */
export function programVindue(
  p: ProgramVindueFelter,
  iDag: string = iDagDatoKoebenhavn(),
): Vindue {
  if (p.start_date && iDag < p.start_date) return "foer";
  if (p.end_date && iDag > p.end_date) return "efter";
  return "aktiv";
}

/**
 * Må der stemples på kortet lige nu? Kræver BÅDE at butikken har sat det aktivt
 * OG at vi er inde i datovinduet. Dette er den ene sandhed om "aktiv nu".
 */
export function programErAktivtNu(
  p: ProgramStatusFelter,
  iDag: string = iDagDatoKoebenhavn(),
): boolean {
  return p.status === "active" && programVindue(p, iDag) === "aktiv";
}

export type EffektivStatus =
  | "kladde"
  | "planlagt"
  | "aktiv"
  | "udloebet"
  | "pauset"
  | "arkiveret";

/**
 * Tilstanden til visning. En kladde/pause/arkivering er butikkens eget valg og
 * vejer tungere end datoerne — et pauset kort er pauset, uanset vinduet. Er
 * kortet sat aktivt, afgør datoerne, om det er planlagt, aktivt eller udløbet.
 */
export function programEffektivStatus(
  p: ProgramStatusFelter,
  iDag: string = iDagDatoKoebenhavn(),
): EffektivStatus {
  if (p.status === "draft") return "kladde";
  if (p.status === "paused") return "pauset";
  if (p.status === "archived") return "arkiveret";
  const v = programVindue(p, iDag);
  if (v === "foer") return "planlagt";
  if (v === "efter") return "udloebet";
  return "aktiv";
}

/**
 * HVOR MANGE DAGE FØR SLUT SKAL KUNDEN ADVARES?
 *
 * Fjorten. Kortet er et løfte om en belønning, kunden samler mod — og en
 * frist, man først opdager på den sidste dag, er ikke en frist, man kan nå at
 * bruge. To uger er tid nok til at lægge en tur forbi butikken ind, og kort
 * nok til at beskeden ikke bliver tapet på kortet i månedsvis.
 */
export const UDLOEB_VARSEL_DAGE = 14;

/** Hele dage fra `fra` til `til`, begge som YYYY-MM-DD. Negativ = passeret. */
export function dageMellem(fra: string, til: string): number {
  const a = Date.parse(`${fra}T00:00:00Z`);
  const b = Date.parse(`${til}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/**
 * HVAD SKAL DER STÅ OM GYLDIGHEDEN PÅ KUNDENS EGET KORT?
 *
 * DET HER FANDTES IKKE, OG DET VAR EN RIGTIG FEJL. Datovinduet håndhæves i
 * `giveStamp()` — et udløbet kort afvises med "Stempelkortet er udløbet" — men
 * beskeden går til PERSONALET ved disken. På kundens kort stod der intet:
 * hverken hvornår det udløb, eller at det var sket. En kunde med otte ud af ti
 * stempler kunne altså samle mod en belønning, der stille løb ud, og først
 * opdage det, da den ikke kunne indløses.
 *
 * Et løfte om en belønning, der udløber uden oplysning, er også svært at
 * forsvare efter markedsføringsloven — og det er præcis samme klasse som
 * review gating, som systemet ellers bevidst er bygget udenom.
 *
 * REN FUNKTION OG IKKE EN KOMPONENT, så både kortsiden, "Mine stempelkort" og
 * butikkens egen forhåndsvisning kan sige nøjagtig det samme. Tre håndskrevne
 * udgaver ville før eller siden blive til tre forskellige løfter.
 *
 * `null` betyder, at der ikke er noget at sige: intet vindue, ingen linje.
 */
export type Gyldighed =
  /** Kortet er ikke begyndt endnu. */
  | { slags: "planlagt"; dato: string; dage: number }
  /** Der er en slutdato, og der er god tid. */
  | { slags: "gaelder"; dato: string; dage: number }
  /** Slutdatoen nærmer sig — se UDLOEB_VARSEL_DAGE. */
  | { slags: "snart"; dato: string; dage: number }
  /** Datoen er passeret. Der kan ikke stemples mere. */
  | { slags: "udloebet"; dato: string; dage: number };

export function gyldighed(
  p: ProgramVindueFelter,
  iDag: string = iDagDatoKoebenhavn(),
): Gyldighed | null {
  /*
   * STARTDATOEN NÆVNES KUN, HVIS DEN LIGGER FORUDE. Er kortet i gang, er det
   * ligegyldigt for kunden, hvornår butikken satte det op — og en linje om
   * noget, der allerede er sket, tager pladsen fra den, der betyder noget.
   */
  if (p.start_date && iDag < p.start_date) {
    return {
      slags: "planlagt",
      dato: p.start_date,
      dage: dageMellem(iDag, p.start_date),
    };
  }

  if (!p.end_date) return null;

  const dage = dageMellem(iDag, p.end_date);
  if (dage < 0) return { slags: "udloebet", dato: p.end_date, dage };
  // `<=` og ikke `<`: er der præcis fjorten dage igen, er det dét, varslet er
  // til for. Og dage === 0 er den sidste gyldige dag — kortet virker i dag.
  if (dage <= UDLOEB_VARSEL_DAGE) {
    return { slags: "snart", dato: p.end_date, dage };
  }
  return { slags: "gaelder", dato: p.end_date, dage };
}

/**
 * Linjen, kunden læser. Ét sted, så kortet og oversigten ikke kan sige hver
 * sit — samme regel som `ADRESSE_TEKSTER`.
 *
 * DER SKRIVES DAGE OG IKKE KUN EN DATO, når det haster: "gælder til 30.
 * november" og "udløber om 3 dage" er to forskellige beskeder, og kun den
 * sidste får nogen til at gå forbi butikken.
 */
export function gyldighedTekst(g: Gyldighed, dato: string): string {
  switch (g.slags) {
    case "planlagt":
      return `Kortet gælder fra ${dato}`;
    case "gaelder":
      return `Gælder til og med ${dato}`;
    case "snart":
      return g.dage === 0
        ? `Sidste dag i dag — ${dato}`
        : g.dage === 1
          ? `Udløber i morgen — ${dato}`
          : `Udløber om ${g.dage} dage — ${dato}`;
    case "udloebet":
      return `Udløbet ${dato} — der kan ikke samles flere stempler`;
  }
}

export const EFFEKTIV_STATUS_LABELS: Record<EffektivStatus, string> = {
  kladde: "Kladde",
  planlagt: "Planlagt",
  aktiv: "Aktivt",
  udloebet: "Udløbet",
  pauset: "Pauset",
  arkiveret: "Arkiveret",
};
