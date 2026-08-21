/**
 * Opbevaringsfrister.
 *
 * ÉT PRINCIP: oplysninger, der peger på en person, skal væk, når formålet er
 * udtømt — men tal, der ikke peger på nogen, må gerne blive. Ellers mister
 * butikken sin historik, uden at nogen bliver bedre beskyttet.
 *
 * Listen her er dét, privatlivspolitikken og databehandleraftalen viser
 * kunderne. Selve sletningen sker i `ryd_op_efter_frister()` i migration 0012.
 * De to steder skal stemme — `opbevaring.test.ts` læser SQL-filen og holder
 * dem op mod hinanden, for en frist, vi lover uden at holde, er værre end
 * ingen frist: så står løftet dokumenteret sort på hvidt.
 */

export interface Frist {
  /** Hvad der slettes. Skrevet så en butiksejer forstår det. */
  hvad: string;
  /** Fristen i ord, til visning. */
  naar: string;
  /**
   * Intervallet som det står i SQL'en. `null` betyder, at der ikke er nogen
   * frist — og så skal `hvorfor` forklare, hvorfor det er i orden.
   */
  interval: string | null;
  /**
   * Navnet på `frist_`-variablen i SQL'en — enten i `ryd_op_efter_frister()`
   * (migration 0012) eller i `afslut_ophoerte_aftaler()` (migration 0014).
   * Sat på præcis de frister, oprydningen håndhæver automatisk. Testen læser
   * BEGGE migrationer og kræver, at listerne passer én til én, så en ny frist
   * i SQL'en ikke kan forblive udokumenteret — og omvendt.
   */
  sql?: string;
  hvorfor: string;
}

export const FRISTER: Frist[] = [
  {
    hvad: "Stempelkort — navn, e-mail, telefon og kortets indhold",
    naar: "24 måneder uden aktivitet",
    interval: "24 months",
    sql: "frist_medlem_inaktiv",
    hvorfor:
      "Et stempelkort er et løbende forhold. En kortere frist ville slette kunder, der handler få gange om året, eller en sæsonbutiks gæster.",
  },
  {
    hvad: "Feedback — navn og e-mail",
    naar: "12 måneder",
    interval: "12 months",
    sql: "frist_feedback_navn",
    hvorfor:
      "Formålet er at kunne følge op på en utilfreds kunde. Det er udtømt længe før et år.",
  },
  {
    hvad: "Feedback — selve kommentaren",
    naar: "24 måneder",
    interval: "24 months",
    sql: "frist_feedback_kommentar",
    hvorfor:
      "Fritekst kan indeholde oplysninger om både kunden og personalet, og kan derfor ikke blive liggende, blot fordi navnet er væk.",
  },
  {
    hvad: "Feedback — bedømmelse og dato",
    naar: "Ingen frist",
    interval: null,
    hvorfor:
      "Uden navn og kommentar peger de ikke på nogen. Butikken beholder sin udvikling over tid.",
  },
  {
    hvad: "Statistik over scanninger",
    naar: "Ingen frist",
    interval: null,
    hvorfor:
      "Der gemmes kun tidspunkt og enhedstype — hverken IP-adresse eller andet, der kan pege på en enkelt person.",
  },
  {
    hvad: "Dokumentation af cookiesamtykker",
    naar: "3 år",
    interval: "3 years",
    sql: "frist_samtykkelog",
    hvorfor:
      "Samtykket skal kunne påvises, men dokumentationspligten rækker ikke længere end forældelsen. Loggen indeholder intet personhenførbart.",
  },
  {
    hvad: "Log over handlinger på stempelkort",
    naar: "24 måneder",
    interval: "24 months",
    sql: "frist_revisionslog",
    hvorfor: "Samme frist som kortene — loggen handler jo om, hvad der er sket på dem.",
  },
  {
    hvad: "Oplysninger om personale",
    naar: "Straks ved fjernelse",
    interval: null,
    hvorfor:
      "Butikken fjerner selv en medarbejder i panelet, og adgangen og oplysningerne forsvinder med det samme.",
  },
  {
    hvad: "Butikkens egne oplysninger og fakturaer",
    naar: "5 år efter regnskabsårets udløb",
    interval: null,
    hvorfor: "Bogføringsloven kræver det.",
  },
  {
    hvad: "Alt ved manglende betaling",
    naar: "6 måneder",
    interval: "6 months",
    sql: "frist_suspension",
    hvorfor:
      "Manglende betaling er ikke det samme som at forlade os. Butikken beholder sine kunder og deres stempler imens, og butikkens egne kunder mister ikke stempler, de har gjort sig fortjent til.",
  },
  {
    hvad: "Alt ved aftalens ophør",
    naar: "30 dage",
    interval: "30 days",
    sql: "frist_efter_ophoer",
    hvorfor:
      "Der er plads til at fortryde en opsigelse, uden at oplysningerne bliver liggende bagefter.",
  },
];

/** Den korte version — den ene sætning, en butiksejer skal huske. */
export const FRIST_KORT =
  "Vi gemmer dine kunders oplysninger, så længe de bruger deres kort, og sletter dem efter to år uden aktivitet.";

/** Hvor tit oprydningen kører. Skal stemme med cron-planen i vercel.json. */
export const OPRYDNING_KADENCE = "hver nat";
