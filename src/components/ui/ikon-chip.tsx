import { cn } from "@/lib/utils";

/**
 * Ikon i en tonet cirkel.
 *
 * Devicet fandtes allerede — i `EmptyState`, hvor det er dét, der gør en tom
 * liste til noget designet frem for en grå sætning i et hvidt felt. Det stod
 * bare kun ét sted. Menuen fik ikoner og løftede hele panelet; det samme greb
 * inde i indholdet binder de to halvdele sammen, fordi ikonsproget er det
 * samme.
 *
 * Chippen er ALTID `aria-hidden`. Betydningen står i overskriften ved siden
 * af, og et navn her ville få skærmlæseren til at sige den samme ting to
 * gange — samme regel som brancheikonerne.
 */
export function IkonChip({
  icon: Ikon,
  size = "sm",
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  /** `lg` er til en tom tilstand, hvor cirklen bærer et helt felt. */
  size?: "sm" | "lg";
  className?: string;
}) {
  const stor = size === "lg";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-accent/8 text-accent",
        stor ? "h-11 w-11" : "h-7 w-7",
        className,
      )}
    >
      <Ikon className={stor ? "h-5 w-5" : "h-4 w-4"} />
    </span>
  );
}
