import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

/**
 * BUNDEN ER SIGNALFARVEN, TEKSTEN ER DEN MØRKE UDGAVE.
 *
 * Tre af de fem toner satte samme farve som både bund og skrift, og forskellen
 * mellem en farve og 10-15 % af sig selv er ikke nok til at læse noget.
 * MÅLT på /produkter 2026-09-18: "På vej" stod med #f59e0b på #f6e7cc, altså
 * **1,76:1** mod WCAG AA's krav på 4,5 — teksten var nærmest usynlig for
 * enhver, der ikke ser farver som os. Grøn lå på 2,70, rød på 3,77.
 *
 * `neutral` og `accent` er urørte: de havde allerede kontrasten i orden
 * (accenten 5,47), og `neutral` bruger den almindelige tekstfarve.
 *
 * Kun FORGRUNDEN er ændret — `bg-*` er den samme, så badgen ser ud som før.
 * Tokens frem for mørkere signalfarver: `--star` tegner også stjernerne, og
 * en mørkere ville gøre dem brune. Se begrundelsen i globals.css.
 */
const tones: Record<Tone, string> = {
  neutral: "bg-muted-bg text-foreground",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success-tekst",
  warning: "bg-star/15 text-star-tekst",
  danger: "bg-danger/10 text-danger-tekst",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: { tone?: Tone } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
