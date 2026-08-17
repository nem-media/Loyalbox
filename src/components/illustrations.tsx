/**
 * Spot-illustrationer til sektioner, trin og lister.
 *
 * STIL: 24×24 viewBox, streger i `currentColor` (arver tekstfarven, så samme
 * ikon virker på både lys og mørk baggrund) med ét farvet element som blikfang
 * — grøn `#1b916a` eller gul `#ffb700`, samme palet som blogillustrationerne.
 *
 * Hvorfor inline SVG og ikke filer: de er små, farves af konteksten og koster
 * ingen ekstra netværkskald. Blogindlæggenes store scener ligger derimod som
 * .svg-filer i /public, fordi de skal kunne indekseres og bruges som
 * OG-billeder — det behov er der ikke her.
 *
 * De er dekorative: teksten ved siden af bærer betydningen, så de er markeret
 * aria-hidden og har ingen alt-tekst. Bruges et ikon nogensinde ALENE som
 * betydningsbærer, skal det have en <title> i stedet.
 */
import { cn } from "@/lib/utils";

const ACCENT = "#1b916a";
const GOLD = "#ffb700";

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

type IconProps = { className?: string };

/* ------------------------------------------------------------ opsætning */

/** Skilt der sættes op — opsætning og branding. */
export function SetupIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="5" y="3" width="14" height="12" rx="1.5" />
      <path d="M8 17.5 6.5 21h11L16 17.5" />
      <circle cx="12" cy="9" r="2.5" fill={ACCENT} stroke="none" />
    </Svg>
  );
}

/**
 * Kunden inviteres ind — en kunde mere.
 *
 * Bevidst enkel: en figur og et plus. Tidligere udgave havde både QR-kode og
 * person i samme 24×24-felt, og ved den størrelse faldt den fra hinanden til
 * løse streger.
 */
export function InviteIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="10" cy="7" r="3.25" />
      <path d="M3.5 19.5c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
      <path d="M19 4.5v5M16.5 7h5" stroke={ACCENT} strokeWidth={2} />
    </Svg>
  );
}

/** Systemet arbejder videre — aktivitet der løber ind af sig selv. */
export function AutomationIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M7 14l3.5-4 3 3L18 8" />
      <circle cx="18" cy="8" r="1.75" fill={ACCENT} stroke="none" />
      <path d="M9 21h6" />
    </Svg>
  );
}

/* --------------------------------------------------- de to hovedmotorer */

/** Nye kunder: en anmeldelse der trækker flere til. */
export function NewCustomersIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 5.5h16v10H8l-4 3.5z" />
      <path
        d="M12 8l1.2 2.5 2.8.4-2 2 .5 2.7L12 14.3 9.5 15.6l.5-2.7-2-2 2.8-.4z"
        fill={GOLD}
        stroke="none"
      />
    </Svg>
  );
}

/** Genbesøg: kunden vender tilbage til det samme sted. */
export function ReturningIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20 3v4h-4" />
      <circle cx="12" cy="12" r="3" fill={ACCENT} stroke="none" />
    </Svg>
  );
}

/* ------------------------------------------------------------ stempelkort */

/** Opret kortet: felter og en indstilling. */
export function CreateCardIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <circle cx="7.5" cy="12" r="1.75" fill={ACCENT} stroke="none" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="16.5" cy="12" r="1.75" />
      <path d="M6 8.5h6" />
    </Svg>
  );
}

/** Kunden scanner og får sit kort. */
export function ScanIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 8V5.5A1.5 1.5 0 0 1 4.5 4H7M17 4h2.5A1.5 1.5 0 0 1 21 5.5V8M21 16v2.5a1.5 1.5 0 0 1-1.5 1.5H17M7 20H4.5A1.5 1.5 0 0 1 3 18.5V16" />
      <rect x="7.5" y="8.5" width="4" height="4" rx="0.5" fill={ACCENT} stroke="none" />
      <path d="M13.5 8.5h3M13.5 12h1.5M7.5 15.5h3M14 15.5h2.5" />
    </Svg>
  );
}

