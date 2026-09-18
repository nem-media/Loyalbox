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
      // `cn()` er en simpel sammenføjer, IKKE tailwind-merge: stod der
      // `cn("h-10 w-10", className)`, endte begge størrelser i output, og
      // Tailwinds rækkefølge afgjorde resultatet. Det gik godt her, fordi
      // alle fire kaldesteder beder om noget STØRRE (h-20/h-24/h-32) — en
      // mindre størrelse ville være blevet tavst ignoreret. Standarden
      // gælder derfor kun, når kaldet ikke selv siger noget: UPCOMING_ICONS
      // sætter ingen klasse og har brug for den.
      className={className ?? "h-10 w-10"}
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

/**
 * QR-kode: tre søgemønstre og et par moduler.
 *
 * Til varen UDEN stander. Den har ikke et emne, der kan fotograferes — den ER
 * linket og koden — så et standerikon ville tegne præcis dét, kunden ikke får.
 * En QR-kode kendes på de tre hjørnefirkanter alene; de er derfor det eneste,
 * der er tegnet stort nok til at bære ikonet, og modulerne nederst til højre
 * er kun dér, så feltet ikke ligner en tom ramme.
 */
export function DigitalIcon({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <path d="M13.5 13.5h3M20.5 13.5h0M13.5 17h0M17 17h3.5M13.5 20.5h3M20.5 20.5h0" />
    </Svg>
  );
}

/** Ikon pr. kommende vare — nøglen er `UpcomingItem.key` fra constants. */
export const UPCOMING_ICONS: Record<string, React.ReactNode> = {
  // Mærkat: firkant med et ombukket hjørne — dét, der gør et mærkat til et
  // mærkat frem for et skilt, er netop at det kan pilles af igen.
  maerkater: (
    <Svg>
      <path d="M4.5 4.5h12a1 1 0 0 1 1 1v9l-5 5h-8a1 1 0 0 1-1-1z" />
      <path d="M17.5 14.5h-4a1 1 0 0 0-1 1v4" />
    </Svg>
  ),
  plakater: (
    <Svg>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </Svg>
  ),
  // Selvklæbende: en RUDE med sprosser. Varen er en plakat, men det, der
  // skiller den fra den almindelige, er hvor den kan sidde — og et vindue
  // kan kendes på 40 px, hvor endnu et ark med en flig ikke kan.
  selvklaebende: (
    <Svg>
      <rect x="3.5" y="4" width="17" height="16" rx="1.5" />
      <path d="M12 4v16M3.5 12h17" />
    </Svg>
  ),
  // Flyers: to ark, fordi de deles ud i bundter og aldrig ligger ét ad gangen.
  flyers: (
    <Svg>
      <rect x="3.5" y="5.5" width="11" height="14" rx="1.5" />
      <path d="M7.5 3.5h10a1 1 0 0 1 1 1v12" />
      <path d="M7 10h4M7 13.5h4" />
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

/**
 * Billedfeltet til en vare UDEN et fysisk skilt.
 *
 * TO TING SKILLER DEN FRA `StanderPlaceholder`, og begge er nødvendige.
 *
 * (1) IKONET. Standerikonet tegner et skilt med en fod — altså nøjagtig dét,
 * LoyalSum Komplet Online ikke indeholder. Kortet og produktsiden ville vise
 * varen som en stander, mens teksten ved siden af sagde "uden fysisk stander".
 *
 * (2) DER STÅR IKKE "FOTO PÅ VEJ". Badgen er et løfte: den betyder, at varen
 * kan bestilles nu, og at det kun er billedet, der mangler. Her kommer der
 * aldrig et foto, for der er ingen genstand at fotografere — løftet ville
 * blive stående for evigt. Samme regel som klistermærket, der må vises på et
 * foto, men ikke loves i en salgstekst: sig kun det, der bliver sandt.
 */
export function DigitalPlaceholder({
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
      icon={<DigitalIcon className={iconClassName} />}
    >
      {children}
    </PlaceholderPanel>
  );
}
