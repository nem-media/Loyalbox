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

/**
 * DET AKTIVE PUNKT FÅR EN FYLDT KROP — OG KUN DET.
 *
 * Duotone virker på et nøgletalskort, fordi feltet er 44 px. I menuen er
 * ikonet 18, og en fyldt krop på TI punkter på én gang bliver til ti klatter
 * i en spalte: der er ikke flade nok til både masse og detalje, når alle
 * råber. På ÉT punkt er det omvendt præcis dét, der skal ske — markeringen
 * skal kunne ses på en halv meters afstand, og en flade ses før en streg.
 *
 * Kroppen er derfor en EGEN form pr. ikon og ikke en fyldning af tegningen.
 * En automatisk `fill` på de samme stier ville virke på kortene og boblerne,
 * men abonnementets to buer ville blive til to linser og spørgsmålstegnet i
 * Hjælp til en klat — begge dele læses som et ikon, der er gået i stykker.
 *
 * Stregen bliver samtidig en anelse kraftigere (2 mod 1,75). Det er under en
 * kvart pixel ved 18 px og kan ikke ses som tykkelse; det, der KAN ses, er at
 * ikonet holder sin vægt mod den fyldte krop bagved i stedet for at
 * forsvinde i den.
 */
function Icon({
  children,
  krop,
  aktiv,
  className,
}: {
  children: React.ReactNode;
  /** Silhuetten, der fyldes, når punktet er aktivt. */
  krop?: React.ReactNode;
  aktiv?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={aktiv ? 2 : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "h-[18px] w-[18px] shrink-0"}
    >
      {aktiv && krop ? (
        <g fill="currentColor" stroke="none" opacity={0.2}>
          {krop}
        </g>
      ) : null}
      {children}
    </svg>
  );
}

type P = { className?: string; aktiv?: boolean };

/** Oversigt — felter med tal. */
export function OverviewIcon(p: P) {
  return (
    <Icon
      {...p}
      krop={
        <>
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
        </>
      }
    >
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
    <Icon
      {...p}
      krop={<rect x="4.5" y="3" width="15" height="11" rx="1.5" />}
    >
      <rect x="4.5" y="3" width="15" height="11" rx="1.5" />
      <path d="M9 8.5h6M9 11h3.5" />
      <path d="M9 17.5 8 21h8l-1-3.5" />
      <path d="M12 14v3.5" />
    </Icon>
  );
}

/**
 * Loyalitet — et STEMPEL og ikke endnu et kort.
 *
 * DET VAR ET AF TRE REKTANGLER I SAMME MENU. Ikonet var et kort med tre
 * cirkler, Abonnement var et kort med en stribe, og Standere er et skilt på
 * en fod. Ved 18 px er det tre rektangler: silhuetten er ens, og det er
 * silhuetten, man kender et menupunkt på, når man ikke læser. De tre cirkler
 * hjalp ikke — tre ens ringe kan lige så godt være en skyder.
 *
 * Stemplet har en silhuet, intet andet i menuen har (et T på en linje), og
 * det er dét motiv, folk kender. Punktet dækker OGSÅ pointprogrammet, og det
 * er et bevidst valg: der findes ikke ét tegn, der siger både "stempel" og
 * "point" uden at sige ingenting, og stemplet er den form, kunderne selv
 * bruger om det. Samme begrundelse som menupunktets navn — se
 * `dashboard/layout.tsx`.
 */
export function StampCardIcon(p: P) {
  return (
    <Icon
      {...p}
      krop={
        <>
          <path d="M9.2 4.6h5.6l-.75 4.4H9.95Z" />
          <rect x="5.4" y="9" width="13.2" height="5.6" rx="1.8" />
        </>
      }
    >
      <path d="M9.2 4.6h5.6l-.75 4.4H9.95Z" />
      <rect x="5.4" y="9" width="13.2" height="5.6" rx="1.8" />
      <path d="M4.2 18.6h15.6" />
    </Icon>
  );
}

/** Opslag — det delbare billede. */
export function PostIcon(p: P) {
  return (
    <Icon {...p} krop={<rect x="3" y="4" width="18" height="14" rx="2" />}>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="m3 14.5 4.5-4 4 3.5 3-2.5L21 16" />
      <circle cx="8.5" cy="8.5" r="1.25" />
    </Icon>
  );
}

/** Feedback — beskeden fra kunden. */
export function FeedbackBubbleIcon(p: P) {
  return (
    <Icon
      {...p}
      krop={
        <path d="M21 12.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 3v-4.6A7.5 7.5 0 0 1 3 12.5 7.5 7.5 0 0 1 10.5 5h3A7.5 7.5 0 0 1 21 12.5Z" />
      }
    >
      <path d="M21 12.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 3v-4.6A7.5 7.5 0 0 1 3 12.5 7.5 7.5 0 0 1 10.5 5h3A7.5 7.5 0 0 1 21 12.5Z" />
      {/* TO LINJER OG IKKE ÉN. Én vandret streg midt i en boble læses som et
          MINUS ved 18 px — en besked, der er slettet, snarere end en besked.
          To linjer i forskellig længde er tekstens egen silhuet, og det er
          den, øjet genkender. */}
      <path d="M8.2 10.6h7.6" />
      <path d="M8.2 14h4.4" />
    </Icon>
  );
}

/** Personale — flere mennesker. */
export function StaffIcon(p: P) {
  return (
    <Icon
      {...p}
      krop={
        <>
          <circle cx="9" cy="8" r="3.25" />
          <path d="M3.5 20a5.5 5.5 0 0 1 11 0Z" />
        </>
      }
    >
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
    <Icon {...p} krop={<path d="M4 9.5V20h16V9.5Z" />}>
      <path d="M4 9.5V20h16V9.5" />
      <path d="M3 9.5 4.8 4h14.4L21 9.5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z" />
      <path d="M10 20v-5h4v5" />
    </Icon>
  );
}

