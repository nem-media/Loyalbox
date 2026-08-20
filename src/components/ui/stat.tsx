import { Card } from "./card";
import { cn } from "@/lib/utils";

/**
 * Udviklingen siden sidst.
 *
 * `previous` må gerne være 0 — så vises ændringen i hele tal frem for procent.
 * En stigning fra 0 til 3 er ikke "+300 %", og den slags tal er værre end
 * ingen tal: de ser præcise ud og betyder ingenting.
 */
export interface Trend {
  previous: number;
  /** Fx "forrige 30 dage". Sættes ét sted, så alle kort siger det samme. */
  label: string;
}

function TrendLine({ value, trend }: { value: number; trend: Trend }) {
  const diff = value - trend.previous;

  // Uden noget at sammenligne med siger en pil ingenting. Så hellere tie.
  if (trend.previous === 0 && value === 0) return null;

  // Procent kun når der er nok at regne på. Går man fra 1 til 2, er "+100 %"
  // teknisk rigtigt og praktisk vildledende — og det er netop de små tal, en
  // ny butik har. Under fem sammenlignes derfor i hele tal.
  const brugPct = trend.previous >= 5;
  const pct = brugPct ? Math.round((diff / trend.previous) * 100) : null;

  const tekst =
    diff === 0
      ? `Uændret fra ${trend.label}`
      : pct !== null
        ? `${Math.abs(pct)} % fra ${trend.label}`
        : `${diff > 0 ? "+" : "−"}${Math.abs(diff)} fra ${trend.label}`;

  return (
    <p
      className={cn(
        "mt-1.5 flex items-center gap-1 text-xs",
        diff > 0 ? "text-success" : diff < 0 ? "text-muted" : "text-muted",
      )}
    >
      {diff !== 0 ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cn("h-3 w-3", diff < 0 && "rotate-180")}
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      ) : null}
      {tekst}
    </p>
  );
}

/**
 * Et nøgletal.
 *
 * TO STØRRELSER MED VILJE. Da alle tal blev vist ens, kunne øjet ikke se
 * forskel på "antal medlemmer" og "gennemsnitlige stempler pr. kunde" — otte
 * lige store felter læses som en rapport, ikke som et overblik. `size="sm"`
 * er til de tal, der uddyber, og ikke til dem man kom for.
 */
export function Stat({
  label,
  value,
  sub,
  trend,
  size = "md",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  /** Kræver at `value` er et tal — ellers er der intet at trække fra. */
  trend?: Trend;
  size?: "sm" | "md";
  className?: string;
}) {
  const lille = size === "sm";

  return (
    <Card className={cn(lille ? "p-4" : "p-5", className)}>
      <p className={cn("text-muted", lille ? "text-xs" : "text-sm")}>{label}</p>
      <p
        className={cn(
          "mt-1.5 font-semibold tracking-tight tabular-nums",
          lille ? "text-xl" : "text-3xl",
        )}
      >
        {value}
      </p>
      {sub ? (
        <p className={cn("mt-1 text-muted", lille ? "text-[11px]" : "text-xs")}>
          {sub}
        </p>
      ) : null}
      {trend && typeof value === "number" ? (
        <TrendLine value={value} trend={trend} />
      ) : null}
    </Card>
  );
}
