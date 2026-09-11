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

/** Dagens dato (YYYY-MM-DD) i Europe/Copenhagen. */
export function iDagDatoKoebenhavn(now: Date = new Date()): string {
  // en-CA formaterer som YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
  }).format(now);
}

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

export const EFFEKTIV_STATUS_LABELS: Record<EffektivStatus, string> = {
  kladde: "Kladde",
  planlagt: "Planlagt",
  aktiv: "Aktivt",
  udloebet: "Udløbet",
  pauset: "Pauset",
  arkiveret: "Arkiveret",
};
