import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Stat } from "@/components/ui/stat";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackList } from "@/components/feedback-list";
import { DriftStatus } from "@/components/drift-status";

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

/** Tæller rækker, hvis status er en af flere. `match` kan kun ét felt ad gangen. */
async function statusCount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  statusser: string[],
): Promise<number> {
  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .in("status", statusser);
  return count ?? 0;
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    forladte,
    needsOnboarding,
    readyForProduction,
    betalte,
    activeCompanies,
    totalScans,
  ] = await Promise.all([
    // Status "new" betyder "oprettet, aldrig betalt". Webhooken flytter den
    // til needs_onboarding, når pengene er hjemme — så en ordre, der bliver
    // stående som "new", er en, kunden gik fra.
    headCount(supabase, "orders", { status: "new" }),
    headCount(supabase, "orders", { status: "needs_onboarding" }),
    headCount(supabase, "orders", { status: "ready_for_production" }),
    statusCount(supabase, ["needs_onboarding", "ready_for_production", "shipped"]),
    headCount(supabase, "companies"),
    headCount(supabase, "scans"),
  ]);

  /**
   * Hvor mange af dem, der begyndte, blev færdige?
   *
   * Tallet er kun meningsfuldt, når nogen faktisk har forsøgt — ellers ville
   * en tom database vise "0 %", som lyder alarmerende og ikke betyder noget.
   */
  const paabegyndt = betalte + forladte;
  const gennemfoert =
    paabegyndt > 0 ? Math.round((betalte / paabegyndt) * 100) : null;

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
        <Stat label="Mangler onboarding" value={needsOnboarding} />
        <Stat label="Klar til produktion" value={readyForProduction} />
        <Stat label="Betalte ordrer i alt" value={betalte} />
        {/* Hed før "Nye ordrer", hvilket læste som noget, der skulle
            ekspederes. Status "new" betyder det modsatte: kunden nåede aldrig
            at betale. */}
        <Stat label="Påbegyndt, ikke betalt" value={forladte} />
        <Stat
          label="Gennemført af påbegyndte"
          value={gennemfoert === null ? "—" : `${gennemfoert} %`}
        />
        <Stat label="Aktive virksomheder" value={activeCompanies} />
        <Stat label="Samlede scanninger" value={totalScans} />
      </div>

      <DriftStatus />

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
