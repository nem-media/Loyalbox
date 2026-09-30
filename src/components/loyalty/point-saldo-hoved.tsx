import { Badge } from "@/components/ui/badge";
import { pointTekst } from "@/lib/loyalty/point";

/**
 * Saldoen øverst i personalets pointpanel.
 *
 * Reserverede point står som en SEKUNDÆR linje under saldoen og kun, når der
 * er nogen: saldoen er stadig kundens, men de reserverede kan ikke bruges ved
 * disken, før webshopordren er betalt eller kurven forladt. Status og knapper
 * længere nede regnes af den brugbare saldo.
 */
export function PointSaldoHoved({
  navn,
  saldo,
  reserveret,
  status,
}: {
  navn: string;
  saldo: number;
  reserveret: number;
  status: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{navn}</p>
        <p className="text-2xl font-bold tracking-tight">{pointTekst(saldo)}</p>
        {reserveret > 0 ? (
          <p className="text-xs text-muted">
            Heraf {pointTekst(reserveret)} holdt af til en webshopordre
          </p>
        ) : null}
      </div>
      {status !== "active" ? (
        <Badge tone="warning">{status === "paused" ? "På pause" : "Ikke aktivt"}</Badge>
      ) : null}
    </div>
  );
}
