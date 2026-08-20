import { createClient } from "@/lib/supabase/server";
import { periodRange, previousRange, type Period } from "@/lib/period";
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
    scansPeriod, scansPrev, scansTotal,
    feedbackPeriod, feedbackPrev, feedbackTotal,
    clicksPeriod, clicksPrev, clicksTotal,
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

  const [{ data: ratingPeriod }, { data: ratingAlle }, { data: recentFeedback }] =
    await Promise.all([
      supabase
        .from("feedback")
        .select("rating")
        .eq("company_id", companyId)
        .gte("created_at", nu.from)
        .lte("created_at", nu.to),
      supabase.from("feedback").select("rating").eq("company_id", companyId),
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
