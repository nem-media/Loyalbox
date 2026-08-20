import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getCompanyStats } from "@/lib/data";
import { PageHeader } from "@/components/dashboard-shell";
import { Stat } from "@/components/ui/stat";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackList } from "@/components/feedback-list";
import { ButtonLink } from "@/components/ui/button";
import { UpgradeNotice } from "@/components/upgrade-notice";
import { tierCan, type Tier } from "@/lib/constants";
import { GuideCard } from "@/components/guide";
import { getGuide } from "@/lib/guides";
import { PeriodPicker } from "@/components/period-picker";
import { parsePeriod, FORRIGE_LABEL } from "@/lib/period";

export const metadata = { title: "Oversigt" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const period = parsePeriod((await searchParams).period);
  const siden = FORRIGE_LABEL[period];
  const user = await getCurrentUser();
  const company = user!.company;
  const plan = (company?.plan ?? "basic") as Tier;
  const canSeeStats = tierCan(plan, "statistics");
  const canSeeFeedback = tierCan(plan, "feedbackInbox");

  if (!company) {
    return (
      <>
        <PageHeader title="Velkommen" />
        <Card>
          <CardBody className="text-center">
            <p className="text-muted">
              Du har endnu ingen virksomhed. Kontakt support for at komme i
              gang.
            </p>
          </CardBody>
        </Card>
      </>
    );
  }

  const stats = await getCompanyStats(company.id, period);

  return (
    <>
      <PageHeader
        title={`Hej, ${company.name}`}
        description="Overblik over din indsamling af anmeldelser."
        action={
          <ButtonLink href="/dashboard/standere" size="sm">
            Se standere
          </ButtonLink>
        }
      />

      {/* Har forretningen ingen stander endnu, er statistik tomme tal. Så er
          det vigtigste på siden at komme i gang — derfor står vejledningen
          øverst, indtil den første stander er oprettet. */}
      {stats.standCount === 0 ? (
        <div className="mb-6">
          <GuideCard guide={getGuide("kom-i-gang")!} />
        </div>
      ) : null}

      {canSeeStats ? (
        <>
          <PeriodPicker basePath="/dashboard" current={period} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Tallet er perioden, underteksten er totalen. Uden totalen ville
                et skift til "7 dage" se ud som om noget var forsvundet. */}
            <Stat
              label="Scanninger"
              value={stats.scans.period}
              sub={`${stats.scans.total} i alt`}
              trend={{ previous: stats.scans.previous, label: siden }}
            />
            <Stat
              label="Feedbacks"
              value={stats.feedback.period}
              sub={`${stats.feedback.total} i alt`}
              trend={{ previous: stats.feedback.previous, label: siden }}
            />
            <Stat
              label="Klik til anmeldelse"
              value={stats.clicks.period}
              sub={`${stats.clicks.total} i alt`}
              trend={{ previous: stats.clicks.previous, label: siden }}
            />
            {/* Ratingen får ingen pil: et gennemsnit svinger på decimaler, og
                en pil på 4,3 mod 4,4 ville råbe op om ingenting. */}
            <Stat
              label="Gns. rating"
              value={stats.avgRating ? stats.avgRating.toFixed(1) : "–"}
              sub={
                stats.avgRatingTotal
                  ? `${stats.avgRatingTotal.toFixed(1)} i alt · af 5 stjerner`
                  : "Ingen ratings endnu"
              }
            />
          </div>
        </>
      ) : (
        <UpgradeNotice
          requiredTier="pro"
          title="Statistik i realtid"
          description="Se scanninger, klik og gennemsnitlig rating på ét sted. Fuld statistik er en del af Pro-abonnementet."
        />
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        {canSeeFeedback ? (
          <Card className="lg:col-span-2">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Seneste kommentarer</CardTitle>
              <Link
                href="/dashboard/feedback"
                className="text-xs font-medium text-accent"
              >
                Se alle
              </Link>
            </CardHeader>
            <CardBody className="pt-2">
              <FeedbackList items={stats.recentFeedback} />
            </CardBody>
          </Card>
        ) : (
          <div className="lg:col-span-2">
            <UpgradeNotice
              requiredTier="pro"
              title="Privat feedback"
              description="Feedback kunden har valgt at sende direkte til dig i stedet for at skrive offentligt. Den private feedback-indbakke er en del af Pro-abonnementet."
            />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Dine standere</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-3xl font-semibold">{stats.standCount}</p>
            <p className="text-sm text-muted">
              Aktive standere der samler anmeldelser.
            </p>
            <ButtonLink
              href="/dashboard/standere"
              variant="outline"
              size="sm"
              className="w-full"
            >
              Administrer standere
            </ButtonLink>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
