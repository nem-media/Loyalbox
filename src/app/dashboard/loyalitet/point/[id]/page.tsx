import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyAccess } from "@/lib/loyalty/access";
import {
  hentPointProgram,
  hentPointBeloenninger,
  type PointProgram,
  type PointReward,
} from "@/lib/loyalty/point-service";
import { pointOverblik } from "@/lib/loyalty/point-rapport";
import { PROGRAM_STATUS_LABELS, REWARD_TYPE_LABELS } from "@/lib/loyalty/constants";
import { pointTekst, POINT_EARN_MODEL_LABELS } from "@/lib/loyalty/point";
import { PageHeader, Sektion } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { PointProgramForm } from "../program-form";
import { BeloenningForm } from "../beloenning-form";
import { saetPointProgramStatus, saetPointBeloenningStatus } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pointprogram" };

/**
 * ÉT pointprogram i butikkens dashboard.
 *
 * Listen ligger et niveau over (`../page.tsx`); her åbnes ét program. Siden
 * hed før `/dashboard/loyalitet/point` og var både liste og detalje, fordi
 * der kun kunne være ét program. Med op til fem (0045) er de to ting skilt ad
 * — samme opbygning som stempelkortene, hvor `programmer/` er listen og
 * `programmer/[id]` er kortet.
 *
 * SIDEN HAR TO TILSTANDE, og det er hele ordenen i den.
 *
 * Første udgave havde ÉN: status, så nøgletal, så belønninger, så
 * indstillinger. For et program i drift var rækkefølgen rigtig — men for et
 * NYT program lå opsætningen på begge sider af en statistik, der kun kunne
 * vise nuller. Butikken skulle scrolle forbi "0 point i omløb" for at komme
 * fra "opret programmet" til "opret en belønning", og videre forbi
 * belønningerne for at finde indstillingerne. Meldt af brugeren ved det
 * første rigtige forsøg: "noget af oprettelsen er før statistik og noget
 * efter".
 *
 *   KLADDE  → tre trin, ingen tal. Man er ved at bygge noget.
 *   I DRIFT → tallene først, så belønningerne. Man er ved at følge med.
 *
 * Programmets egne indstillinger ligger i BEGGE tilstande samme sted: inde i
 * programmet selv, foldet sammen. To sektioner om det samme program ("Status"
 * øverst og "Indstillinger" nederst) var halvdelen af rodet.
 */
