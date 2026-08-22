import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Stat } from "@/components/ui/stat";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackList } from "@/components/feedback-list";
import { DriftStatus } from "@/components/drift-status";
import { formatDate } from "@/lib/utils";

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

  /**
   * De ordrer, der venter på et menneske.
   *
   * Et TAL kan man ikke handle på. "Mangler onboarding: 3" fortæller, at der
   * er noget, men ikke hvad — og så skal man alligevel klikke videre og lede.
   * Listen herunder ER opgaven.
   */
  const { data: venter } = await supabase
    .from("orders")
    .select("id, product_name, quantity, created_at, company:companies(name)")
    .in("status", ["needs_onboarding", "ready_for_production"])
    .order("created_at", { ascending: true })
    .limit(5);

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

      {/* ------------------------------------------------ det der kræver dig */}
      {/* TO STØRRELSER MED VILJE. Da alle syv tal blev vist ens, læste siden
          som en rapport frem for et overblik — netop det, Stat's egen
          kommentar advarer imod. De to øverste er dem, man kom for; resten
          uddyber. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          label="Mangler onboarding"
          value={needsOnboarding}
          sub="Betalt — venter på logo og opsætning"
        />
        <Stat
          label="Klar til produktion"
          value={readyForProduction}
          sub="Kan sættes i tryk"
        />
      </div>

      {venter && venter.length ? (
        <Card className="mt-4">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Venter på dig</CardTitle>
            <Link href="/admin/ordrer" className="text-xs font-medium text-accent">
              Alle ordrer
            </Link>
          </CardHeader>
          <CardBody className="pt-2">
            <ul className="divide-y divide-border">
              {venter.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/ordrer/${o.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded px-2 py-2.5 transition-colors hover:bg-accent/5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {o.product_name}
                        <span className="text-muted"> ×{o.quantity}</span>
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(o as any).company?.name ?? "Ukendt virksomhed"} ·{" "}
                        {formatDate(o.created_at)}
                      </span>
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-accent">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {/* ------------------------------------------------------ baggrundstal */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat size="sm" label="Betalte ordrer i alt" value={betalte} />
        {/* Hed før "Nye ordrer", hvilket læste som noget, der skulle
            ekspederes. Status "new" betyder det modsatte: kunden nåede aldrig
            at betale. */}
        <Stat size="sm" label="Påbegyndt, ikke betalt" value={forladte} />
        <Stat
          size="sm"
          label="Gennemført af påbegyndte"
          value={gennemfoert === null ? "—" : `${gennemfoert} %`}
        />
        <Stat size="sm" label="Virksomheder" value={activeCompanies} />
        <Stat size="sm" label="Samlede scanninger" value={totalScans} />
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
