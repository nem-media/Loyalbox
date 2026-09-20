/**
 * DUOTONE-IKONER — til nøgletal, opsummeringskort og tomme tilstande.
 *
 * HVORFOR ET SÆT MERE. Husets øvrige ikoner er rene streger på 24 px-nettet,
 * og de er rigtige dér, hvor de bruges: i en menu, i en overskrift, i en
 * knap. På et nøgletalskort i et 44 px felt bliver en tynd streg til en
 * skygge af et ikon — der er flade nok til at tegne noget, og der tegnes
 * ingenting. Duotone løser præcis dét: en FYLDT krop i lav opacitet giver
 * ikonet masse på afstand, og stregen ovenpå holder detaljen tæt på.
 *
 * TO REGLER, SÅ SÆTTET BLIVER ET SÆT:
 *
 *  1. **Kroppen er 18 % og stregen 100 %, altid.** Falder kroppen til 10 %,
 *     forsvinder massen; går den over 25 %, æder den stregen, og ikonet
 *     bliver en klat. Tallet står ét sted (`KROP`).
 *  2. **Begge lag er `currentColor`.** Ikonet arver farven fra feltet, det
 *     står i — se `--chip` i globals.css — så en ny datafarve kræver ingen
 *     ændring her. Det er også derfor, der ikke er hårdkodede farver i
 *     filen: et ikon, der bærer sin egen farve, kan ikke bruges to steder.
 *
 * Nettet er 24 × 24, stregtykkelsen 1,7 og hjørnerne runde — samme geometri
 * som `illustrations.tsx`, så de to sæt kan stå ved siden af hinanden.
 */

interface P {
  className?: string;
}

/** Kroppens opacitet. Ét sted — se regel 1. */
const KROP = 0.18;

