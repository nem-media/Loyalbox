import { cn } from "@/lib/utils";

/**
 * Et ikon i et hævet felt.
 *
 * FLADEN LIGGER I CSS (`.ikon-felt` / `.ikon-felt-fyldt` i globals.css), fordi
 * de fire lag, der gør feltet rundt frem for fladt, ikke kan skrives som
 * Tailwind-utilities uden at blive en streng, ingen læser. Begrundelsen for
 * hvert lag står dér.
 *
 * TO TONER, OG DEN FYLDTE ER TIL ÉT IKON AD GANGEN. Accenten som flade med et
 * hvidt ikon har vægt; fire af dem på række er præcis de "store flade turkise
 * felter", der skulle væk. Tinten er standarden, og den er dét, en række
 * nøgletal skal bære.
 */
export function IkonChip({
  icon: Ikon,
  size = "sm",
  tone = "tint",
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  /** `sm` i en overskrift, `lg` på et nøgletal, `xl` når feltet fører an. */
  size?: "sm" | "lg" | "xl";
  tone?: "tint" | "fyldt";
  className?: string;
}) {
  const felt = {
    sm: "h-7 w-7",
    lg: "h-11 w-11",
    xl: "h-14 w-14",
  }[size];

  const ikon = {
    sm: "h-4 w-4",
    lg: "h-[22px] w-[22px]",
    xl: "h-7 w-7",
  }[size];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full",
        tone === "fyldt"
          ? "ikon-felt-fyldt text-white"
          : "ikon-felt text-accent ring-1 ring-accent/10",
        felt,
        className,
      )}
    >
      <Ikon className={ikon} />
    </span>
  );
}
