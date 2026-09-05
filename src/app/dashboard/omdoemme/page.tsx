import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { tierCan } from "@/lib/constants";
import { PageHeader, Sektion } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UpgradeNotice } from "@/components/upgrade-notice";
import { EmptyState } from "@/components/ui/empty-state";
import { ReputationIcon, FeedbackBubbleIcon } from "@/components/nav-icons";
import { hentOmdoemme, gemDagensSnapshot } from "@/lib/omdoemme-data";
import {
  DATAGRUNDLAG_TEKST,
  DEL_NAVNE,
  EKSTERNE_FORBEHOLD,
  OMDOEMME_FORBEHOLD,
  VAEGTE,
  scoreTone,
  type Delnavn,
} from "@/lib/omdoemme";
import { EksterneProfiler } from "./eksterne-profiler";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Omdømme" };

/** Et tal med dansk komma. Ét sted, så 4,7 ikke bliver 4.7 nogle steder. */
function komma(n: number, decimaler = 1): string {
  return n.toFixed(decimaler).replace(".", ",");
}

/** "+4" / "−2" / "uændret". Fortegnet skal kunne ses uden at læse tallet. */
function udvikling(nu: number, foer: number, decimaler = 0): string {
  const d = nu - foer;
  if (Math.abs(d) < (decimaler === 0 ? 0.5 : 0.05)) return "uændret";
  const tal = decimaler === 0 ? Math.round(Math.abs(d)) : komma(Math.abs(d), decimaler);
  return `${d > 0 ? "+" : "−"}${tal}`;
}

/**
 * Omdømme-siden.
 *
 * ET TAL, EN FORKLARING OG EN HANDLING — i den rækkefølge. En virksomhedsejer
 * skal kunne forstå sin situation på fem sekunder: hvor står vi, går det op
 * eller ned, og er der nogen, vi bør ringe til. Derfor står scoren øverst
 * alene, breakdownet under, og feedback der mangler opfølgning som det eneste
 * med en knap.
 *
 * INGEN GRAFER. Der er to tal at sammenligne med sidst, og en kurve over to
 * punkter er en pyntet linje. Kommer der historik nok, kan den tilføjes — men
 * en graf, der ikke siger mere end "+4", er støj.
 *
 * SCOREN ER VORES EGEN, og det står på siden. Se `OMDOEMME_FORBEHOLD`.
 */
