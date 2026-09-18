/**
 * LoyalSum Pointprogram — domænet, uden database og uden server.
 *
 * Alt herinde er rene funktioner, så optjeningen kan prøves med tal frem for
 * med en butik. Selve skrivningen ligger i `point-service.ts` og i
 * migrationens SQL-funktioner, hvor saldo og ledger flyttes i samme åndedrag.
 *
 * FORHOLDET TIL STEMPELKORTET: det her er den ANDEN loyalitetsform, ikke en
 * afløser. Stempelkortet er fast progression (10 køb → én belønning);
 * pointprogrammet er en saldo, kunden selv vælger at bruge blandt flere
 * belønninger. De deler kundeidentitet (`loyalty_members`), virksomhed,
 * medarbejdere og rettigheder — resten er hver sin.
 */

/**
 * HØJST FEM LEVENDE POINTPROGRAMMER PR. VIRKSOMHED.
 *
 * Tallet står også i migration 0045, som er dét, der HÅNDHÆVER det — en
 * trigger, der låser virksomheden og tæller. Her står det, fordi teksten på
 * skærmen skal kunne sige tallet, og `point-graense.test.ts` kræver, at de to
 * er ens: en brugerflade, der lover seks, og en base, der giver fem, er en
 * fejl, butikken møder midt i en opsætning.
 *
 * HVORFOR EN GRÆNSE OVERHOVEDET: kunden har én saldo PR. PROGRAM, og
 * personalet skal vælge program ved hver eneste optjening. Uden et loft kan
 * en butik bygge en skærm, ingen kan betjene i en kø.
 */
export const MAKS_POINTPROGRAMMER = 5;
export type PointEarnModel = "per_amount" | "per_visit" | "manual";

export type PointTxnType =
  | "earn"
  | "redeem"
  | "adjust_add"
  | "adjust_remove"
  | "reversal";

/** Programmets status genbruger stempelkortets ord. Se `loyalty/constants.ts`. */
export type PointProgramStatus = "draft" | "active" | "paused" | "archived";

export const POINT_EARN_MODEL_LABELS: Record<PointEarnModel, string> = {
  per_amount: "Point efter beløb",
  per_visit: "Faste point pr. køb",
  manual: "Kun manuel tildeling",
};

/** Den ene linje, der forklarer modellen i en formular. */
export const POINT_EARN_MODEL_HJAELP: Record<PointEarnModel, string> = {
  per_amount:
    "Kunden får point efter, hvor meget der er handlet for. Du vælger, hvor mange kroner der giver ét point.",
  per_visit:
    "Kunden får det samme antal point hver gang, uanset beløbet. Enkelt ved disken.",
  manual:
    "Personalet skriver selv antallet. Brug den, hvis point gives efter aftale.",
};

/**
 * Hvad betyder tallet i `earn_value` for den valgte model?
 *
 * ÉT FELT TIL BEGGE MODELLER er et bevidst valg: to felter ville betyde, at
 * skærmen kunne vise et tal, der ikke bruges til noget, og at et modelskift
 * skulle huske at rydde op i det andet. Prisen er, at betydningen skal siges
 * højt hvert sted, tallet vises — det gør denne funktion.
 */
export function earnValueLabel(model: PointEarnModel): string {
  switch (model) {
    case "per_amount":
      return "Kroner pr. point";
    case "per_visit":
      return "Point pr. køb";
    case "manual":
      return "Bruges ikke ved manuel tildeling";
  }
}

export const POINT_TXN_LABELS: Record<PointTxnType, string> = {
  earn: "Point optjent",
  redeem: "Belønning brugt",
  adjust_add: "Point tilføjet",
  adjust_remove: "Point trukket",
  reversal: "Annulleret",
};

/**
 * KUNDENS ORD for det samme. Historikken på kortet skal kunne læses af en, der
 * lige har købt en kop kaffe — ingen transaktions-id'er, ingen typenavne.
 */
export const POINT_TXN_KUNDETEKST: Record<PointTxnType, string> = {
  earn: "Køb",
  redeem: "Belønning",
  adjust_add: "Point fra butikken",
  adjust_remove: "Rettelse",
  reversal: "Rettelse",
};

export interface BeregnPointInput {
  model: PointEarnModel;
  /** Kroner pr. point (per_amount) eller point pr. køb (per_visit). */
  earnValue: number;
  /** Købets beløb i kroner. Kun relevant for `per_amount`. */
  amount?: number | null;
}

/**
 * HVOR MANGE POINT GIVER DETTE KØB?
 *
 * ÉT sted, fordi tallet både vises i previewet ved disken og skrives i
 * ledgeren. Regnedes det to steder, ville kunden før eller siden se ét tal og
 * få et andet — og det er netop dét tal, hun kom for.
 *
 * DER RUNDES NED. 249 kr. ved 10 kr./point giver 24 point og ikke 25: det er
 * den eneste retning, der aldrig giver kunden point, butikken ikke har lovet,
 * og den eneste, der er let at forklare ved disken ("hver fulde ti kroner").
 *
 * Svarer 0 frem for at kaste, når tallene ikke giver mening (negativt beløb,
 * en optjeningsværdi på nul). Den, der kalder, står med en kunde foran sig og
 * skal have et tal at vise — ikke en undtagelse. `manual` giver også 0, fordi
 * antallet dér tastes af personalet.
 */