/** Personalet giver et stempel. */
export function StampIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8 4.5h8v4.5l-2 2v2h-4v-2l-2-2z" />
      <rect x="4.5" y="15" width="15" height="4.5" rx="1" fill={ACCENT} stroke="none" />
    </Svg>
  );
}

/** Belønningen låses op. */
export function RewardIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="9" width="18" height="11" rx="1.5" />
      <path d="M3 13h18M12 9v11" />
      <path d="M12 9C10 9 8 8 8 6.2A2.2 2.2 0 0 1 12 5a2.2 2.2 0 0 1 4 1.2C16 8 14 9 12 9z" fill={GOLD} stroke="none" />
    </Svg>
  );
}

/** Kunden kommer igen — døren ind til forretningen. */
export function ReturnVisitIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5 20V5.5A1.5 1.5 0 0 1 6.5 4h8A1.5 1.5 0 0 1 16 5.5V20" />
      <path d="M3.5 20h17" />
      <circle cx="13" cy="12.5" r="1.25" fill={ACCENT} stroke="none" />
      {/* Pilen peger IND mod døren. Peger den ud, læses ikonet som "log ud". */}
      <path d="M19 8.5l-2 2 2 2" />
      <path d="M17 10.5h4" />
    </Svg>
  );
}

/** Fremskridt mod målet. */
export function ProgressIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="9.5" width="18" height="5" rx="2.5" />
      <path d="M5.5 12h7" stroke={ACCENT} strokeWidth={3} />
      <circle cx="12" cy="12" r="1" fill={ACCENT} stroke="none" />
    </Svg>
  );
}

/* ----------------------------------------------------------- anmeldelser */

/** Tap eller scan på standeren. */
export function TapIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="7" y="3" width="10" height="16" rx="2" />
      <path d="M10 21h4" />
      <path d="M19.5 8.5a4.5 4.5 0 0 1 0 7M21.5 6a8 8 0 0 1 0 12" stroke={GOLD} />
    </Svg>
  );
}

/** Kunden deler sin oplevelse. */
export function ShareExperienceIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 5h16v9H9l-5 4z" />
      <g fill={GOLD} stroke="none">
        <circle cx="9" cy="9.5" r="1.4" />
        <circle cx="12" cy="9.5" r="1.4" />
        <circle cx="15" cy="9.5" r="1.4" />
      </g>
    </Svg>
  );
}

/** Forretningen står stærkere. */
export function GrowthIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 20V4M4 20h16" />
      <rect x="7" y="13" width="3" height="4" fill={ACCENT} stroke="none" />
      <rect x="12" y="9.5" width="3" height="7.5" fill={ACCENT} stroke="none" />
      <rect x="17" y="6" width="3" height="11" fill={GOLD} stroke="none" />
    </Svg>
  );
}

/** Privat feedback direkte til forretningen. */
export function FeedbackIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M20 4H4v11h4v4l5-4h7z" />
      <path d="M12 8v3" stroke={ACCENT} strokeWidth={2} />
      <circle cx="12" cy="12.75" r="0.9" fill={ACCENT} stroke="none" />
    </Svg>
  );
}

/** NFC — kontaktløs. */
export function NfcIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="5.5" cy="12" r="1.75" fill={GOLD} stroke="none" />
      <path d="M10 7.5a6 6 0 0 1 0 9M13.5 4.5a10 10 0 0 1 0 15M17 1.5a14 14 0 0 1 0 21" />
    </Svg>
  );
}

/** QR-kode. */
export function QrIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="5.5" y="5.5" width="2" height="2" fill={ACCENT} stroke="none" />
      <rect x="16.5" y="5.5" width="2" height="2" fill={ACCENT} stroke="none" />
      <rect x="5.5" y="16.5" width="2" height="2" fill={ACCENT} stroke="none" />
      <path d="M14 14h3M20 14h1M14 17.5h1.5M17.5 17.5h1M14 21h7M19.5 17.5h1.5" />
    </Svg>
  );
}
