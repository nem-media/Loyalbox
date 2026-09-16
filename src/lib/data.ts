import { createClient } from "@/lib/supabase/server";
import { periodRange, previousRange, type Period } from "@/lib/period";
import { hentAlle } from "@/lib/hent-alle";
import type { Database } from "@/lib/types/database";

type Feedback = Database["public"]["Tables"]["feedback"]["Row"];

/**
 * Tal for én virksomhed.
 *
 * De tællende tal findes i tre udgaver: perioden, den foregående periode og
 * alle tider. Uden totalen ville et skift fra "alle tider" til "30 dage" se ud
 * som om noget var forsvundet — og uden den foregående periode siger tallet
 * ikke, om det går op eller ned.
 */
export interface Counted {
  period: number;
  previous: number;
  total: number;
}

export interface CompanyStats {
  scans: Counted;
  clicks: Counted;
  feedback: Counted;
  /** Gennemsnit i perioden. Null hvis ingen har bedømt i vinduet. */
  avgRating: number | null;
  /** Gennemsnit for alle tider — så et stille kvartal ikke ser ud som et fald. */
  avgRatingTotal: number | null;
  recentFeedback: Feedback[];
  standCount: number;
}

/** Aggregated stats for a single company's dashboard. */
export async function getCompanyStats(
  companyId: string,
  period: Period = "30",
): Promise<CompanyStats> {
  const supabase = await createClient();
  const nu = periodRange(period);
  const foer = previousRange(period);

  /** Tæller en tabel i et tidsrum. `head: true` henter kun antallet. */
  const tael = async (
    table: string,
    match: Record<string, unknown>,
    range?: { from: string; to: string },
  ) => {
    let q = supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .match(match);
    if (range) q = q.gte("created_at", range.from).lte("created_at", range.to);
    const { count } = await q;
    return count ?? 0;
  };

  const klik = { company_id: companyId, is_public_review_clicked: true };

  const [
    scansPeriod,
    scansPrev,
    scansTotal,
    feedbackPeriod,
    feedbackPrev,
    feedbackTotal,
    clicksPeriod,
    clicksPrev,
    clicksTotal,
    standCount,
  ] = await Promise.all([
    tael("scans", { company_id: companyId }, nu),
    tael("scans", { company_id: companyId }, foer),
    tael("scans", { company_id: companyId }),
    tael("feedback", { company_id: companyId }, nu),
    tael("feedback", { company_id: companyId }, foer),
    tael("feedback", { company_id: companyId }),
    tael("feedback", klik, nu),
    tael("feedback", klik, foer),
    tael("feedback", klik),
    tael("stands", { company_id: companyId }),
  ]);

  const snit = (rows: { rating: number }[] | null) =>
    rows && rows.length
      ? rows.reduce((s, r) => s + r.rating, 0) / rows.length
      : null;

  const [
    { data: ratingPeriod },
    { data: ratingAlle },
    { data: recentFeedback },
  ] = await Promise.all([
    /*
     * BEDØMMELSERNE SIDES OGSÅ IGENNEM — de blev hentet i blinde tyve linjer
     * fra den fejl, der blev rettet i #211. `avgRatingTotal` er "alle tider":
     * den dag butikken får anmeldelse nummer 1001, begynder gennemsnittet på
     * dashboardets forside at være regnet på et vilkårligt udsnit, og der er
     * ingen måde at se det på.
     */
    hentAlle<{ rating: number }>((fra, til) =>
      supabase
        .from("feedback")
        .select("rating")
        .eq("company_id", companyId)
        .gte("created_at", nu.from)
        .lte("created_at", nu.to)
        .order("id", { ascending: true })
        .range(fra, til),
    ).then((data) => ({ data })),
    hentAlle<{ rating: number }>((fra, til) =>
      supabase
        .from("feedback")
        .select("rating")
        .eq("company_id", companyId)
        .order("id", { ascending: true })
        .range(fra, til),
    ).then((data) => ({ data })),
    supabase
      .from("feedback")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    scans: { period: scansPeriod, previous: scansPrev, total: scansTotal },
    clicks: { period: clicksPeriod, previous: clicksPrev, total: clicksTotal },
    feedback: {
      period: feedbackPeriod,
      previous: feedbackPrev,
      total: feedbackTotal,
    },
    avgRating: snit(ratingPeriod),
    avgRatingTotal: snit(ratingAlle),
    recentFeedback: recentFeedback ?? [],
    standCount,
  };
}

/**
 * Tal for ÉN QR-adresse — altså ét sted: én butik, én afdeling.
 */
export interface AdresseStat {
  standId: string;
  navn: string;
  scans: number;
  feedback: number;
  klik: number;
  /** Gennemsnit i perioden. Null når ingen har bedømt stedet i vinduet. */
  avgRating: number | null;
}

/**
 * Rækkerne, grupperingen har brug for. Med vilje minimale.
 *
 * (Begrundelsen for hele opdelingen stod her OG over `getAdresseStats()` —
 * samme tekst to steder, hvoraf den ene sad over det forkerte symbol. Den
 * hører til funktionen, der henter, og står nu kun dér.)
 */
export interface AdresseRaekker {
  stands: { id: string; name: string }[];
  scans: { stand_id: string }[];
  feedback: {
    stand_id: string;
    rating: number;
    is_public_review_clicked: boolean;
  }[];
}

/**
 * SELVE OPDELINGEN — og den rører ikke databasen.
 *
 * Skilt fra hentningen, så den kan prøves uden hverken login eller netværk.
 * Det er samme grund som i `aktivering.ts`: reglerne skal kunne efterprøves,
 * og en funktion, der både henter og regner, kan kun prøves ved at logge
 * ind som en rigtig kunde.
 *
 * ET STED UDEN AKTIVITET FALDER IKKE UD. Det er hele pointen med listen:
 * en butik med nul scanninger er præcis dét, ejeren skal have at vide.
 */
export function grupperPrAdresse(r: AdresseRaekker): AdresseStat[] {
  return r.stands.map((stand) => {
    const egne = r.feedback.filter((f) => f.stand_id === stand.id);
    const ratings = egne.map((f) => f.rating);

    return {
      standId: stand.id,
      navn: stand.name,
      scans: r.scans.filter((x) => x.stand_id === stand.id).length,
      feedback: egne.length,
      klik: egne.filter((f) => f.is_public_review_clicked).length,
      avgRating: ratings.length
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null,
    };
  });
}

/**
 * DET SAMLEDE TAL SIGER IKKE HVILKEN BUTIK DER TRÆKKER DET.
 *
 * `getCompanyStats()` tæller alt på `company_id`, og for en kunde med flere
 * steder er svaret derfor ubrugeligt: 70 scanninger kan være 64 det ene sted
 * og 3 det andet. Det er præcis dét, en kæde vil vide.
 *
 * DER SKAL INGEN MIGRATION TIL. `scans` og `feedback` har båret `stand_id`
 * med indeks siden 0001 — der er bare aldrig blevet læst på det.
 *
 * TO FORESPØRGSLER, UANSET HVOR MANGE ADRESSER. Rækkerne hentes for
 * perioden og grupperes her; en tælling pr. adresse ville være fire kald
 * gange antallet af butikker, og en kæde med tyve ville betale for det ved
 * hver sideindlæsning. Til gengæld hentes der RÆKKER og ikke tal, så
 * vinduet skal være en periode og aldrig 'alle tider'.
 *
 * Læses med kundens egen klient som resten af dashboardet: RLS er det, der
 * holder én butiks tal væk fra en andens.
 */
export async function getAdresseStats(
  companyId: string,
  period: Period = "30",
): Promise<AdresseStat[]> {
  const supabase = await createClient();
  const nu = periodRange(period);

  /**
   * HENT ALLE RÆKKER — POSTGREST SVARER HØJST 1000 AD GANGEN.
   *
   * Loftet er en indstilling på serveren (`max-rows`), ikke noget vi beder om,
   * og det ses ikke: svaret er et helt almindeligt array, bare afkortet.
   *
   * MÅLT PÅ DEN KØRENDE BASE 2026-09-15: med 1274 scanninger på én virksomhed
   * svarede tælleopslaget 1274, mens rækkeopslaget gav præcis 1000. Samme side
   * ville altså vise **1274 i kassen øverst og 1000 fordelt på adresserne** —
   * og fordelingen ville oven i købet være forkert på en vilkårlig måde, fordi
   * det er tilfældigt, hvilke tusind der kom med. Et sted kunne se dødt ud,
   * mens et andet så travlt ud.
   *
   * Der SKAL derfor sides igennem. Det koster kun et kald ekstra dér, hvor der
   * faktisk er mere end tusind rækker — altså hos den kunde, hvor tallet
   * begyndte at betyde noget. Stille kunder betaler ingenting for det.
   *
   * Alternativet var at tælle pr. adresse i basen, men det er fire kald gange
   * antallet af butikker ved hver sideindlæsning — og så ville `grupperPrAdresse`
   * ikke længere kunne prøves uden netværk.
   */
  const [stands, scans, feedback] = await Promise.all([
    supabase
      .from("stands")
      .select("id, name")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true })
      .then(({ data }) => data ?? []),
    hentAlle<AdresseRaekker["scans"][number]>((fra, til) =>
      supabase
        .from("scans")
        .select("stand_id")
        .eq("company_id", companyId)
        .gte("created_at", nu.from)
        .lte("created_at", nu.to)
        // Rækkefølgen skal være fast, ellers kan en række komme med to gange
        // eller slet ikke, når der sides.
        .order("id", { ascending: true })
        .range(fra, til),
    ),
    hentAlle<AdresseRaekker["feedback"][number]>((fra, til) =>
      supabase
        .from("feedback")
        .select("stand_id, rating, is_public_review_clicked")
        .eq("company_id", companyId)
        .gte("created_at", nu.from)
        .lte("created_at", nu.to)
        .order("id", { ascending: true })
        .range(fra, til),
    ),
  ]);

  return grupperPrAdresse({ stands, scans, feedback });
}
export function efterAktivitet(a: AdresseStat, b: AdresseStat): number {
  return b.scans - a.scans || b.feedback - a.feedback;
}