export function beregnPoint({
  model,
  earnValue,
  amount,
}: BeregnPointInput): number {
  if (!Number.isFinite(earnValue) || earnValue <= 0) return 0;

  if (model === "manual") return 0;

  if (model === "per_visit") {
    // Et halvt point findes ikke. Værdien kan være gemt som numeric(10,2).
    return Math.max(0, Math.floor(earnValue));
  }

  const beloeb = Number(amount ?? 0);
  if (!Number.isFinite(beloeb) || beloeb <= 0) return 0;

  const point = Math.floor(beloeb / earnValue);
  return Number.isFinite(point) ? Math.max(0, point) : 0;
}

export interface PointBeloenning {
  id: string;
  name: string;
  description?: string | null;
  points_cost: number;
  sort_order?: number;
  status?: string;
}

/**
 * Rækkefølgen, belønninger vises i — BILLIGST FØRST.
 *
 * Kunden læser listen for at finde ud af, hvad hun kan få NU, og det svar står
 * øverst. `sort_order` vinder, når butikken selv har sat den, så en café kan
 * fremhæve dagens tilbud uden at skulle prissætte sig til det.
 */
export function sorterBeloenninger<T extends PointBeloenning>(
  rewards: T[],
): T[] {
  return [...rewards].sort(
    (a, b) =>
      (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
      a.points_cost - b.points_cost ||
      a.name.localeCompare(b.name, "da-DK"),
  );
}

export interface BeloenningStatus {
  /** Har kunden point nok lige nu? */
  kanIndloeses: boolean;
  /** Hvor mange point der mangler (0 når den kan indløses). */
  mangler: number;
}

/** Kan kunden få denne belønning — og hvis ikke, hvor langt er der? */
export function beloenningStatus(
  saldo: number,
  pris: number,
): BeloenningStatus {
  const mangler = Math.max(0, pris - saldo);
  return { kanIndloeses: mangler === 0, mangler };
}

/**
 * Den næste belønning, kunden kan se frem til.
 *
 * Den billigste hun IKKE har råd til endnu — dét er tallet, der giver en grund
 * til at komme igen. Har hun råd til alt, er der ingen at pege på, og så skal
 * kortet ikke opfinde et mål.
 */
export function naesteBeloenning<T extends PointBeloenning>(
  saldo: number,
  rewards: T[],
): T | null {
  const kandidater = rewards
    .filter((r) => (r.status ?? "active") === "active" && r.points_cost > saldo)
    .sort((a, b) => a.points_cost - b.points_cost);
  return kandidater[0] ?? null;
}

/**
 * "1 point" / "25.000 point" — ental og flertal er det samme ord på dansk.
 *
 * Tallet formateres med `Intl.NumberFormat` og ikke med `toLocaleString` på
 * variablen: fejeprøven i `tidszone.test.ts` kræver en tidszone på ethvert
 * `toLocale*`-kald, fordi en DATO uden tidszone vises i serverens tid. Et
 * antal point har ingen tidszone at have — og en undtagelse i prøven ville
 * gøre den svagere for alle de kald, der ER datoer.
 */
const POINT_FORMAT = new Intl.NumberFormat("da-DK");

export function pointTekst(antal: number): string {
  return `${POINT_FORMAT.format(antal)} point`;
}

/**
 * Fejlkoderne fra SQL-funktionerne oversat til noget, der kan stå på en skærm
 * ved en disk.
 *
 * ÉT sted, fordi de samme koder kommer tilbage til både dashboardet, kortet og
 * medarbejderfladen. En rå kode må aldrig nå kunden — og en besked, der er
 * skrevet tre gange, bliver tre forskellige.
 */
export const POINT_FEJL: Record<string, string> = {
  "nul-point": "Antallet skal være mere end nul.",
  "forkert-type": "Handlingen kunne ikke udføres.",
  "program-findes-ikke": "Pointprogrammet blev ikke fundet.",
  "program-ikke-aktivt":
    "Pointprogrammet er ikke aktivt lige nu, så der kan hverken gives eller bruges point.",
  "beloenning-findes-ikke": "Belønningen blev ikke fundet.",
  "beloenning-ikke-aktiv": "Belønningen kan ikke bruges lige nu.",
  "for-faa-point": "Kunden har ikke point nok til den belønning.",
  "konto-fejlede": "Kundens pointkonto kunne ikke åbnes. Prøv igen.",
  "transaktion-findes-ikke": "Transaktionen blev ikke fundet.",
  "kan-ikke-annullere-modpost":
    "En annullering kan ikke annulleres. Giv i stedet point manuelt.",
  "allerede-annulleret": "Transaktionen er allerede annulleret.",
  "saldo-raekker-ikke":
    "Kunden har allerede brugt de point, der skulle trækkes tilbage. Ret det med en manuel justering i stedet.",
};

export function pointFejlTekst(kode: string | null | undefined): string {
  if (!kode) return "Handlingen kunne ikke gennemføres. Prøv igen.";
  return POINT_FEJL[kode] ?? "Handlingen kunne ikke gennemføres. Prøv igen.";
}
