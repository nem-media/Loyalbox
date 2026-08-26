import {
  EARN_MODEL_LABELS,
  EARN_MODEL_HELP,
  type EarnModel,
} from "@/lib/loyalty/constants";

/**
 * Vejledninger til dashboardet.
 *
 * REGEL, samme som for landingssiderne: her må kun stå funktioner, der findes.
 * En café-ejer skal kunne følge trinnene og få det til at ske — et trin, der
 * beskriver noget, vi har tænkt os at bygge, er værre end ingen vejledning.
 *
 * Indholdet ligger som data og ikke som JSX, så den samme tekst kan vises både
 * på hjælpesiden og som hjælp inde på den enkelte side. Ellers ville de to
 * langsomt komme til at sige hver sit.
 */

/**
 * Et trin er som regel bare en linje. Har det en liste under sig — fx de
 * optjeningsmodeller, man kan vælge imellem — bliver den til punkter, i stedet
 * for at alle mulighederne mases sammen i én sætning.
 */
export type GuideStep = string | { text: string; items: string[] };

export interface Guide {
  /** Bruges som ankernavn på hjælpesiden: /dashboard/hjaelp#<id> */
  id: string;
  title: string;
  /** Én linje på hjælpesiden. */
  summary: string;
  /**
   * Hjælpeteksten ude på siden. Siderne har allerede en beskrivelse under
   * overskriften, så her skal stå noget ANDET — ellers læser brugeren den
   * samme sætning to gange og lærer intet. Er den tom, bruges summary.
   */
  hint?: string;
  /** Siden vejledningen handler om. */
  href?: string;
  hrefLabel?: string;
  steps: GuideStep[];
  /** Ting der er gode at vide, men ikke er et trin. */
  notes?: string[];
  /**
   * Hvad vejledningen forudsætter, man har købt. Udeladt = alle kan følge den.
   *
   * HVORFOR DET SKAL STÅ HER: hjælpesiden viste alle ni vejledninger til
   * alle. En konto uden abonnement mødte altså en liste over ni ting, den
   * ikke kunne gøre — og den første bad den om at "oprette din første
   * stander under Standere", hvilket er spærret. En hjælp, der beskriver
   * det umulige, er ikke hjælp.
   */
  kraever?: "abonnement" | "komplet";
}

// Listen udledes af labels-objektet, så en ny optjeningsmodel automatisk
// dukker op i vejledningen i stedet for at blive glemt her.
const optjening = (Object.keys(EARN_MODEL_LABELS) as EarnModel[]).map(
  (m) => `${EARN_MODEL_LABELS[m]} — ${EARN_MODEL_HELP[m]}`,
);

