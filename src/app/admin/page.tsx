import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Stat } from "@/components/ui/stat";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackList } from "@/components/feedback-list";

export const metadata = { title: "Admin — Oversigt" };

async function headCount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  table: string,
  match?: Record<string, unknown>,
): Promise<number> {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (match) q = q.match(match);
  const { count } = await q;
  return count ?? 0;
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    newOrders,
    needsOnboarding,
    readyForProduction,
    activeCompanies,
    totalScans,
  ] = await Promise.all([
    headCount(supabase, "orders", { status: "new" }),
    headCount(supabase, "orders", { status: "needs_onboarding" }),
    headCount(supabase, "orders", { status: "ready_for_production" }),
    headCount(supabase, "companies"),
    headCount(supabase, "scans"),
  ]);

  const { data: recentFeedback } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <>
      <PageHeader
        title="Admin-oversigt"
        description="Overblik over hele platformen."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Nye ordrer" value={newOrders} />
        <Stat label="Mangler onboarding" value={needsOnboarding} />
        <Stat label="Klar til produktion" value={readyForProduction} />
        <Stat label="Aktive virksomheder" value={activeCompanies} />
        <Stat label="Samlede scanninger" value={totalScans} />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Seneste feedback</CardTitle>
          <Link href="/admin/feedback" className="text-xs font-medium text-accent">
            Se alle
          </Link>
        </CardHeader>
        <CardBody className="pt-2">
          <FeedbackList items={recentFeedback ?? []} />
        </CardBody>
      </Card>
    </>
  );
}
