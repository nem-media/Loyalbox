import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type Feedback = Database["public"]["Tables"]["feedback"]["Row"];

export interface CompanyStats {
  scans: number;
  clicks: number;
  feedbackCount: number;
  avgRating: number | null;
  recentFeedback: Feedback[];
  standCount: number;
}

async function count(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  table: string,
  match: Record<string, unknown>,
): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .match(match);
  return count ?? 0;
}

/** Aggregated stats for a single company's dashboard. */
export async function getCompanyStats(
  companyId: string,
): Promise<CompanyStats> {
  const supabase = await createClient();

  const [scans, standCount, feedbackCount, clicks] = await Promise.all([
    count(supabase, "scans", { company_id: companyId }),
    count(supabase, "stands", { company_id: companyId }),
    count(supabase, "feedback", { company_id: companyId }),
    count(supabase, "feedback", {
      company_id: companyId,
      is_public_review_clicked: true,
    }),
  ]);

  const { data: ratingRows } = await supabase
    .from("feedback")
    .select("rating")
    .eq("company_id", companyId);

  const avgRating =
    ratingRows && ratingRows.length
      ? ratingRows.reduce((s: number, r: { rating: number }) => s + r.rating, 0) /
        ratingRows.length
      : null;

  const { data: recentFeedback } = await supabase
    .from("feedback")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    scans,
    clicks,
    feedbackCount,
    avgRating,
    recentFeedback: recentFeedback ?? [],
    standCount,
  };
}
