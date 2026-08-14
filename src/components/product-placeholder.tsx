import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Billedfelter til produkter, vi ikke har rigtige fotos af endnu.
 *
 * Der findes ingen fotos af standeren i det nye LoyalSum-design, og de kommende
 * materialer (bordskåner, plakat m.m.) er slet ikke produceret. I stedet for
 * tegnede mockups, der giver sig ud for at være produktet, vises et enkelt
 * streg-ikon på råhvid. Når fotoet findes, udskiftes `StanderPlaceholder` med et
 * `<img>` — resten af kortet er uændret.
 *
 * BEMÆRK: `Product.image` i constants bruges stadig af Google Shopping-feedet og
 * JSON-LD (`src/lib/commerce.ts`). Feedet SKAL have et rigtigt produktbillede —
 * læg aldrig et placeholder-ikon derind, det giver afvisning i Merchant Center.
 * Komponenterne her rører kun visningen på sitet.
 */

function Svg({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-10 w-10", className)}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Bordstander: skiltet med QR-felt og foden nedenunder. */
export function StanderIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="6" y="2.5" width="12" height="14" rx="1.5" />
      <path d="M9 6h6" />
      <rect x="9.5" y="9" width="5" height="5" rx="0.75" />
      <path d="M8.5 16.5 6.5 21h11l-2-4.5" />
    </Svg>
  );
}

/** Ikon pr. kommende vare — nøglen er `UpcomingItem.key` fra constants. */
export const UPCOMING_ICONS: Record<string, React.ReactNode> = {
  bordskaaner: (
    <Svg>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <rect x="8.5" y="10" width="7" height="4" rx="1" />
    </Svg>
  ),
  facadeplakat: (
    <Svg>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </Svg>
  ),
  vinduesmaerkat: (
    <Svg>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 12.5l2 2 4-4.5" />
    </Svg>
  ),
  bordkort: (
    <Svg>
      <path d="M4 19l8-13 8 13z" />
      <path d="M9 16h6" />
    </Svg>
  ),
};

/** Råhvidt billedfelt med et centreret streg-ikon. */
export function PlaceholderPanel({
  className,
  children,
  icon,
}: {
  /** Sæt aspect-ratio her, fx "aspect-[4/5]". */
  className?: string;
  /** Badges o.l. lagt oven på feltet. */
  children?: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative grid place-items-center bg-muted-bg text-accent/70",
        className,
      )}
    >
      {icon}
      {children}
    </div>
  );
}

/**
 * Standerens billedfelt. Badgen siger "Foto på vej" — ikke bare "På vej" —
 * fordi standeren kan bestilles nu; det er kun billedet, der mangler. Den ligger
 * nederst til højre, så den ikke kolliderer med "Mest populær"/"Komplet" øverst
 * til venstre.
 */
export function StanderPlaceholder({
  className,
  iconClassName,
  children,
}: {
  className?: string;
  iconClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <PlaceholderPanel
      className={className}
      icon={<StanderIcon className={iconClassName} />}
    >
      {children}
      <div className="absolute bottom-3 right-3">
        <Badge tone="warning">Foto på vej</Badge>
      </div>
    </PlaceholderPanel>
  );
}