/** Abonnement — kortet der betales med. */
export function BillingIcon(p: P) {
  return (
    <Icon
      {...p}
      krop={<rect x="2.5" y="5" width="19" height="14" rx="2.5" />}
    >
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19" />
      {/* CHIPPEN ER DÉT, DER GØR REKTANGLET TIL ET KORT.
          Den gamle korte streg nederst til venstre var bare en streg og kunne
          være hvad som helst; en lille afrundet firkant dér er det ene
          kendetegn, alle betalingskort har. Stregen foroven er magnetstriben
          og bliver. */}
      <rect x="5.5" y="12.4" width="4.2" height="3.2" rx="0.9" />
    </Icon>
  );
}

/**
 * Destination — hvor QR-koden fører hen.
 *
 * Et kædeled og ikke en QR-kode: ved 16 px læses et net af firkanter som
 * "oversigt" (se `OverviewIcon` lige ovenfor, som er præcis det), mens et led
 * kun kan betyde én ting. Betydningen her er destinationen, ikke koden.
 */
/*
 * LinkIcon har BEVIDST ingen fyldt krop: to åbne buer fyldt op bliver til to
 * linser, der ikke ligner et kædeled. Punktet er heller ikke i hovedmenuen —
 * ikonet bruges inde på en side — så der er ingen aktiv tilstand at tegne.
 */
export function LinkIcon(p: P) {
  return (
    <Icon {...p}>
      <path d="M10.5 13.5a3.8 3.8 0 0 0 5.4 0l2.6-2.6a3.8 3.8 0 1 0-5.4-5.4l-1.2 1.2" />
      <path d="M13.5 10.5a3.8 3.8 0 0 0-5.4 0l-2.6 2.6a3.8 3.8 0 1 0 5.4 5.4l1.2-1.2" />
    </Icon>
  );
}

/** Hjælp — spørgsmålet. */
export function HelpIcon(p: P) {
  return (
    <Icon {...p} krop={<circle cx="12" cy="12" r="9" />}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.4" />
      <path d="M12 16.8h.01" />
    </Icon>
  );
}

/** Søg — den daglige handling: find kunden. */
export function SearchIcon(p: P) {
  return (
    <Icon {...p} krop={<circle cx="11" cy="11" r="6.5" />}>
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
/**
 * Abonnement — en cirkel, der lukker sig selv.
 *
 * IKKE ENDNU ET KORT. `BillingIcon` er allerede et betalingskort og står på
 * Ordrer; to kort i samme menu ville ikke kunne skelnes ved 18 px, og punktet
 * ved siden af er netop det, man ikke må ramme ved en fejl. Det, der skiller
 * et abonnement fra en ordre, er GENTAGELSEN — derfor de to buer med hver sin
 * pilespids, den samme form som en genindlæsning.
 *
 * Buerne er åbne i hver sin ende, så pilespidserne har noget at sidde på;
 * en lukket cirkel med pile på ville se ud som et ur.
 */
export function SubscriptionIcon(p: P) {
  return (
    <Icon {...p} krop={<circle cx="12" cy="12" r="3.6" />}>
      <path d="M20 12a8 8 0 0 1-13.6 5.7" />
      <path d="M4 12a8 8 0 0 1 13.6-5.7" />
      <path d="M17.6 3v3.3h-3.3" />
      <path d="M6.4 21v-3.3h3.3" />
      {/* MØNTEN I MIDTEN. To buer med pilespidser og ingenting indeni er en
          GENINDLÆSNING — det er præcis dét, en spinner er. Det, der skal
          gentage sig, er en betaling, og så skal den kunne ses. Ringen siger
          gentagelsen, mønten siger hvad der gentages.
          Den fyldte krop er derfor MØNTEN og ikke hele cirklen: en fyldt
          skive bag to buer ville lukke ringen og gøre ikonet til et ur. */}
      <circle cx="12" cy="12" r="3.6" />
    </Icon>
  );
}

/**
 * Omdømme — et skjold med en stjerne.
 *
 * IKKE ENDNU EN STJERNE ALENE. `StampCardIcon` og feedback-boblen bruger i
 * forvejen runde former, og en løs stjerne ville læses som "favorit". Skjoldet
 * bærer betydningen: noget der står på spil og skal passes. Stjernen indeni
 * binder det til anmeldelser frem for til sikkerhed.
 */
export function ReputationIcon(p: P) {
  return (
    <Icon
      {...p}
      krop={
        <path d="M12 2.75 4.75 5.5v5.4c0 4.4 3 8.1 7.25 9.35 4.25-1.25 7.25-4.95 7.25-9.35V5.5Z" />
      }
    >
      <path d="M12 2.75 4.75 5.5v5.4c0 4.4 3 8.1 7.25 9.35 4.25-1.25 7.25-4.95 7.25-9.35V5.5Z" />
      <path d="M12 8.6l1.35 2.75 3.03.44-2.19 2.13.52 3.02L12 15.51l-2.71 1.43.52-3.02-2.19-2.13 3.03-.44Z" />
    </Icon>
  );
}

export const NAV_ICONS = {
  overview: OverviewIcon,
  stand: StandIcon,
  stampcard: StampCardIcon,
  post: PostIcon,
  feedback: FeedbackBubbleIcon,
  staff: StaffIcon,
  store: StoreIcon,
  billing: BillingIcon,
  subscription: SubscriptionIcon,
  reputation: ReputationIcon,
  help: HelpIcon,
} as const;

export type NavIconKey = keyof typeof NAV_ICONS;
