import { TIDSZONE } from "@/lib/dansk-dag";
import {
  pointTekst,
  beloenningStatus,
  brugbarSaldo,
  naesteBeloenning,
  POINT_TXN_KUNDETEKST,
  type PointTxnType,
} from "@/lib/loyalty/point";

export interface PointKortBeloenning {
  id: string;
  name: string;
  description?: string | null;
  points_cost: number;
  status?: string;
}

export interface PointKortHistorik {
  id: string;
  type: PointTxnType;
  points: number;
  reward_navn: string | null;
  created_at: string;
}

/**
 * KUNDENS pointkort.
 *
 * Samme flade som stempelkortet (`StampCardPreview`) og samme rolle: det er
 * dét, kunden får at se på sin telefon. Derfor står saldoen stort, og alt
 * andet er en forklaring af den.
 *
 * INGEN TEKNISKE ORD. Historikken siger "Køb" og "Belønning", ikke
 * `adjust_remove` — en kunde, der lige har købt kaffe, skal ikke læse en
 * enum-værdi. Oversættelsen ligger i `POINT_TXN_KUNDETEKST`.
 */
export function PointKort({
  companyName,
  programName,
  saldo,
  reserveret = 0,
  beloenninger,
  historik = [],
  paused = false,
  className,
}: {
  companyName: string;
  programName: string;
  saldo: number;
  /** Point holdt af til en webshopkurv — de kan ikke bruges i butikken imens. */
  reserveret?: number;
  beloenninger: PointKortBeloenning[];
  historik?: PointKortHistorik[];
  paused?: boolean;
  className?: string;
}) {
  // Reserverede point er lovet til en webshopordre; "næste belønning" og
  // statusserne nedenfor regnes af det, der faktisk kan bruges nu — ellers
  // siger kortet "point nok til alt" over en liste, der siger "mangler".
  const brugbar = brugbarSaldo(saldo, reserveret);
  const naeste = naesteBeloenning(brugbar, beloenninger);

  return (
    <div className={className}>
      {/* ------------------------------------------------------ saldoen */}
      <div className="box-shape border border-border bg-dark p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
          {programName}
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight">
          {pointTekst(saldo)}
        </p>
        <p className="mt-1 text-sm text-white/70">{companyName}</p>
        {reserveret > 0 ? (
          <p className="mt-1 text-xs text-white/70">
            Heraf {pointTekst(reserveret)} holdt af til din webshopordre
          </p>
        ) : null}

        {paused ? (
          <p className="mt-3 text-sm text-white/80">
            Pointprogrammet er midlertidigt sat på pause. Dine point bliver
            stående.
          </p>
        ) : naeste ? (
          <p className="mt-3 text-sm text-white/80">
            Næste belønning fra {pointTekst(naeste.points_cost)} —{" "}
            {naeste.name}.
          </p>
        ) : beloenninger.length > 0 ? (
          <p className="mt-3 text-sm text-white/80">
            Du har point nok til alle belønninger. Vis kortet til personalet.
          </p>
        ) : null}
      </div>

      {/* --------------------------------------------------- belønninger */}
      {beloenninger.length > 0 ? (
        <div className="box-shape mt-3 border border-border bg-card p-5">
          <p className="text-sm font-medium">Belønninger</p>
          <ul className="mt-3 divide-y divide-border">
            {beloenninger.map((b) => {
              const status = beloenningStatus(brugbar, b.points_cost);
              return (
                <li key={b.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{b.name}</p>
                    {b.description ? (
                      <p className="text-xs text-muted">{b.description}</p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium">
                      {pointTekst(b.points_cost)}
                    </p>
                    <p
                      className={
                        "text-xs " +
                        (status.kanIndloeses ? "text-success" : "text-muted")
                      }
                    >
                      {status.kanIndloeses
                        ? "Kan bruges nu"
                        : `Du mangler ${status.mangler} point`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          {!paused ? (
            <p className="mt-3 text-xs text-muted">
              Vis kortet til personalet, når du vil bruge en belønning.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ------------------------------------------------------ historik */}
      {historik.length > 0 ? (
        <div className="box-shape mt-3 border border-border bg-card p-5">
          <p className="text-sm font-medium">Dine point</p>
          <ul className="mt-2 divide-y divide-border text-sm">
            {historik.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  {t.reward_navn ?? POINT_TXN_KUNDETEKST[t.type]}
                  <span className="block text-xs text-muted">
                    {new Date(t.created_at).toLocaleDateString("da-DK", {
                      day: "numeric",
                      month: "long",
                      timeZone: TIDSZONE,
                    })}
                  </span>
                </span>
                <span
                  className={
                    "shrink-0 font-medium " +
                    (t.points > 0 ? "text-success" : "text-foreground")
                  }
                >
                  {t.points > 0 ? `+${t.points}` : t.points} point
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
