import { cn } from "@/lib/utils";

/**
 * EN BESKED TIL BRUGEREN — fejl, advarsel, kvittering, oplysning.
 *
 * HVORFOR DEN FINDES. Beskederne var løse afsnit: `<p role="alert"
 * className="text-sm text-danger">` ni steder, hver med sin egen margin og
 * uden andet end farven til at sige, hvad der var sket. Rød tekst alene er
 * to problemer på én gang — den forsvinder for den, der ikke ser rød, og den
 * ligner brødtekst for alle andre. En besked skal kunne SES, før den bliver
 * læst.
 *
 * TRE TING GØR DEN TIL EN BESKED: et ikon, en tonet flade i samme betydning,
 * og en ramme. Ikonet er formet efter betydningen (kryds, udråbstegn, flueben,
 * i), så tegnet siger det samme som farven.
 *
 * `role="alert"` SÆTTES KUN PÅ FEJL OG ADVARSLER. En skærmlæser afbryder det,
 * den er i gang med, når den møder en alert — og at blive afbrudt af "Gemt"
 * hver gang man trykker gem er støj. Kvitteringer og oplysninger får
 * `role="status"`, som siger det samme uden at trænge sig på.
 */
type Slags = "fejl" | "advarsel" | "ok" | "info";

const STIL: Record<Slags, { flade: string; tekst: string; ikon: string }> = {
  /* Fladerne er signalfarven i 8 % og kanten i 25 %. Teksten er husets
     læsbare udgave af farven (`--*-tekst`), ikke fladefarven — se
     begrundelsen ved tokens i globals.css. */
  fejl: {
    flade: "bg-danger/8 border-danger/25",
    tekst: "text-danger-tekst",
    ikon: "text-danger",
  },
  advarsel: {
    flade: "bg-star/10 border-star/30",
    tekst: "text-star-tekst",
    ikon: "text-star",
  },
  ok: {
    flade: "bg-success/8 border-success/25",
    tekst: "text-success-tekst",
    ikon: "text-success",
  },
  info: {
    flade: "bg-accent-tint border-accent/20",
    tekst: "text-foreground",
    ikon: "text-accent",
  },
};

function Ikon({ slags, className }: { slags: Slags; className?: string }) {
  const fælles = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  };
  if (slags === "ok") {
    return (
      <svg {...fælles}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.3 2.4 2.4 4.6-5" />
      </svg>
    );
  }
  if (slags === "fejl") {
    return (
      <svg {...fælles}>
        <circle cx="12" cy="12" r="9" />
        <path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6" />
      </svg>
    );
  }
  if (slags === "advarsel") {
    return (
      <svg {...fælles}>
        <path d="M10.6 4.3 3.4 17a1.6 1.6 0 0 0 1.4 2.4h14.4a1.6 1.6 0 0 0 1.4-2.4L13.4 4.3a1.6 1.6 0 0 0-2.8 0Z" />
        <path d="M12 9.5v4" />
        <path d="M12 16.6h.01" />
      </svg>
    );
  }
  return (
    <svg {...fælles}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function Besked({
  slags = "info",
  children,
  className,
}: {
  slags?: Slags;
  children: React.ReactNode;
  className?: string;
}) {
  const s = STIL[slags];
  const paatraengende = slags === "fejl" || slags === "advarsel";

  return (
    <div
      role={paatraengende ? "alert" : "status"}
      className={cn(
        "btn-shape flex items-start gap-2.5 border px-3.5 py-3 text-sm",
        s.flade,
        s.tekst,
        className,
      )}
    >
      <Ikon slags={slags} className={cn("mt-px h-[18px] w-[18px] shrink-0", s.ikon)} />
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
    </div>
  );
}
