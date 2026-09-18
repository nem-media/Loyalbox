import { TIDSZONE } from "@/lib/dansk-dag";
import {
  hentPointProgram,
  hentPointBeloenninger,
  hentPointSaldo,
  hentMedlemsHistorik,
} from "@/lib/loyalty/point-service";
import {
  pointTekst,
  beloenningStatus,
  POINT_TXN_LABELS,
} from "@/lib/loyalty/point";
import { Badge } from "@/components/ui/badge";
import {
  GivPointForm,
  IndloesKnap,
  JusterPointForm,
} from "@/components/loyalty/point-staff";

/**
 * Personalets pointpanel på ÉN kunde.
 *
 * SAMME KOMPONENT TO STEDER: butikkens kundeside i dashboardet og kundens eget
 * kort i personale-tilstand. Handlingen ved disken er den samme, og to udgaver
 * ville betyde, at en rettelse kun nåede den ene skærm.
 *
 * DEN HENTER SELV. Kaldestedet kender kun kunden og rettighederne; alt andet
 * er pointprogrammets eget. Det koster fire opslag på én kunde — ikke et
 * N+1-problem, fordi panelet altid vises for præcis én.
 */
export async function PointPanel({
  companyId,
  memberId,
  kanGive,
  kanIndloese,
  kanJustere,
  kompakt = false,
}: {
  companyId: string;
  memberId: string;
  kanGive: boolean;
  kanIndloese: boolean;
  kanJustere: boolean;
  /** Kortets smalle spalte på en telefon. Skjuler historikken. */
  kompakt?: boolean;
}) {
  const program = await hentPointProgram(companyId);
  if (!program) return null;

  const [beloenninger, saldoRaa, historik] = await Promise.all([
    hentPointBeloenninger(program.id),
    hentPointSaldo(program.id, memberId),
    kompakt
      ? Promise.resolve([])
      : hentMedlemsHistorik(memberId, 8),
  ]);

  const saldo = saldoRaa ?? 0;
  const aktiv = program.status === "active";

  /*
   * IDEMPOTENSNØGLERNE LAVES HER — én pr. handling pr. visning.
   *
   * Siden er `force-dynamic`, så hver indlæsning får sine egne. Efter en
   * handling gentegner `revalidatePath` siden med nye nøgler, så næste point
   * går igennem af sig selv. To medarbejdere på hver sin telefon får hver sin.
   */
  const noegle = (hvad: string) => `${hvad}-${crypto.randomUUID()}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {program.name}
          </p>
          <p className="text-2xl font-bold tracking-tight">
            {pointTekst(saldo)}
          </p>
        </div>
        {!aktiv ? (
          <Badge tone="warning">
            {program.status === "paused" ? "På pause" : "Ikke aktivt"}
          </Badge>
        ) : null}
      </div>

      {!aktiv ? (
        <p className="box-shape border border-border bg-muted-bg p-3 text-sm text-muted">
          {program.status === "paused"
            ? "Pointprogrammet er sat på pause. Saldoen bevares, men der kan hverken gives eller bruges point."
            : "Pointprogrammet er ikke aktivt, så der kan hverken gives eller bruges point."}
        </p>
      ) : null}

      {aktiv && kanGive ? (
        <div className="box-shape border border-accent/40 bg-accent/5 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Giv point
          </p>
          <GivPointForm
            programId={program.id}
            memberId={memberId}
            reference={noegle("giv")}
            earnModel={program.earn_model}
            earnValue={Number(program.earn_value)}
            saldo={saldo}
          />
        </div>
      ) : null}

      {/* ------------------------------------------------------ belønninger */}
      {beloenninger.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Belønninger
          </p>
          <ul className="divide-y divide-border border-y border-border">
            {beloenninger.map((b) => {
              const status = beloenningStatus(saldo, b.points_cost);
              return (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{b.name}</p>
                    <p className="text-xs text-muted">
                      {pointTekst(b.points_cost)}
                      {status.kanIndloeses
                        ? " · kan bruges nu"
                        : ` · mangler ${status.mangler}`}
                    </p>
                  </div>
                  {aktiv && kanIndloese && status.kanIndloeses ? (
                    <IndloesKnap
                      programId={program.id}
                      memberId={memberId}
                      rewardId={b.id}
                      rewardNavn={b.name}
                      pris={b.points_cost}
                      saldo={saldo}
                      reference={noegle(`indloes-${b.id}`)}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {aktiv && kanJustere ? (
        <div>
          <JusterPointForm
            programId={program.id}
            memberId={memberId}
            reference={noegle("juster")}
          />
        </div>
      ) : null}

      {/* --------------------------------------------------------- historik */}
      {!kompakt && historik.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Seneste pointbevægelser
          </p>
          <ul className="divide-y divide-border text-sm">
            {historik.map((t) => (
              <li key={t.id} className="flex justify-between gap-3 py-2">
                <span>
                  {POINT_TXN_LABELS[t.type]}
                  {t.reward_navn ? ` · ${t.reward_navn}` : ""}
                  {t.reason ? (
                    <span className="block text-xs text-muted">{t.reason}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-right">
                  <span
                    className={
                      t.points > 0 ? "font-medium text-success" : "font-medium"
                    }
                  >
                    {t.points > 0 ? `+${t.points}` : t.points}
                  </span>
                  <span className="block text-xs text-muted">
                    {new Date(t.created_at).toLocaleDateString("da-DK", {
                      day: "numeric",
                      month: "short",
                      timeZone: TIDSZONE,
                    })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
