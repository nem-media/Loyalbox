import { Card } from "./card";
import { cn } from "@/lib/utils";

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
  size = "md",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
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
    </Card>
  );
}