function Ramme({ children, className }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

/** Scanninger — søgerens hjørner om en flade, der bliver læst. */
export function ScanDuo({ className }: P) {
  return (
    <Ramme className={className}>
      <rect
        x="8.5"
        y="8.5"
        width="7"
        height="7"
        rx="1.6"
        fill="currentColor"
        stroke="none"
        opacity={KROP}
      />
      <path d="M4 9V6.5A2.5 2.5 0 0 1 6.5 4H9" />
      <path d="M15 4h2.5A2.5 2.5 0 0 1 20 6.5V9" />
      <path d="M20 15v2.5a2.5 2.5 0 0 1-2.5 2.5H15" />
      <path d="M9 20H6.5A2.5 2.5 0 0 1 4 17.5V15" />
      <path d="M4 12h16" opacity="0.45" />
    </Ramme>
  );
}

/** Feedback — beskeden, kunden sender direkte til butikken. */
export function FeedbackDuo({ className }: P) {
  const boble =
    "M4 7.5A3.5 3.5 0 0 1 7.5 4h9A3.5 3.5 0 0 1 20 7.5v5a3.5 3.5 0 0 1-3.5 3.5H12l-4.4 3.3V16h-.1A3.5 3.5 0 0 1 4 12.5Z";
  return (
    <Ramme className={className}>
      <path d={boble} fill="currentColor" stroke="none" opacity={KROP} />
      <path d={boble} />
      <path d="M8.5 8.8h7" opacity="0.6" />
      <path d="M8.5 11.6h4" opacity="0.6" />
    </Ramme>
  );
}

/** Klik til anmeldelse — vejen UD af vores side og hen til platformen. */
export function KlikDuo({ className }: P) {
  return (
    <Ramme className={className}>
      <path
        d="M5 8a3 3 0 0 1 3-3h3v3H8v8h8v-3h3v3a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3Z"
        fill="currentColor"
        stroke="none"
        opacity={KROP}
      />
      <path d="M11 5H7.5A2.5 2.5 0 0 0 5 7.5v9A2.5 2.5 0 0 0 7.5 19h9a2.5 2.5 0 0 0 2.5-2.5V13" />
      <path d="M14 4.5h5.5V10" />
      <path d="M19.5 4.5 12 12" />
    </Ramme>
  );
}

/** Rating — samme stjerne som `Stars` og `StarIcon`. */
export function StjerneDuo({ className }: P) {
  const d =
    "M11.48 3.5a.56.56 0 0 1 1.04 0l2.12 5.11 5.52.44c.5.04.7.66.32.99l-4.2 3.6 1.28 5.39a.56.56 0 0 1-.84.6L12 16.98l-4.72 3.25a.56.56 0 0 1-.84-.6l1.28-5.39-4.2-3.6a.56.56 0 0 1 .32-.99l5.52-.44 2.12-5.11Z";
  return (
    <Ramme className={className}>
      <path d={d} fill="currentColor" stroke="none" opacity={KROP} />
      <path d={d} />
    </Ramme>
  );
}

/** Omdømme — skjoldet med stjernen. */
export function SkjoldDuo({ className }: P) {
  const skjold = "M12 3.2 19 5.6v5.6c0 4.1-2.8 7.5-7 9.2-4.2-1.7-7-5.1-7-9.2V5.6Z";
  return (
    <Ramme className={className}>
      <path d={skjold} fill="currentColor" stroke="none" opacity={KROP} />
      <path d={skjold} />
      <path d="m12 8.4 1.2 2.5 2.7.2-2 1.8.6 2.7-2.5-1.5-2.5 1.5.6-2.7-2-1.8 2.7-.2Z" />
    </Ramme>
  );
}

/** Stempelkort — kortet med felterne, hvor det sidste mangler. */
export function StempelDuo({ className }: P) {
  return (
    <Ramme className={className}>
      <rect
        x="3.2"
        y="6"
        width="17.6"
        height="12"
        rx="3"
        fill="currentColor"
        stroke="none"
        opacity={KROP}
      />
      <rect x="3.2" y="6" width="17.6" height="12" rx="3" />
      <circle cx="8" cy="12" r="1.7" fill="currentColor" stroke="none" opacity="0.75" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" opacity="0.75" />
      <circle cx="16" cy="12" r="1.7" />
    </Ramme>
  );
}

/** Point — mønten med stjernen. */
export function PointDuo({ className }: P) {
  return (
    <Ramme className={className}>
      <circle cx="12" cy="12" r="8.4" fill="currentColor" stroke="none" opacity={KROP} />
      <circle cx="12" cy="12" r="8.4" />
      <path d="m12 7.9 1.3 2.7 3 .24-2.27 1.97.69 2.92L12 14.11l-2.72 1.62.69-2.92-2.27-1.97 3-.24Z" />
    </Ramme>
  );
}

/** Belønning — gaven, kunden henter. */
export function BeloenningDuo({ className }: P) {
  return (
    <Ramme className={className}>
      <rect
        x="3.5"
        y="9.5"
        width="17"
        height="10.5"
        rx="2.4"
        fill="currentColor"
        stroke="none"
        opacity={KROP}
      />
      <rect x="3.5" y="9.5" width="17" height="10.5" rx="2.4" />
      <path d="M12 9.5V20" />
      <path d="M12 9.5c-2.6 0-4.2-.7-4.2-2.3 0-1.1.9-2 2-2 1.7 0 2.7 1.7 2.2 4.3Z" />
      <path d="M12 9.5c2.6 0 4.2-.7 4.2-2.3 0-1.1-.9-2-2-2-1.7 0-2.7 1.7-2.2 4.3Z" />
    </Ramme>
  );
}

/** Kunder — medlemmet i klubben. */
export function KundeDuo({ className }: P) {
  return (
    <Ramme className={className}>
      <circle cx="12" cy="8.2" r="3.6" fill="currentColor" stroke="none" opacity={KROP} />
      <path
        d="M4.8 20a7.2 7.2 0 0 1 14.4 0Z"
        fill="currentColor"
        stroke="none"
        opacity={KROP}
      />
      <circle cx="12" cy="8.2" r="3.6" />
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
    </Ramme>
  );
}

/** Genbesøg — kunden, der kommer igen. */
export function GenbesoegDuo({ className }: P) {
  return (
    <Ramme className={className}>
      <circle cx="12" cy="12" r="8.2" fill="currentColor" stroke="none" opacity={KROP} />
      <path d="M19.6 10.4A8.2 8.2 0 1 0 20 12" />
      <path d="M20 5.6v4.8h-4.8" />
      <path d="M12 8.4V12l2.4 1.6" opacity="0.7" />
    </Ramme>
  );
}

/** Standere — skiltet på disken. */
export function StanderDuo({ className }: P) {
  return (
    <Ramme className={className}>
      <rect
        x="4"
        y="3.6"
        width="16"
        height="11.5"
        rx="2.6"
        fill="currentColor"
        stroke="none"
        opacity={KROP}
      />
      <rect x="4" y="3.6" width="16" height="11.5" rx="2.6" />
      <path d="M12 15.1V19" />
      <path d="M8.5 19.5h7" />
      <path d="M8.6 8.2h6.8" opacity="0.6" />
      <path d="M8.6 11h4" opacity="0.6" />
    </Ramme>
  );
}

/** Opslag — billedet, butikken deler. */
export function OpslagDuo({ className }: P) {
  return (
    <Ramme className={className}>
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="15"
        rx="3"
        fill="currentColor"
        stroke="none"
        opacity={KROP}
      />
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <circle cx="9" cy="9.5" r="1.6" />
      <path d="m4.2 16.8 4.1-3.8a2 2 0 0 1 2.7 0l2.5 2.3a2 2 0 0 0 2.7 0l1.6-1.5a2 2 0 0 1 2.7 0l.3.3" />
    </Ramme>
  );
}

/*
 * BELØNNINGSTYPERNE — fem motiver, der kom til med de offentlige sider.
 *
 * De fandtes allerede som streger i `illustrations.tsx`, men DE BAR DERES
 * EGEN FARVE: detaljen var hårdkodet `GOLD` eller `ACCENT`. Det er præcis
 * dét, regel 2 forbyder — et ikon, der bærer sin egen farve, kan ikke stå i
 * et felt, der har en anden. Geometrien er den samme, så de to udgaver af
 * samme motiv ikke bliver to forskellige tegninger; kun farven er løftet ud.
 *
 * KROPPEN ER SILHUETTEN, IKKE DETALJEN. I stregudgaven var den farvede del
 * det lille accentstykke (båndet, mønten, prikken). Vendes det om her: den
 * YDRE form fyldes, fordi det er den, der skal ses på afstand, og detaljen
 * bliver streg ovenpå. Ellers ville ikonet have masse ét tilfældigt sted.
 */

/** Gratis produkt — posen, kunden får med. */
export function GratisProduktDuo({ className }: P) {
  const pose = "M4.6 7.6h14.8l-1.1 11.7a1.6 1.6 0 0 1-1.6 1.45H7.3a1.6 1.6 0 0 1-1.6-1.45Z";
  return (
    <Ramme className={className}>
      <path d={pose} fill="currentColor" stroke="none" opacity={KROP} />
      <path d={pose} />
      {/* Hanken skal BRYDE posens overkant, ellers læses de to som én form. */}
      <path d="M9 10.4V6.4a3 3 0 0 1 6 0v4" />
    </Ramme>
  );
}

/** Beløb i rabat — sedlen med værdien i midten. */
export function RabatBeloebDuo({ className }: P) {
  return (
    <Ramme className={className}>
      <rect
        x="2.5"
        y="6"
        width="19"
        height="12"
        rx="1.5"
        fill="currentColor"
        stroke="none"
        opacity={KROP}
      />
      <rect x="2.5" y="6" width="19" height="12" rx="1.5" />
      <circle cx="12" cy="12" r="3" />
      {/* De to lodrette streger er sedlens kant-mønster. Dæmpet, fordi de
          skal kunne anes og ikke tælles — samme greb som ScanDuos midterlinje. */}
      <path d="M5.8 9.4v5.2M18.2 9.4v5.2" opacity="0.45" />
    </Ramme>
  );
}

/** Procent i rabat — de to ringe om skråstregen. */
export function RabatProcentDuo({ className }: P) {
  return (
    <Ramme className={className}>
      {/*
        HER ER KROPPEN TO RINGE OG IKKE ÉN FLADE. Motivet har ingen ydre
        silhuet at fylde — en skråstreg har ingen masse — så de to ringe
        bærer den, og skråstregen holder dem sammen som ét tegn.
      */}
      <circle cx="8" cy="8" r="2.7" fill="currentColor" stroke="none" opacity={KROP} />
      <circle cx="16" cy="16" r="2.7" fill="currentColor" stroke="none" opacity={KROP} />
      <path d="M5.5 18.5 18.5 5.5" />
      <circle cx="8" cy="8" r="2.7" />
      <circle cx="16" cy="16" r="2.7" />
    </Ramme>
  );
}

/** En ydelse — den store gnist med den lille ved siden af. */
export function YdelseDuo({ className }: P) {
  const gnist = "M11 3.5 12.6 9.4 18.5 11 12.6 12.6 11 18.5 9.4 12.6 3.5 11 9.4 9.4Z";
  return (
    <Ramme className={className}>
      <path d={gnist} fill="currentColor" stroke="none" opacity={KROP} />
      <path d={gnist} />
      {/* Den lille gnist starter på x=15 — uden for den store krops inderste
          punkt (12,6; 12,6), så de to ikke smelter sammen ved 22 px. */}
      <path d="M18.5 15 19.3 17.7 22 18.5 19.3 19.3 18.5 22 17.7 19.3 15 18.5 17.7 17.7Z" />
    </Ramme>
  );
}

/** Saldo — bjælken med det, der er optjent. */
export function SaldoDuo({ className }: P) {
  return (
    <Ramme className={className}>
      {/*
        DEN ENESTE I SÆTTET, DER HAR BRUG FOR TO STYRKER I FLADEN, og den
        eneste, hvor det ikke bryder regel 1: banen er kroppen på 18 %, og
        det optjente stykke er FULDT. Et duotone-ikon med to 18 %-flader
        ville ikke kunne vise en saldo — forskellen på de to ER motivet.
      */}
      <rect
        x="2.5"
        y="7.5"
        width="19"
        height="9"
        rx="4.5"
        fill="currentColor"
        stroke="none"
        opacity={KROP}
      />
      <rect x="2.5" y="7.5" width="19" height="9" rx="4.5" />
      <rect x="5" y="10" width="8" height="4" rx="2" fill="currentColor" stroke="none" />
    </Ramme>
  );
}