export default async function PointProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fejl?: string }>;
}) {
  const { id } = await params;
  const { fejl } = await searchParams;
  const access = await getCompanyAccess();
  if (!access) return null;

  // Ejerskabet ligger i opslaget: et id fra en anden butik findes ikke.
  const program = await hentPointProgram(access.companyId, id);

  /*
   * ET PROGRAM, DER IKKE FINDES (eller hører til en anden butik), er en 404 og
   * ikke en tom side: listen er stedet, hvor man opretter, og en side, der
   * lader som om den er "dit program", ville skjule, at man er det forkerte
   * sted.
   */
  if (!program) notFound();

  const beloenninger = await hentPointBeloenninger(program.id, false);
  const aktive = beloenninger.filter((b) => b.status === "active");
  const erKladde = program.status === "draft";

  /*
   * TALLENE HENTES KUN, NÅR DE BETYDER NOGET. En kladde har pr. definition
   * ingen bevægelser, og to opslag for at vise fire nuller er både spild og
   * støj netop dér, hvor butikken er ved at bygge noget.
   */
  const tal = erKladde ? null : await pointOverblik(access.companyId, program.id);

  const regel =
    program.earn_model === "per_amount"
      ? `${program.earn_value} kr. = 1 point`
      : program.earn_model === "per_visit"
        ? `${Math.floor(program.earn_value)} point pr. køb`
        : "Personalet skriver antallet";

  return (
    <>
      <div className="mb-4">
        <Link
          href="/dashboard/loyalitet/point"
          className="text-sm text-accent hover:underline"
        >
          ← Alle pointprogrammer
        </Link>
      </div>
      <PageHeader
        title={program.name}
        description={erKladde ? "Tre trin, så er du i gang." : regel}
        action={
          erKladde ? undefined : (
            <ButtonLink
              href="/dashboard/loyalitet/point/transaktioner"
              size="sm"
              variant="outline"
            >
              Se transaktioner
            </ButtonLink>
          )
        }
      />

      {fejl === "ingen-beloenninger" ? (
        <p
          role="alert"
          className="box-shape mb-6 border border-danger/30 bg-danger/5 p-4 text-sm text-danger-tekst"
        >
          Programmet kan ikke aktiveres, før der er mindst én belønning. Ellers
          optjener kunderne point, de ikke kan bruge til noget.
        </p>
      ) : null}

      {tal?.uenighed ? (
        <p
          role="alert"
          className="box-shape mb-6 border border-danger/30 bg-danger/5 p-4 text-sm text-danger-tekst"
        >
          Der er forskel på summen af kundernes saldi og summen af
          transaktionerne. Skriv til os — vi kan afstemme det, og tallene
          herunder skal tages med forbehold, indtil det er gjort.
        </p>
      ) : null}

      {erKladde ? (
        /* ==================================================== OPSÆTNING */
        <div className="max-w-3xl space-y-4">
          <Trin
            nummer={1}
            titel="Programmet er oprettet"
            faerdig
            forklaring={`${program.name} · ${regel}`}
          >
            <RetProgram program={program} />
          </Trin>

          <Trin
            nummer={2}
            titel={
              aktive.length
                ? `${aktive.length} ${
                    aktive.length === 1 ? "belønning" : "belønninger"
                  } oprettet`
                : "Tilføj mindst én belønning"
            }
            faerdig={aktive.length > 0}
            forklaring="Det, kunden kan bruge sine point på. Du kan have så mange, du vil — kunden vælger selv."
          >
            <div className="space-y-4">
              {beloenninger.length > 0 ? (
                <BeloenningsListe beloenninger={beloenninger} />
              ) : null}
              <div className="box-shape border border-border bg-muted-bg p-4">
                <BeloenningForm programId={program.id} />
              </div>
            </div>
          </Trin>

          <Trin
            nummer={3}
            titel="Aktivér programmet"
            faerdig={false}
            forklaring={
              aktive.length
                ? "Så snart du aktiverer, kan personalet give point, og kunderne kan se deres saldo."
                : "Knappen kommer, når der er mindst én belønning — ellers ville kunderne optjene point, de ikke kan bruge."
            }
          >
            {aktive.length ? (
              <form action={saetPointProgramStatus}>
                <input type="hidden" name="id" value={program.id} />
                <input type="hidden" name="status" value="active" />
                <Button type="submit">Aktivér pointprogrammet</Button>
              </form>
            ) : null}
          </Trin>
        </div>
      ) : (
        /* ======================================================= I DRIFT */
        <>
          <Sektion titel="Programmet">
            <Card>
              <CardBody className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
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
                    {POINT_EARN_MODEL_LABELS[program.earn_model]} · {regel}
                  </p>
                  {program.status === "paused" ? (
                    <p className="mt-2 max-w-xl text-sm text-muted">
                      På pause: kunderne beholder deres point og kan se dem, men
                      der kan hverken gives eller bruges point, før du
                      genoptager.
                    </p>
                  ) : null}
                  <div className="mt-3">
                    <RetProgram program={program} />
                  </div>
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
                    ARKIVERING ER EJERENS BESLUTNING og står som den sidste,
                    mindst larmende knap: saldiene bevares, men kunderne kan
                    hverken optjene eller bruge point bagefter.
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
          </Sektion>

          {tal ? (
            <Sektion titel="Nøgletal">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  label="Medlemmer"
                  value={tal.medlemmer}
                  sub="Med en pointkonto"
                />
                <Stat label="Point optjent" value={tal.optjent} sub="I alt" />
                <Stat
                  label="Point brugt"
                  value={tal.brugt}
                  sub="Indløst og justeret"
                />
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
                          <li
                            key={b.navn}
                            className="flex justify-between gap-4"
                          >
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
          ) : null}

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
                    <BeloenningsListe beloenninger={beloenninger} />
                  )}
                  <p className="mt-4 text-xs text-muted">
                    Belønninger slettes ikke — de arkiveres, så kundernes
                    historik bliver ved med at passe. En arkiveret belønning kan
                    ikke indløses.
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

            <p className="mt-3 text-sm text-muted">
              Kunden ser dem billigst først.{" "}
              <Link
                href="/dashboard/loyalitet/kunder"
                className="font-medium text-accent hover:underline"
              >
                Giv point til en kunde →
              </Link>
            </p>
          </Sektion>
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------- byggeklodser */

/**
 * Ét trin i opsætningen.
 *
 * Nummeret og fluebenet er dét, der gør siden til en RÆKKEFØLGE frem for tre
 * kasser: man kan se, hvor man er, uden at læse teksten.
 */
function Trin({
  nummer,
  titel,
  faerdig,
  forklaring,
  children,
}: {
  nummer: number;
  titel: string;
  faerdig: boolean;
  forklaring: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardBody className="flex gap-4">
        <span
          aria-hidden="true"
          className={
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold " +
            (faerdig ? "bg-success/15 text-success-tekst" : "bg-muted-bg text-muted")
          }
        >
          {faerdig ? "✓" : nummer}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{titel}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted">
            {forklaring}
          </p>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Programmets indstillinger — foldet sammen.
 *
 * `<details>` og ikke en knap med tilstand: det virker uden JavaScript, og
 * formularen er noget, man åbner sjældent. Den ligger samme sted i begge
 * tilstande, så der ikke findes to steder at rette det samme program.
 */
function RetProgram({ program }: { program: PointProgram }) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm font-medium text-accent">
        Ret navn og optjening
        <span className="ml-1 inline-block transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="mt-4 max-w-xl border-t border-border pt-4">
        <PointProgramForm program={program} />
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Ændringer gælder fremad. Point, kunderne allerede har, bliver stående
          — og en belønning, der er indløst, beholder den pris, den havde den
          dag.
        </p>
      </div>
    </details>
  );
}

/** Belønningslisten — samme visning i opsætning og i drift. */
function BeloenningsListe({ beloenninger }: { beloenninger: PointReward[] }) {
  return (
    <ul className="divide-y divide-border">
      {beloenninger.map((b) => (
        <li
          key={b.id}
          className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="font-medium">
              {b.name}{" "}
              <span className="text-muted">· {pointTekst(b.points_cost)}</span>
              {b.status !== "active" ? (
                <Badge tone="neutral" className="ml-2">
                  Arkiveret
                </Badge>
              ) : null}
            </p>
            <p className="text-sm text-muted">
              {b.description ||
                REWARD_TYPE_LABELS[b.type as keyof typeof REWARD_TYPE_LABELS]}
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
  );
}