export default async function OmdoemmePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/omdoemme");
  const company = user.company;
  if (!company) redirect("/dashboard");

  if (!tierCan(company.plan, "reputation")) {
    return (
      <>
        <PageHeader
          title="Omdømme"
          description="Se hvordan dine kunder oplever din virksomhed."
        />
        <UpgradeNotice
          requiredTier="pro"
          title="LoyalSum Reputation Score"
          description="Følg udviklingen i dit omdømme, se hvor mange kunder der er tilfredse, og saml dine eksterne ratings ét sted. Omdømme er en del af Pro-abonnementet."
        />
      </>
    );
  }

  const { omdoemme, profiler, forrige } = await hentOmdoemme(company.id);
  // Historikken skrives, når nogen ser på tallet — se gemDagensSnapshot().
  await gemDagensSnapshot(company.id, omdoemme);

  const dele = Object.keys(VAEGTE) as Delnavn[];

  return (
    <>
      <PageHeader
        title="Omdømme"
        description="Se hvordan dine kunder oplever din virksomhed — samlet ét sted."
      />

      {/* ---------------------------------------------------- selve scoren */}
      <Card>
        <CardBody>
          {omdoemme.score === null ? (
            <div className="py-4">
              <p className="text-lg font-bold tracking-tight">
                Der er ikke data nok endnu
              </p>
              <p className="mt-2 max-w-lg text-sm text-muted">
                Så snart dine kunder begynder at give stjerner gennem din
                stander, regner vi din score. Du kan også tilføje dine eksterne
                ratings nedenfor, så er der noget at gå i gang med.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="etiket">LoyalSum Reputation Score</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-tight">
                    {omdoemme.score}
                  </span>
                  <span className="text-xl text-muted">/ 100</span>
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone={scoreTone(omdoemme.score)}>
                    {omdoemme.etiket}
                  </Badge>
                  <span className="text-sm text-muted">
                    {DATAGRUNDLAG_TEKST[omdoemme.datagrundlag]}
                  </span>
                </p>
              </div>

              {forrige ? (
                <div className="shrink-0 sm:text-right">
                  <p className="etiket">Siden sidst</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">
                    {udvikling(omdoemme.score, forrige.score)}
                  </p>
                  <p className="text-sm text-muted">
                    Var {forrige.score} den {formatDate(forrige.beregnetDen)}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          <p className="mt-6 border-t border-border pt-4 text-xs text-muted">
            {OMDOEMME_FORBEHOLD}
          </p>
        </CardBody>
      </Card>

      {/* ------------------------------------------------- kundetilfredshed */}
      <Sektion titel="Dine kunder">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>LoyalSum Kundescore</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              {omdoemme.kundescore === null ? (
                <p className="text-sm text-muted">
                  Ingen kundeoplevelser endnu.
                </p>
              ) : (
                <>
                  <p className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold tracking-tight">
                      {komma(omdoemme.kundescore)}
                    </span>
                    <span className="text-lg text-muted">/ 5</span>
                    {forrige?.kundescore != null ? (
                      <span className="text-sm text-muted">
                        {udvikling(omdoemme.kundescore, forrige.kundescore, 1)}{" "}
                        siden sidst
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Baseret på {omdoemme.antalOplevelser}{" "}
                    {omdoemme.antalOplevelser === 1
                      ? "kundeoplevelse"
                      : "kundeoplevelser"}
                  </p>

                  {omdoemme.andele ? (
                    <div className="mt-5 space-y-2 text-sm">
                      {/*
                        ÉN samlet stribe frem for tre søjler: forholdet mellem
                        de tre er hele pointen, og det ses bedst, når de ligger
                        ved siden af hinanden i samme bredde.
                      */}
                      <div
                        className="flex h-3 overflow-hidden rounded-full"
                        role="img"
                        aria-label={`${omdoemme.andele.positiv} % positive, ${omdoemme.andele.neutral} % neutrale, ${omdoemme.andele.negativ} % negative`}
                      >
                        <span
                          className="bg-success"
                          style={{ width: `${omdoemme.andele.positiv}%` }}
                        />
                        <span
                          className="bg-star"
                          style={{ width: `${omdoemme.andele.neutral}%` }}
                        />
                        <span
                          className="bg-danger"
                          style={{ width: `${omdoemme.andele.negativ}%` }}
                        />
                      </div>
                      <p className="flex flex-wrap gap-x-4 gap-y-1 text-muted">
                        <span>{omdoemme.andele.positiv} % positive</span>
                        <span>{omdoemme.andele.neutral} % neutrale</span>
                        <span>{omdoemme.andele.negativ} % negative</span>
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </CardBody>
          </Card>

          {/* ------------------------------------------------- breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Score breakdown</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <ul className="divide-y divide-border text-sm">
                {dele.map((k) => {
                  const v = omdoemme.dele[k];
                  return (
                    <li
                      key={k}
                      className="flex items-baseline justify-between gap-3 py-2.5"
                    >
                      <span>
                        {DEL_NAVNE[k]}
                        <span className="ml-2 text-xs text-muted">
                          {omdoemme.faktiskeVaegte[k] > 0
                            ? `vejer ${omdoemme.faktiskeVaegte[k]} %`
                            : "ingen data"}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {v === null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          v
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-xs text-muted">
                Mangler der data til en del af beregningen, fordeles vægten
                mellem de øvrige. Du bliver ikke trukket for noget, du ikke har.
              </p>
            </CardBody>
          </Card>
        </div>
      </Sektion>

      {/* ------------------------------------------ opfølgning på feedback */}
      {omdoemme.uhaandteredeNegative > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle icon={FeedbackBubbleIcon}>Kræver opfølgning</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            <p className="text-sm">
              <strong>
                {omdoemme.uhaandteredeNegative}{" "}
                {omdoemme.uhaandteredeNegative === 1
                  ? "kunde har"
                  : "kunder har"}
              </strong>{" "}
              givet en lav vurdering, uden at nogen har fulgt op. Det er dem,
              der er lettest at vinde tilbage.
            </p>
            <Link
              href="/dashboard/feedback"
              className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
            >
              Se feedback →
            </Link>
          </CardBody>
        </Card>
      ) : null}

      {/* -------------------------------------------------- eksterne profiler */}
      <Sektion titel="Eksterne profiler">
        <EksterneProfiler profiler={profiler} />
        {profiler.length ? (
          <p className="mt-3 text-xs text-muted">{EKSTERNE_FORBEHOLD}</p>
        ) : null}
      </Sektion>

      {/* --------------------------------------------- sådan beregnes scoren */}
      <Sektion titel="Sådan beregnes scoren">
        <Card>
          <CardBody className="space-y-4 text-sm">
            <p>
              Scoren går fra 0 til 100 og er{" "}
              <strong>LoyalSums egen indikator</strong> for dit samlede
              kundeomdømme. Den beregnes ud fra de kundeoplevelser, der er
              registreret gennem LoyalSum, andelen af positive oplevelser, din
              opfølgning på utilfredse kunder samt de eksterne ratings, du selv
              har registreret.
            </p>

            <ul className="divide-y divide-border">
              {dele.map((k) => (
                <li key={k} className="flex justify-between py-2">
                  <span>{DEL_NAVNE[k]}</span>
                  <span className="text-muted tabular-nums">{VAEGTE[k]} %</span>
                </li>
              ))}
            </ul>

            <p className="text-muted">
              Hvis der mangler data til en del af beregningen, fordeles vægten
              mellem de øvrige tilgængelige datapunkter — så du ikke bliver
              straffet for en datatype, du ikke har.
            </p>
            <p className="text-muted">{EKSTERNE_FORBEHOLD}</p>
            <p className="text-muted">{OMDOEMME_FORBEHOLD}</p>
          </CardBody>
        </Card>
      </Sektion>

      {omdoemme.score === null && profiler.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={ReputationIcon}
            title="Dit omdømme bygges op herfra"
            description="Hver gang en kunde giver stjerner gennem din stander, bliver grundlaget bedre. Tilføj dine eksterne ratings ovenfor for at få et mere komplet billede."
          />
        </div>
      ) : null}
    </>
  );
}