export const GUIDES: Guide[] = [
  /*
   * DEN FØRSTE VEJLEDNING ER DEN ENESTE UDEN ET KRAV, og den manglede.
   * Hjælpesiden begyndte med "Opret din første stander under Standere" —
   * spærret uden abonnement. Det, en ny konto FAKTISK skal gøre, stod der
   * ikke et ord om.
   */
  {
    id: "bestil",
    title: "Design og bestil dit skilt",
    summary:
      "Det første skridt: vælg farve, læg dit logo på, og få skiltet sendt.",
    hint: "Du ser skiltet, mens du sætter det sammen — og prisen følger med undervejs.",
    href: "/bestil",
    hrefLabel: "Design og bestil",
    steps: [
      "Vælg løsningen og hvor mange skilte, du skal bruge. Køber du flere, falder prisen pr. stk.",
      "Vælg standerens farve, og læg dit logo op. Logoet trykkes på skiltet, som du ser det — vi retter ikke i det, så tjek at det står rent på baggrunden.",
      "Vil du have din egen farve på fronten, kan du vælge den. Det er et fast tillæg, der lægges til én gang — også selv om du bestiller flere skilte.",
      "Køber du uden abonnement, skal du oplyse, hvor QR-koden skal føre hen. Det trykkes fast på skiltet og kan ikke ændres bagefter.",
      "Accepter betingelserne og betal. Så går skiltet i produktion.",
    ],
    notes: [
      "Logoet ændres aldrig automatisk. Har det en hvid baggrund, bliver den trykt med — vælg en fil med gennemsigtig baggrund, hvis den skal væk.",
      "JPEG kan ikke bruges: formatet har ingen gennemsigtighed og laver kanter omkring skarpe streger. Brug PNG eller SVG.",
    ],
  },
  {
    id: "kom-i-gang",
    kraever: "abonnement" as const,
    title: "Kom godt i gang",
    summary:
      "Når skiltet er kommet: sæt QR-adressen op, og få den første anmeldelse ind.",
    href: "/dashboard/standere",
    hrefLabel: "Gå til Standere",
    steps: [
      "Opret din første stander under Standere, og giv den et navn du kan kende den på — fx “Disken” eller “Indgangen”.",
      "Åbn standeren og indsæt dine links: Google, Trustpilot eller Facebook. Kunden ser dem, når QR-koden scannes.",
      "Udfyld din virksomhedsprofil med logo og navn, så siden kunden lander på ligner jer.",
      "Sæt standeren på disken. Scan selv QR-koden med din telefon og se, at den lander det rigtige sted.",
    ],
    notes: [
      "Du behøver ikke stempelkort for at bruge standeren. Anmeldelser og stempelkort er to ting, der virker hver for sig.",
    ],
  },
  {
    id: "standere",
    kraever: "abonnement" as const,
    title: "Standere og QR-koder",
    summary:
      "Hver stander har sit eget link og sin egen QR-kode — og du kan ændre, hvor den fører hen, uden at trykke en ny.",
    hint: "Skifter du hvor QR-koden fører hen, virker alle trykte standere med det samme.",
    href: "/dashboard/standere",
    hrefLabel: "Gå til Standere",
    steps: [
      "Opret en stander pr. sted, du vil måle på. Har du to butikker eller både disk og bord, så lav én til hver — så kan du se, hvor anmeldelserne kommer fra.",
      "Indsæt de links, kunden skal kunne vælge imellem. Har du kun ét, står det alene.",
      "Vil du sende kunden et helt andet sted hen — fx menukort eller booking — så brug feltet Eget link. Det vises som et ekstra valg og tæller ikke som en anmeldelse.",
      "Sæt standeren inaktiv, hvis den midlertidigt ikke er i brug. QR-koden holder op med at føre videre, indtil du sætter den aktiv igen.",
    ],
    notes: [
      "QR-koden peger på en adresse hos os, ikke direkte på Google. Derfor kan du skifte destinationen når som helst — den trykte stander skal ikke laves om.",
      "Skifter du fx fra Google til Trustpilot, virker alle standere derude med det samme.",
    ],
  },
  {
    id: "stempelkort",
    kraever: "komplet" as const,
    title: "Opret et stempelkort",
    summary:
      "Guiden fører dig gennem seks trin: navn, hvordan der optjenes, belønningen, udseende, regler og et gennemsyn.",
    href: "/dashboard/loyalitet/programmer/nyt",
    hrefLabel: "Opret stempelkort",
    steps: [
      "Start under Stempelkort → Opret. Giv kortet et navn, kunden forstår — fx “Kaffekort”.",
      {
        text: "Vælg hvordan der optjenes:",
        items: optjening,
      },
      "Vælg belønningen, og hvor mange stempler der skal til. Ti stempler til en gratis kop kaffe er et godt sted at starte.",
      "Vælg farver, så kortet ligner jer. Kunden ser det på sin telefon.",
      "Gennemse til sidst, og gem. Kortet oprettes som kladde — sæt det aktivt, når du er klar til at bruge det.",
    ],
    notes: [
      "Du kan sætte et kort på pause uden at slette det. Kundernes stempler bliver stående.",
      "Belønninger må aldrig kræve, at kunden skriver en offentlig anmeldelse. Det er bevidst umuligt at sætte op — anmeldelser og loyalitet holdes adskilt.",
    ],
  },
  {
    id: "kunder",
    kraever: "komplet" as const,
    title: "Få kunder på kortet",
    summary:
      "Kunden tilmelder sig selv ved at scanne — eller du opretter kortet ved disken.",
    hint: "Kunden behøver hverken app eller konto for at have et kort.",
    href: "/dashboard/loyalitet/kunder",
    hrefLabel: "Se kunder",
    steps: [
      "Lad kunden scanne QR-koden på standeren og tilmelde sig selv. Det er den nemmeste vej og kræver intet af jer.",
      "Har kunden ikke lyst til at scanne, kan du oprette kortet under Stempelkort → Kunder → Ny kunde.",
      "Kunden får sin egen kortadresse. Den skal de gemme — fx som bogmærke på telefonen.",
    ],
    notes: [
      "Der skal ikke hentes nogen app, og kunden behøver ikke oprette en konto.",
      "Vil kunden alligevel kunne finde kortet frem på en ny telefon, kan de oprette en konto og samle deres kort ét sted. Det er frivilligt.",
      "Kortets adresse er hemmelig og fungerer som nøglen til kortet. Del den aldrig offentligt.",
    ],
  },
  {
    id: "stempling",
    kraever: "komplet" as const,
    title: "Giv stempler og indløs belønninger",
    summary: "Det foregår på kundens eget kort, mens de står ved disken.",
    steps: [
      "Bed kunden vise sit kort på telefonen.",
      "Er du logget ind som personale, ser du en stempelknap direkte på kortet. Tryk, og stemplet er givet.",
      "Har kunden optjent en belønning, står den øverst på kortet. Den indløses samme sted, når kunden bruger den.",
    ],
    notes: [
      "Historikken gemmes, så du altid kan se, hvad der er givet og indløst — og af hvem.",
      "Personalet skal have deres egen adgang — se vejledningen om personale. Del aldrig din egen adgangskode; så kan du hverken se hvem der har gjort hvad, eller lukke adgangen for én person.",
    ],
  },
  {
    id: "personale",
    kraever: "abonnement" as const,
    title: "Giv personalet adgang",
    summary:
      "Dine ansatte får deres eget login, så de kan stemple uden at kende din adgangskode.",
    hint: "Hver medarbejder får sit eget login — del aldrig din egen adgangskode.",
    href: "/dashboard/personale",
    hrefLabel: "Gå til Personale",
    steps: [
      "Gå til Personale, og skriv medarbejderens navn og e-mail.",
      "Vælg hvad de må: give stempler, indløse belønninger og eventuelt give rabatter.",
      "Tryk tilføj. De får en mail med et link, hvor de vælger deres egen adgangskode.",
      "Når de logger ind, lander de på personalesiden, hvor de kan finde en kundes kort og stemple.",
    ],
    notes: [
      "Har medarbejderen allerede en LoyalSum-konto, bliver den brugt — der sendes ingen ny invitation.",
      "Står der “Har ikke logget ind endnu”, har de ikke accepteret invitationen. Brug “Send login-link igen”.",
      "Stopper en medarbejder, så luk adgangen. Historikken bliver stående, så du kan se hvad der er sket.",
      "Medarbejdere kan ikke se dashboardet, tilføje andre medarbejdere eller ændre jeres abonnement.",
    ],
  },
  {
    id: "rabatter",
    kraever: "komplet" as const,
    title: "Rabatter",
    summary:
      "Tilbud du kan give en enkelt kunde — også som en undskyldning, når noget er gået skævt.",
    hint: "En rabat gives til én bestemt kunde og dukker op på deres kort.",
    href: "/dashboard/loyalitet/rabatter",
    hrefLabel: "Gå til Rabatter",
    steps: [
      "Opret rabatten under Stempelkort → Rabatter. Vælg type — fast beløb, procent, gratis produkt og flere — og hvor længe den gælder.",
      "Gå ind på kunden under Kunder, og giv rabatten til netop dem.",
      "Kunden ser rabatten på sit kort og viser den ved disken. I indløser den samme sted som en belønning.",
    ],
    notes: [
      "Kompensationsrabatten er tænkt til en kunde, der har haft en dårlig oplevelse. Den er ofte forskellen på, om de kommer igen.",
    ],
  },
  {
    id: "opslag",
    kraever: "komplet" as const,
    title: "Opslag til sociale medier",
    summary:
      "Lav et delbart billede ud af jeres bedste anmeldelser på under et minut.",
    hint: "I henter selv billedet og deler det — vi lægger ikke noget op for jer.",
    href: "/dashboard/opslag",
    hrefLabel: "Gå til Opslag",
    steps: [
      "Vælg en af jeres 5-stjernede anmeldelser.",
      "Vælg baggrund, og ret teksten til, hvis den er lang.",
      "Hent billedet, og læg det op på Facebook eller Instagram, som du plejer.",
    ],
    notes: [
      "Vi lægger ikke selv noget op for jer — I henter billedet og deler det, hvor I vil.",
    ],
  },
  {
    id: "feedback",
    kraever: "abonnement" as const,
    title: "Privat feedback",
    summary:
      "Kunder, der ikke gik videre til en offentlig anmeldelse, kan skrive til jer i stedet.",
    href: "/dashboard/feedback",
    hrefLabel: "Gå til Feedback",
    steps: [
      "Feedbacken lander i indbakken under Feedback. Kun I kan se den.",
      "Læs den, og ret op på det der kan rettes op på.",
      "Overvej en kompensationsrabat til kunden, hvis noget er gået galt.",
    ],
    notes: [
      "Privat feedback er ikke en offentlig anmeldelse og bliver aldrig vist frem af os.",
      "Indbakken kræver Pro.",
    ],
  },
];

export function getGuide(id: string): Guide | undefined {
  return GUIDES.find((g) => g.id === id);
}
