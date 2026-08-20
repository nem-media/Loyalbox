/**
 * Ikoner til dashboardets menu.
 *
 * Bevidst holdt adskilt fra `illustrations.tsx`: de er tegnet til 24 px med
 * accentfarvede detaljer og falder fra hinanden i menuens 18 px. Her er alt
 * ensfarvet `currentColor`, så et punkt kan lyse op sammen med sin tekst uden
 * at ikonet skal skiftes ud.
 *
 * Samme streg-tykkelse og runde hjørner som resten af sitet, så de føles som
 * en familie og ikke som hentet et tilfældigt sted fra.
 */

function Icon({
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
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "h-[18px] w-[18px] shrink-0"}
    >
      {children}
    </svg>
  );
}

type P = { className?: string };

/** Oversigt — felter med tal. */
export function OverviewIcon(p: P) {
  return (
    <Icon {...p}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </Icon>
  );
}

/** Standere — skiltet på disken. */
export function StandIcon(p: P) {
  return (
    <Icon {...p}>
      <rect x="4.5" y="3" width="15" height="11" rx="1.5" />
      <path d="M9 8.5h6M9 11h3.5" />
      <path d="M9 17.5 8 21h8l-1-3.5" />
      <path d="M12 14v3.5" />
    </Icon>
  );
}

/** Stempelkort — kortet med stempler. */
export function StampCardIcon(p: P) {
  return (
    <Icon {...p}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <circle cx="7.5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="16.5" cy="12" r="1.75" />
    </Icon>
  );
}

/** Opslag — det delbare billede. */
export function PostIcon(p: P) {
  return (
    <Icon {...p}>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="m3 14.5 4.5-4 4 3.5 3-2.5L21 16" />
      <circle cx="8.5" cy="8.5" r="1.25" />
    </Icon>
  );
}

/** Feedback — beskeden fra kunden. */
export function FeedbackBubbleIcon(p: P) {
  return (
    <Icon {...p}>
      <path d="M21 12.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 3v-4.6A7.5 7.5 0 0 1 3 12.5 7.5 7.5 0 0 1 10.5 5h3A7.5 7.5 0 0 1 21 12.5Z" />
      <path d="M8.5 12h7" />
    </Icon>
  );
}

/** Personale — flere mennesker. */
export function StaffIcon(p: P) {
  return (
    <Icon {...p}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.4a3.25 3.25 0 0 1 0 5.2" />
      <path d="M17.5 14.6A5.5 5.5 0 0 1 20.5 20" />
    </Icon>
  );
}

/** Virksomhedsprofil — butikken. */
export function StoreIcon(p: P) {
  return (
    <Icon {...p}>
      <path d="M4 9.5V20h16V9.5" />
      <path d="M3 9.5 4.8 4h14.4L21 9.5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z" />
      <path d="M10 20v-5h4v5" />
    </Icon>
  );
}

/** Abonnement — kortet der betales med. */
export function BillingIcon(p: P) {
  return (
    <Icon {...p}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 9.5h19" />
      <path d="M6 14.5h4" />
    </Icon>
  );
}

/** Hjælp — spørgsmålet. */
export function HelpIcon(p: P) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.4" />
      <path d="M12 16.8h.01" />
    </Icon>
  );
}

/** Søg — den daglige handling: find kunden. */
export function SearchIcon(p: P) {
  return (
    <Icon {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Icon>
  );
}

/**
 * Opslag fra navn til ikon.
 *
 * Menuens data laves på serveren, men tegnes i en klientkomponent (den skal
 * kende den aktuelle sti). Funktioner kan ikke sendes over den grænse, så
 * menuen sender et NAVN, og opslaget sker på klientsiden.
 */
export const NAV_ICONS = {
  overview: OverviewIcon,
  stand: StandIcon,
  stampcard: StampCardIcon,
  post: PostIcon,
  feedback: FeedbackBubbleIcon,
  staff: StaffIcon,
  store: StoreIcon,
  billing: BillingIcon,
  help: HelpIcon,
} as const;

export type NavIconKey = keyof typeof NAV_ICONS;
