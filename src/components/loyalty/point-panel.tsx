import { TIDSZONE } from "@/lib/dansk-dag";
import {
  hentAktivePointProgrammer,
  hentPointProgrammer,
  hentPointBeloenninger,
  hentMedlemsHistorik,
  type PointProgram,
} from "@/lib/loyalty/point-service";
import { createAdminClient } from "@/lib/supabase/admin";
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
 * ET AFSNIT PR. PROGRAM. En butik kan have op til fem (0045), og kunden har én
 * saldo i hvert. Der er BEVIDST ingen programvælger: en dropdown ved en disk
 * er et klik mere og en fejlkilde — man kan komme til at give point i det
 * forkerte program uden at opdage det. Med programmerne under hinanden står
 * navnet altid lige over det beløb, der tastes.
 *
 * PAUSEDE OG ARKIVEREDE PROGRAMMER VISES OGSÅ, hvis kunden har en saldo der.
 * Ellers ville pointene se ud til at være væk — de er der, de kan bare ikke
 * bruges, og dét skal kunne læses af den, der står med kunden.
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
  const admin = createAdminClient();

  /*
   * TO OPSLAG TIL PROGRAMMERNE OG ÉT TIL SALDIENE — ikke ét pr. program.
   * Aktive skal med, også når kunden ikke er meldt ind endnu (personalet må
   * gerne give det første point; kontoen oprettes af `point_giv`), og de
   * øvrige kun, hvis der ligger en saldo.
   */
  const [aktive, alle, { data: konti }] = await Promise.all([
    hentAktivePointProgrammer(companyId, admin),
    hentPointProgrammer(companyId, admin),
    admin
      .from("loyalty_point_accounts")
      .select("program_id, balance")
      .eq("member_id", memberId)
      .eq("company_id", companyId),
  ]);

  const saldoPrProgram = new Map(
    (konti ?? []).map((k) => [k.program_id, k.balance]),
  );

  const aktiveIds = new Set(aktive.map((p) => p.id));
  const medSaldo = alle.filter(
    (p) => !aktiveIds.has(p.id) && saldoPrProgram.has(p.id),
  );
  const programmer: PointProgram[] = [...aktive, ...medSaldo];

  if (programmer.length === 0) return null;

  const [beloenningerPrProgram, historik] = await Promise.all([
    Promise.all(programmer.map((p) => hentPointBeloenninger(p.id, true, admin))),
    kompakt ? Promise.resolve([]) : hentMedlemsHistorik(memberId, 8, admin),
  ]);

  /*
   * IDEMPOTENSNØGLERNE LAVES HER — én pr. handling pr. program pr. visning.
   *
   * Siderne er `force-dynamic`, så hver indlæsning får sine egne. To
   * medarbejdere på hver sin telefon får hver sit sæt, og efter en handling
   * gentegner `revalidatePath` siden med nye.
   */
  const noegle = (hvad: string) => `${hvad}-${crypto.randomUUID()}`;

  return (
    <div className="space-y-6">
      {programmer.map((program, i) => {
        const saldo = saldoPrProgram.get(program.id) ?? 0;
        const beloenninger = beloenningerPrProgram[i] ?? [];
        const aktiv = program.status === "active";

        return (
          <div key={program.id} className="space-y-4">
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
                  ? "Programmet er sat på pause. Saldoen bevares, men der kan hverken gives eller bruges point."
                  : "Programmet er ikke aktivt, så der kan hverken gives eller bruges point."}
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
                  reference={noegle(`giv-${program.id}`)}
                  earnModel={program.earn_model}
                  earnValue={Number(program.earn_value)}
                  saldo={saldo}
                />
              </div>
            ) : null}

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
              <JusterPointForm
                programId={program.id}
                memberId={memberId}
                reference={noegle(`juster-${program.id}`)}
              />
            ) : null}
          </div>
        );
      })}

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
