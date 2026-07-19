import Link from "next/link";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { ButtonLink } from "@/components/ui/button";
import { TXN_TYPE_LABELS } from "@/lib/loyalty/constants";
import {
  getLoyaltyReport,
  PERIOD_LABELS,
  type Period,
} from "@/lib/loyalty/report";
import { LoyaltyOnboarding } from "./onboarding";

export const metadata = { title: "Stempelkort" };

const PERIODS: Period[] = ["today", "7", "30", "90"];

export default async function LoyaltyOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const access = await getCompanyAccess();
  if (!access) {
    return (
      <>
        <PageHeader title="Stempelkort" />
        <Card>
          <CardBody className="text-muted">
            Du har endnu ingen virksomhed knyttet til stempelkort.
          </CardBody>
        </Card>
      </>
    );
  }

  const supabase = await createClient();
  const { count: programCount } = await supabase
    .from("loyalty_programs")
    .select("*", { count: "exact", head: true })
    .eq("company_id", access.companyId);

  // Ingen programmer endnu → onboarding.
  if (!programCount) {
    return (
      <>
        <PageHeader title="Stempelkort" description="Kom godt i gang." />
        <LoyaltyOnboarding />
      </>
    );
  }

  const sp = await searchParams;
  const period: Period = (PERIODS as string[]).includes(sp.period ?? "")
    ? (sp.period as Period)
    : "30";
  const r = await getLoyaltyReport(access.companyId, period);

  return (
    <>
      <PageHeader
        title="Overblik"
        description="Medlemmer, stempler og aktivitet."
        action={
          <ButtonLink href="/dashboard/loyalitet/programmer/nyt" size="sm">
            Opret stempelkort
          </ButtonLink>
        }
      />

      {/* Periodefilter */}
      <div className="mb-6 flex flex-wrap gap-1">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`/dashboard/loyalitet?period=${p}`}
            className={
              "box-shape px-3 py-1.5 text-sm " +
              (p === period
                ? "bg-accent text-accent-fg"
                : "text-muted hover:bg-muted-bg")
            }
          >
            {PERIOD_LABELS[p]}
          </Link>
        ))}
      </div>

      {/* Nøgletal */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Nye medlemmer" value={r.newMembers} sub={`${r.totalMembers} i alt`} />
        <Stat label="Aktive medlemmer" value={r.activeMembers} sub="Med stempel i perioden" />
        <Stat label="Stempler givet" value={r.stampsGiven} sub={r.stampsRemoved ? `${r.stampsRemoved} fjernet` : undefined} />
        <Stat label="Belønninger indløst" value={r.rewardsRedeemed} sub={`${r.rewardsEarned} optjent`} />
        <Stat label="Indløsningsrate" value={`${r.redemptionRate}%`} sub="Indløst / optjent" />
        <Stat label="Genbesøgsrate" value={`${r.revisitRate}%`} sub="≥2 besøgsdage" />
        <Stat label="Gns. stempler/kunde" value={r.avgStamps} sub="Aktuel saldo" />
        <Stat label="Rabatter indløst" value={r.discountsRedeemed} />
      </div>

      {/* Handlinger */}
      <div className="mt-6 flex flex-wrap gap-2">
        <ButtonLink href="/dashboard/loyalitet/kunder" variant="outline" size="sm">
          Giv stempel / find kunde
        </ButtonLink>
        <ButtonLink href="/dashboard/loyalitet/rabatter/ny" variant="outline" size="sm">
          Opret rabat
        </ButtonLink>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Tæt på en belønning */}
        <Card>
          <CardHeader>
            <CardTitle>Tæt på en belønning</CardTitle>
          </CardHeader>
          <CardBody className="pt-2">
            {r.nearReward.length === 0 ? (
              <p className="text-sm text-muted">Ingen kunder mangler kun 1-2 stempler lige nu.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {r.nearReward.map((m) => (
                  <li key={m.memberId} className="flex items-center justify-between py-2">
                    <Link href={`/dashboard/loyalitet/kunder/${m.memberId}`} className="hover:text-accent">
                      {m.name}
                    </Link>
                    <span className="text-muted">{m.have} / {m.required}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Mest aktive kunder */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Mest aktive kunder</CardTitle>
            {r.mostPopularReward ? (
              <span className="text-xs text-muted">
                Populær: {r.mostPopularReward}
              </span>
            ) : null}
          </CardHeader>
          <CardBody className="pt-2">
            {r.mostActive.length === 0 ? (
              <p className="text-sm text-muted">Ingen aktivitet i perioden.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {r.mostActive.map((m) => (
                  <li key={m.memberId} className="flex items-center justify-between py-2">
                    <Link href={`/dashboard/loyalitet/kunder/${m.memberId}`} className="hover:text-accent">
                      {m.name}
                    </Link>
                    <span className="text-muted">{m.value} stempler</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Seneste aktivitet */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Seneste aktivitet</CardTitle>
        </CardHeader>
        <CardBody className="pt-2">
          {r.recent.length === 0 ? (
            <p className="text-sm text-muted">Ingen aktivitet i perioden.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {r.recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2">
                  <span>
                    <span className="font-medium">{t.memberName}</span>
                    <span className="text-muted"> · {TXN_TYPE_LABELS[t.type as keyof typeof TXN_TYPE_LABELS]}</span>
                  </span>
                  <span className="text-xs text-muted">
                    {t.stamps > 0 ? `+${t.stamps} · ` : ""}
                    {new Date(t.createdAt).toLocaleDateString("da-DK")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
