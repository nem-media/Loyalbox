import Link from "next/link";
import { getCompanyAccess } from "@/lib/loyalty/access";
import {
  hentPointProgram,
  hentPointBeloenninger,
} from "@/lib/loyalty/point-service";
import { pointOverblik } from "@/lib/loyalty/point-rapport";
import { PROGRAM_STATUS_LABELS, REWARD_TYPE_LABELS } from "@/lib/loyalty/constants";
import { pointTekst, POINT_EARN_MODEL_LABELS } from "@/lib/loyalty/point";
import { PageHeader, Sektion } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StampCardIcon } from "@/components/nav-icons";
import { PointProgramForm } from "./program-form";
import { BeloenningForm } from "./beloenning-form";
import { saetPointProgramStatus, saetPointBeloenningStatus } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pointprogram" };

/**
 * Pointprogrammet i butikkens dashboard.
 *
 * ÉN SIDE, ikke en sektion med undersider. Et pointprogram er ét program, en
 * håndfuld belønninger og fire tal — deles det op, skal butikken klikke rundt
 * for at se en helhed, der kan være på én skærm. Historikken har sin egen
 * side, fordi den er lang og læses sjældnere.
 */
export default async function PointProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ fejl?: string; oprettet?: string }>;
}) {
  const { fejl } = await searchParams;
  const access = await getCompanyAccess();
  if (!access) return null;

  const program = await hentPointProgram(access.companyId);

  if (!program) {
    return (
      <>
        <PageHeader
          title="Pointprogram"
          description="Kunden optjener point og vælger selv sin belønning."
        />
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
          <EmptyState
            icon={StampCardIcon}
            title="Du har ikke oprettet et pointprogram endnu."
            description={
              <>
                Et pointprogram er den fleksible søster til stempelkortet:
                kunden samler point og bruger dem på dét, hun helst vil have.
                De to kan køre samtidig.
              </>
            }
          />
          <Card>
            <CardHeader>
              <CardTitle>Opret pointprogram</CardTitle>
            </CardHeader>
            <CardBody>
              <PointProgramForm />
            </CardBody>
          </Card>
        </div>
      </>
    );
  }

  const [beloenninger, tal] = await Promise.all([
    hentPointBeloenninger(program.id, false),
    pointOverblik(access.companyId, program.id),
  ]);

  const aktive = beloenninger.filter((b) => b.status === "active");

  return (
    <>
      <PageHeader
        title="Pointprogram"
        description={program.name}
        action={
          <ButtonLink
            href="/dashboard/loyalitet/point/transaktioner"
            size="sm"
            variant="outline"
          >
            Se transaktioner
          </ButtonLink>
        }
      />

      {fejl === "ingen-beloenninger" ? (
        <p
          role="alert"
          className="box-shape mb-6 border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
        >
          Programmet kan ikke aktiveres, før der er mindst én belønning. Ellers
          optjener kunderne point, de ikke kan bruge til noget.
        </p>
      ) : null}

      {tal.uenighed ? (
        <p
          role="alert"
          className="box-shape mb-6 border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
        >
          Der er forskel på summen af kundernes saldi og summen af
          transaktionerne. Skriv til os — vi kan afstemme det, og tallene
          herunder skal tages med forbehold, indtil det er gjort.
        </p>
      ) : null}

      {/* ------------------------------------------------------- status */}
      <Sektion titel="Status">
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{program.name}</p>
                <Badge
                  tone={
                    program.status === "active"
                      ? "success"
                      : program.status === "paused"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {PROGRAM_STATUS_LABELS[program.status]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted">
                {POINT_EARN_MODEL_LABELS[program.earn_model]}
                {program.earn_model === "per_amount"
                  ? ` · ${program.earn_value} kr. = 1 point`
                  : program.earn_model === "per_visit"
                    ? ` · ${Math.floor(program.earn_value)} point pr. køb`
                    : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {program.status !== "active" ? (
                <form action={saetPointProgramStatus}>
                  <input type="hidden" name="id" value={program.id} />
                  <input type="hidden" name="status" value="active" />
                  <Button type="submit" size="sm">
                    {program.status === "paused" ? "Genoptag" : "Aktivér"}
                  </Button>
                </form>
              ) : (
                <form action={saetPointProgramStatus}>
                  <input type="hidden" name="id" value={program.id} />
                  <input type="hidden" name="status" value="paused" />
                  <Button type="submit" size="sm" variant="outline">
                    Sæt på pause
                  </Button>
                </form>
              )}
              {/*
                ARKIVERING ER EJERENS BESLUTNING og står med vilje som den
                sidste, mindst larmende knap: saldiene bevares, men kunderne
                kan hverken optjene eller bruge point bagefter.
              */}
              {access.role === "owner" && program.status !== "archived" ? (
                <form action={saetPointProgramStatus}>
                  <input type="hidden" name="id" value={program.id} />
                  <input type="hidden" name="status" value="archived" />
                  <Button type="submit" size="sm" variant="ghost">
                    Arkivér
                  </Button>
                </form>
              ) : null}
            </div>
          </CardBody>
        </Card>

        {program.status === "paused" ? (
          <p className="mt-3 text-sm text-muted">
            På pause: kunderne beholder deres point og kan se dem, men der kan
            hverken gives eller bruges point, før du genoptager.
          </p>
        ) : null}
        {program.status === "draft" ? (
          <p className="mt-3 text-sm text-muted">
            Kladde: programmet er ikke i luften endnu. Opret dine belønninger
            nedenfor, og aktivér så.
          </p>
        ) : null}
      </Sektion>

      {/* ------------------------------------------------------- nøgletal */}
      <Sektion titel="Nøgletal">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Medlemmer" value={tal.medlemmer} sub="Med en pointkonto" />
          <Stat label="Point optjent" value={tal.optjent} sub="I alt" />
          <Stat label="Point brugt" value={tal.brugt} sub="Indløst og justeret" />
          <Stat
            label="Point i omløb"
            value={tal.iOmloeb}
            sub="Kundernes saldi lige nu"
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Stat
            size="sm"
            label="Belønninger indløst"
            value={tal.indloesninger}
            sub="Annullerede tæller ikke med"
          />
          <Card>
            <CardBody>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Mest brugte belønninger
              </p>
              {tal.topBeloenninger.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  Ingen indløsninger endnu.
                </p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {tal.topBeloenninger.map((b) => (
                    <li key={b.navn} className="flex justify-between gap-4">
                      <span>{b.navn}</span>
                      <span className="text-muted">{b.antal}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </Sektion>

      {/* ---------------------------------------------------- belønninger */}
      <Sektion titel="Belønninger">
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
          <Card>
            <CardBody>
              {beloenninger.length === 0 ? (
                <p className="text-sm text-muted">
                  Ingen belønninger endnu. Tilføj mindst én — det er dét,
                  pointene skal kunne bruges på.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {beloenninger.map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {b.name}{" "}
                          <span className="text-muted">
                            · {pointTekst(b.points_cost)}
                          </span>
                          {b.status !== "active" ? (
                            <Badge tone="neutral" className="ml-2">
                              Arkiveret
                            </Badge>
                          ) : null}
                        </p>
                        <p className="text-sm text-muted">
                          {b.description ||
                            REWARD_TYPE_LABELS[
                              b.type as keyof typeof REWARD_TYPE_LABELS
                            ]}
                        </p>
                      </div>
                      <form action={saetPointBeloenningStatus}>
                        <input type="hidden" name="id" value={b.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={b.status === "active" ? "archived" : "active"}
                        />
                        <Button type="submit" size="sm" variant="ghost">
                          {b.status === "active" ? "Arkivér" : "Genåbn"}
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              {/*
                DER SLETTES ALDRIG. En belønning, kunder har brugt, står i
                deres historik — forsvandt rækken, ville kvitteringen pege på
                ingenting. Arkivering er også det rigtige svar på "den har vi
                ikke mere".
              */}
              <p className="mt-4 text-xs text-muted">
                Belønninger slettes ikke — de arkiveres, så kundernes historik
                bliver ved med at passe. En arkiveret belønning kan ikke
                indløses.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tilføj belønning</CardTitle>
            </CardHeader>
            <CardBody>
              <BeloenningForm programId={program.id} />
            </CardBody>
          </Card>
        </div>

        {aktive.length > 0 ? (
          <p className="mt-3 text-sm text-muted">
            Kunden ser dem billigst først — {aktive[0].name} til{" "}
            {pointTekst(aktive[0].points_cost)} står øverst.
          </p>
        ) : null}
      </Sektion>

      {/* ------------------------------------------------------ indstillinger */}
      <Sektion titel="Indstillinger">
        <Card>
          <CardBody>
            <PointProgramForm program={program} />
          </CardBody>
        </Card>
        <p className="mt-3 text-sm text-muted">
          Ændrer du optjeningen, gælder det fremad. Point, kunderne allerede
          har, bliver stående — og en belønning, der er indløst, beholder den
          pris, den havde den dag.{" "}
          <Link
            href="/dashboard/loyalitet/kunder"
            className="font-medium text-accent hover:underline"
          >
            Giv point til en kunde →
          </Link>
        </p>
      </Sektion>
    </>
  );
}
