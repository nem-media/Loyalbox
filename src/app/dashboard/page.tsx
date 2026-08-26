import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getCompanyStats } from "@/lib/data";
import { PageHeader, Sektion } from "@/components/dashboard-shell";
import { FeedbackBubbleIcon, StandIcon } from "@/components/nav-icons";
import { Stat } from "@/components/ui/stat";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackList } from "@/components/feedback-list";
import { ButtonLink } from "@/components/ui/button";
import { UpgradeNotice } from "@/components/upgrade-notice";
import { tierCan, PRODUCTS, type Tier } from "@/lib/constants";
import { harAbonnement } from "@/lib/abonnement";
import { GuideCard } from "@/components/guide";
import { getGuide } from "@/lib/guides";
import { PeriodPicker } from "@/components/period-picker";
import { parsePeriod, FORRIGE_LABEL } from "@/lib/period";

/** Varerne med et abonnement. Udledt, så navnene ikke kan drive. */
const ABONNEMENTER = PRODUCTS.filter((p) => p.monthlyPrice && !p.addon).map(
  (p) => p.name,
);

/**
 * De tre skridt, en ny konto har foran sig.
 *
 * Beskriver dét, der FAKTISK sker i bestillingen: designeren (farve, front,
 * logo), trykket og leveringen, og QR-adressen der kommer med abonnementet.
 * Lov ikke et fjerde skridt her uden at bygge det.
 */
const OPSTART = [
  {
    titel: "Vælg dit design",
    body: "Farve, front og dit eget logo — du ser skiltet, mens du sætter det sammen.",
  },
  {
    titel: "Vi trykker og sender",
    body: "Skiltet kommer med posten, klar til at stille på disken.",
  },
  {
    titel: "Du får din QR-adresse",
    body: "Peg den hvorhen du vil, og skift den siden uden at trykke skiltet om.",
  },
];

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

  /*
   * UDEN ABONNEMENT ER OVERSIGTEN EN OPSTART, IKKE ET OVERBLIK.
   *
   * Der er ingenting at give overblik OVER: statistik er slået fra, der er
   * ingen QR-adresse, og feedback samles ikke. Siden viste før tomme tal og
   * guiden "Kom godt i gang", hvis første trin er "Opret din første stander
   * under Standere" — netop dét, de ikke kan. En vejledning, der beder om
   * noget umuligt, er værre end ingen.
   *
   * Står FØR getCompanyStats(): der er ikke noget at hente, og forespørgslen
   * ville alligevel svare nul.
   */
  if (!harAbonnement(company)) {
    return (
      <>
        <PageHeader
          title={`Velkommen, ${company.name}`}
          description="Der mangler kun ét: et skilt på disken."
        />

        <Card>
          <CardBody>
            <p className="etiket text-accent">Første skridt</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
              Bestil din første stander
            </h2>
            <p className="mt-2 max-w-2xl leading-relaxed text-muted">
              Du vælger farve, lægger dit logo på og bestemmer, hvor QR-koden
              skal føre hen. Vi trykker skiltet og sender det til dig.
            </p>

            <ol className="mt-6 grid gap-4 sm:grid-cols-3">
              {OPSTART.map((trin, i) => (
                <li key={trin.titel} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="btn-shape grid h-7 w-7 shrink-0 place-items-center bg-accent text-xs font-bold text-accent-fg"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold tracking-tight">
                      {trin.titel}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted">
                      {trin.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/bestil" size="lg">
                Design og bestil
              </ButtonLink>
              <ButtonLink href="/produkter" variant="outline" size="lg">
                Se de tre løsninger
              </ButtonLink>
            </div>

            <p className="mt-5 border-t border-border pt-4 text-sm leading-relaxed text-muted">
              Din QR-adresse, din anmeldelsesside og indsigten følger med{" "}
              {ABONNEMENTER.join(" eller ")} — de kommer, så snart du har
              bestilt.{" "}
              <Link
                href="/dashboard/abonnement"
                className="font-medium text-accent hover:underline"
              >
                Se dit abonnement →
              </Link>
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

      <Sektion titel="Statistik">
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
      </Sektion>

      {/* De to kort herunder får INGEN fælles sektionsoverskrift: de peger
          hver sit sted hen, og ét navn over begge ville lyve. Her er det
          ikonet, der siger hvor man lander. */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        {canSeeFeedback ? (
          <Card className="lg:col-span-2">
            <CardHeader className="flex items-center justify-between">
              <CardTitle icon={FeedbackBubbleIcon}>
                Seneste kommentarer
              </CardTitle>
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
            <CardTitle icon={StandIcon}>Dine standere</CardTitle>
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
