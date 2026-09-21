import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getCompanyStats, getAdresseStats, efterAktivitet } from "@/lib/data";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PageHeader, Sektion } from "@/components/dashboard-shell";
import { FeedbackBubbleIcon, StandIcon } from "@/components/nav-icons";
import {
  ScanDuo,
  FeedbackDuo,
  KlikDuo,
  StjerneDuo,
  SkjoldDuo,
} from "@/components/duotone-ikoner";
import { IkonChip } from "@/components/ui/ikon-chip";
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
import { hentOmdoemme } from "@/lib/omdoemme-data";
import { ReputationIcon } from "@/components/nav-icons";
import { Badge } from "@/components/ui/badge";
import { scoreTone, DATAGRUNDLAG_TEKST } from "@/lib/omdoemme";

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
  const canSeeOmdoemme = tierCan(plan, "reputation");

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

            {/* STREGEN GÅR HELE VEJEN, TEKSTEN GØR IKKE. `max-w-2xl` på
                selve afsnittet ville skære skillestregen af midt i kortet.
                Læsebredden hører til teksten, ikke til rammen. */}
            <div className="mt-5 border-t border-border pt-4">
              <p className="max-w-2xl text-sm leading-relaxed text-muted">
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
            </div>
          </CardBody>
        </Card>
      </>
    );
  }

  const stats = await getCompanyStats(company.id, period);

  /*
   * OPDELINGEN HENTES KUN, NÅR DER ER NOGET AT SAMMENLIGNE.
   *
   * Med én adresse er hver række det samme tal som i kassen ovenfor, bare
   * skrevet en gang til — og to ekstra forespørgsler for at sige det.
   */
  const perAdresse =
    canSeeStats && stats.standCount > 1
      ? (await getAdresseStats(company.id, period)).sort(efterAktivitet)
      : [];

  /*
   * OMDØMMET HENTES KUN, NÅR DET KAN VISES. Kaldet læser fem tællinger og to
   * tabeller, og der er ingen grund til at belægge basen for en Basic-konto,
   * der alligevel får et opgraderingskort at se.
   */
  const omdoemme = canSeeOmdoemme
    ? (await hentOmdoemme(company.id)).omdoemme
    : null;

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
                icon={ScanDuo}
                farve="accent"
                label="Scanninger"
                value={stats.scans.period}
                sub={`${stats.scans.total} i alt`}
                trend={{ previous: stats.scans.previous, label: siden }}
              />
              <Stat
                icon={FeedbackDuo}
                farve="violet"
                label="Feedbacks"
                value={stats.feedback.period}
                sub={`${stats.feedback.total} i alt`}
                trend={{ previous: stats.feedback.previous, label: siden }}
              />
              <Stat
                icon={KlikDuo}
                farve="blaa"
                label="Klik til anmeldelse"
                value={stats.clicks.period}
                sub={`${stats.clicks.total} i alt`}
                trend={{ previous: stats.clicks.previous, label: siden }}
              />
              {/* Ratingen får ingen pil: et gennemsnit svinger på decimaler, og
                en pil på 4,3 mod 4,4 ville råbe op om ingenting. */}
              <Stat
                icon={StjerneDuo}
                farve="guld"
                label="Gns. rating"
                value={stats.avgRating ? stats.avgRating.toFixed(1) : "–"}
                sub={
                  stats.avgRatingTotal
                    ? `${stats.avgRatingTotal.toFixed(1)} i alt · af 5 stjerner`
                    : "Ingen ratings endnu"
                }
              />
            </div>

            {perAdresse.length ? (
              <div>
                <p className="etiket mt-6">Fordelt på dine steder</p>
                <p className="mt-1.5 text-sm text-muted">
                  Samme periode som ovenfor. Mest aktivitet først — så du kan
                  se, hvor der sker noget, og hvor der ikke gør.
                </p>
                {/* TABELLEN FÅR EN RAMME. Den lå direkte på grunden, mens alt
                    andet på siden lå i et kort — og en tabel uden en flade at
                    stå på er præcis dét, der læses som "administrationsside".
                    `overflow-hidden` klipper rækkernes hover til kortets form,
                    så den øverste række ikke stikker ud i hjørnet. */}
                <Card className="mt-3 overflow-hidden">
                <Table>
                  <THead>
                    <TR className="hover:bg-transparent">
                      <TH>Sted</TH>
                      <TH numerisk>Scanninger</TH>
                      <TH numerisk>Feedbacks</TH>
                      <TH numerisk>Klik til anmeldelse</TH>
                      <TH numerisk>Gns. rating</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {perAdresse.map((a) => (
                      <TR key={a.standId}>
                        <TD>
                          <Link
                            href={`/dashboard/standere/${a.standId}`}
                            className="trykmaal-taet font-medium text-accent hover:underline"
                          >
                            {a.navn}
                          </Link>
                        </TD>
                        <TD numerisk>{a.scans}</TD>
                        <TD numerisk>{a.feedback}</TD>
                        <TD numerisk>{a.klik}</TD>
                        {/* Tankestreg og ikke 0: et sted uden bedømmelser
                            har ikke karakteren nul, det har ingen. */}
                        <TD numerisk>
                          {a.avgRating ? a.avgRating.toFixed(1) : "–"}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
                </Card>
              </div>
            ) : null}
          </>
        ) : (
          <UpgradeNotice
            requiredTier="pro"
            title="Statistik i realtid"
            description="Se scanninger, klik og gennemsnitlig rating på ét sted. Fuld statistik er en del af Pro-abonnementet."
          />
        )}
      </Sektion>

      {/*
        DIT OMDØMME — kompakt med vilje. Ét tal, én etiket, én vej videre. Hele
        breakdownet ligger på omdømmesiden; her skal man kunne se på to
        sekunder, om der er noget at komme efter.
      */}
      {canSeeOmdoemme && omdoemme && omdoemme.score !== null ? (
        /* OMDØMMEKORTET FØRER AN PÅ SIDEN, og det skal kunne ses uden at
           læses. Tre greb: et skær i hjørnet (meget lav opacitet, se
           `.teal-skaer`), et FYLDT ikonfelt — det eneste på siden, netop
           fordi der kun må være ét — og scoren i samme grad som et nøgletal.
           Tallene, etiketten, datagrundlaget og knappen er uændrede. */
        <Card className="relative mt-6 overflow-hidden">
          <span
            aria-hidden="true"
            className="teal-skaer pointer-events-none absolute -right-10 -top-16 h-52 w-72"
          />
          <CardHeader className="flex items-center justify-between">
            <CardTitle icon={ReputationIcon}>Dit omdømme</CardTitle>
            <ButtonLink href="/dashboard/omdoemme" size="sm" variant="outline">
              Se omdømme
            </ButtonLink>
          </CardHeader>
          <CardBody className="relative pt-0">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-4">
                <IkonChip icon={SkjoldDuo} size="xl" tone="fyldt" />
                <div>
                <p className="flex items-baseline gap-2">
                  <span className="text-[2.5rem] font-semibold leading-none tracking-tight text-dark">
                    {omdoemme.score}
                  </span>
                  <span className="text-lg text-muted">/ 100</span>
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone={scoreTone(omdoemme.score)}>
                    {omdoemme.etiket}
                  </Badge>
                  <span className="text-xs text-muted">
                    {DATAGRUNDLAG_TEKST[omdoemme.datagrundlag]}
                  </span>
                </p>
                </div>
              </div>

              {omdoemme.kundescore !== null ? (
                <div className="btn-shape border border-border bg-surface-subtle px-4 py-3 sm:text-right">
                  <p className="etiket">LoyalSum Kundescore</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-dark">
                    {omdoemme.kundescore.toFixed(1).replace(".", ",")}{" "}
                    <span className="text-base font-normal text-muted">
                      / 5
                    </span>
                  </p>
                  <p className="text-sm text-muted">
                    {omdoemme.antalOplevelser}{" "}
                    {omdoemme.antalOplevelser === 1
                      ? "kundeoplevelse"
                      : "kundeoplevelser"}
                  </p>
                </div>
              ) : null}
            </div>

            {omdoemme.uhaandteredeNegative > 0 ? (
              <p className="mt-4 border-t border-border pt-3 text-sm text-muted">
                {omdoemme.uhaandteredeNegative}{" "}
                {omdoemme.uhaandteredeNegative === 1
                  ? "kunde venter"
                  : "kunder venter"}{" "}
                på opfølgning.
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {/* De to kort herunder får INGEN fælles sektionsoverskrift: de peger
          hver sit sted hen, og ét navn over begge ville lyve. Her er det
          ikonet, der siger hvor man lander. */}
      {/*
        `grid-cols-1` ER NØDVENDIG OG IKKE OVERFLØDIG.
        Uden den har gitteret ingen `grid-template-columns` under `lg`, og en
        IMPLICIT kolonne er `auto` — altså mindst så bred som sit bredeste
        barn. Kortet her rummer en tabel med `min-w-[34rem]`, så kolonnen blev
        544 px i en spalte på 432, og hele panelet kunne skubbes til siden ved
        768 px (målt i produktion: scrollWidth 862 mod 768).

        Tailwinds `grid-cols-1` skriver `repeat(1, minmax(0, 1fr))`, og det er
        `minmax(0, …)`, der gør arbejdet: kolonnen må gerne blive smallere end
        sit indhold, og så træder tabellens egen vandrette scroll i kraft,
        præcis som den er bygget til.
      */}
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {canSeeFeedback ? (
          <Card className="lg:col-span-2">
            <CardHeader className="flex items-center justify-between">
              <CardTitle icon={FeedbackBubbleIcon}>
                Seneste kommentarer
              </CardTitle>
              <Link
                href="/dashboard/feedback"
                className="trykmaal-taet text-xs font-medium text-accent"
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
