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

export const metadata = { title: "Oversigt" };

export default async function DashboardPage() {
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

  const stats = await getCompanyStats(company.id);

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

      {canSeeStats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Scanninger" value={stats.scans} />
          <Stat label="Feedbacks" value={stats.feedbackCount} />
          <Stat
            label="Klik til anmeldelse"
            value={stats.clicks}
            sub="Videre til offentlig anmeldelse"
          />
          <Stat
            label="Gns. rating"
            value={stats.avgRating ? stats.avgRating.toFixed(1) : "–"}
            sub={stats.avgRating ? "af 5 stjerner" : "Ingen ratings endnu"}
          />
        </div>
      ) : (
        <UpgradeNotice
          requiredTier="pro"
          title="Statistik i realtid"
          description="Se scanninger, klik og gennemsnitlig rating på ét sted. Fuld statistik er en del af Pro-abonnementet."
        />
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
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
              description="Fang kritik internt, før den bliver en offentlig 1-stjerne. Den private feedback-indbakke er en del af Pro-abonnementet."
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
