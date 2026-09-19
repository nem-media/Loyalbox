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
/**
 * DATAFARVERNE — ét opslag, så et nøgletal har samme farve på tværs af sider.
 *
 * Farven sættes som en CSS-variabel og ikke som en klasse pr. farve: hele
 * feltet blandes ud af `--chip` i globals.css, så fem farver ikke bliver til
 * tyve regler, der skal holdes i takt. Se begrundelsen for paletten ved
 * `--data-*`-tokens.
 */
const FARVER = {
  accent: "var(--data-teal)",
  violet: "var(--data-violet)",
  blaa: "var(--data-blaa)",
  guld: "var(--data-guld)",
  groen: "var(--data-groen)",
} as const;

export type ChipFarve = keyof typeof FARVER;

export function IkonChip({
  icon: Ikon,
  size = "sm",
  tone = "tint",
  farve = "accent",
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  /** `sm` i en overskrift, `lg` på et nøgletal, `xl` når feltet fører an. */
  size?: "sm" | "lg" | "xl";
  tone?: "tint" | "fyldt";
  /** Datatypens farve. Standard er brandets teal. */
  farve?: ChipFarve;
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

  /* `color` på beholderen, så ikonets `currentColor` — begge duotone-lag —
     følger med af sig selv. Den fyldte udgave har hvidt ikon og bruger kun
     variablen til fladen. */
  const stil = {
    "--chip": FARVER[farve],
    ...(tone === "fyldt" ? {} : { color: FARVER[farve] }),
  } as React.CSSProperties;

  return (
    <span
      aria-hidden="true"
      style={stil}
      className={cn(
        "grid shrink-0 place-items-center rounded-full",
        tone === "fyldt"
          ? "ikon-felt-fyldt text-white"
          : "ikon-felt ring-1 ring-[color-mix(in_srgb,var(--chip)_14%,transparent)]",
        felt,
        className,
      )}
    >
      <Ikon className={ikon} />
    </span>
  );
}
