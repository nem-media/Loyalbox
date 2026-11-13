/**
 * Tilvalg på en standerbestilling: standerens farve og den printede front.
 *
 * DEN VIGTIGE SONDRING: standerens farve er en produktvariant — selve emnet er
 * sort eller hvidt akryl. Frontfarven er BLOT det printede felt. Sider,
 * bagside og fod beholder standerens farve, uanset hvad fronten får.
 *
 * FRONTEN FØLGER STANDEREN AF SIG SELV. Sort stander giver sort front, hvid
 * giver hvid, og kunden skal ikke tage stilling. Først hvis de aktivt vælger
 * en egen farve, kommer der en vælger frem. Det er derfor `frontFarve()`
 * findes: den ene funktion afgør resultatet, så brugerfladen ikke kan komme
 * til at vise én farve og fakturere en anden.
 *
 * DE TO FARVER KOSTER DET SAMME (fra 2026-11-13; før kostede sort 49 kr. pr.
 * stander). Maskineriet til et tillæg er bevaret: SKULLE sort igen koste
 * ekstra, er det en EMNEpris og ikke en opsætning, og den opfører sig modsat
 * frontfarven: den ganges med antallet og får mængderabat. Sæt bare
 * `SORT_STANDER_TILLAEG` — teksterne nedenfor følger tallet af sig selv.
 */

export const STANDER_FARVER = [
  { vaerdi: "sort", navn: "Sort", hex: "#111111" },
  { vaerdi: "hvid", navn: "Hvid", hex: "#ffffff" },
] as const;

export type StanderFarve = (typeof STANDER_FARVER)[number]["vaerdi"];

/**
 * Farven kunden møder, hvis de ikke rører vælgeren.
 *
 * HVID ER STANDARD. Den var grundudgaven, dengang sort kostede et tillæg, og
 * den bliver stående: kommer et tillæg tilbage, må det aldrig ramme den
 * kunde, der bare klikkede videre.
 */
export const STANDARD_STANDERFARVE: StanderFarve = "hvid";

/**
 * Tillæg for sort akryl — **pr. stander, med mængderabat**.
 *
 * Modsat `EGEN_FRONTFARVE_PRIS` hører den til emnet og ikke til trykket:
 * ti sorte standere koster ti gange tillægget, og de får samme rabattrin som
 * standerprisen. Derfor lægges den til `standUnitBase` i `priceFor()` frem
 * for at stå som en selvstændig linje.
 */
export const SORT_STANDER_TILLAEG = 0;

/** Tillæg pr. stander for en given farve. Hvid er grundudgaven og koster 0. */
export function standerTillaeg(farve: StanderFarve): number {
  return farve === "sort" ? SORT_STANDER_TILLAEG : 0;
}

/**
 * Pris for egen farve på fronten. **Pr. ORDRE, ikke pr. stander** — det er én
 * opsætning i trykket, uanset hvor mange skilte der laves af den.
 *
 * Af samme grund gives der ingen mængderabat på den: rabatten hører til
 * enheden, og der er kun én opsætning.
 *
 * GRATIS FRA 2026-11-13 (før 49 kr.). Checkout lægger kun en linje på, når
 * beløbet er over nul, og teksterne nedenfor siger selv "uden beregning".
 */
export const EGEN_FRONTFARVE_PRIS = 0;

/**
 * LoyalSums egen farve på skiltet. Det er den, designet er tegnet med.
 *
 * PÅ ET TRYKT SKILT FARVER DEN STJERNERNE OG "SCAN ELLER TAP" — ikke andet.
 * Skabelonen tegner ganske vist også rammen om logofeltet i accenten, men
 * `fjernAttrap()` skærer hele logofeltet ud, så snart der ligger et logo, og
 * det gør der på enhver rigtig ordre. Rammen når altså aldrig trykket, og den
 * må derfor ikke nævnes i det, kunden får at vide — den ville love en farve
 * på noget, de aldrig kommer til at se. Se `logoLag()` i skilt.ts.
 *
 * ACCENTEN ER GRATIS AT SKIFTE — og det er frontfarven også (fra 2026-11-13).
 *
 * BEMÆRK at det ikke er sitets accentfarve (#0f5b66). Skiltet er tegnet i
 * logoets lysere turkis, som holder på både sort og hvid bund.
 */
export const STANDARD_ACCENT = "#4ea4ad";

export function erStanderFarve(v: unknown): v is StanderFarve {
  return STANDER_FARVER.some((f) => f.vaerdi === v);
}

export function standerFarveNavn(v: StanderFarve): string {
  return STANDER_FARVER.find((f) => f.vaerdi === v)!.navn;
}

/** Sekscifret hex med foranstillet #. Trecifret udvides, så lagringen er ensartet. */
export function normaliserHex(raw: string): string | null {
  const v = raw.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(v)) {
    return `#${v[0]}${v[0]}${v[1]}${v[1]}${v[2]}${v[2]}`;
  }
  if (/^[0-9a-f]{6}$/.test(v)) return `#${v}`;
  return null;
}

export function erGyldigHex(raw: string | null | undefined): boolean {
  return Boolean(raw && normaliserHex(raw));
}

export interface Frontvalg {
  /** Har kunden valgt sin egen farve — og skal der altså betales for den? */
  egen: boolean;
  /** Farven fronten printes i. */
  hex: string;
  /** Til visning: "Følger standeren (sort)" eller selve hex-koden. */
  beskrivelse: string;
}

/**
 * Hvilken farve får fronten?
 *
 * ÉN funktion, fordi prisen hænger på svaret. Regnede brugerfladen og
 * serveren hver for sig, kunne kunden se "følger standeren" og alligevel
 * blive opkrævet tillægget — eller omvendt.
 *
 * En ugyldig eller manglende hex falder tilbage til standerens farve UDEN
 * tillæg. Et tomt felt må ikke koste penge.
 */
export function frontFarve(
  standerFarve: StanderFarve,
  egenHex?: string | null,
): Frontvalg {
  const egen = egenHex ? normaliserHex(egenHex) : null;
  if (egen) {
    return { egen: true, hex: egen, beskrivelse: egen };
  }
  const standerens = STANDER_FARVER.find((f) => f.vaerdi === standerFarve)!;
  return {
    egen: false,
    hex: standerens.hex,
    beskrivelse: `Følger standeren (${standerens.navn.toLowerCase()})`,
  };
}

/* ------------------------------------------------------------------ tekster */

/**
 * Ordlyden ét sted, fordi den samme forklaring skal stå både ved valget, i
 * kurvens opsummering og på ordren. Tre håndskrevne udgaver bliver til tre
 * forskellige løfter om, hvad kunden får.
 */
/**
 * Ordlyden om farvetillægget ét sted — samme grund som `FRONT_TEKSTER`.
 * Vælgeren står to steder (designeren og bestilling uden konto), og to
 * håndskrevne udgaver bliver til to forskellige priser på skærmen.
 */
export const ACCENT_TEKSTER = {
  tilvalg: "Egen farve på stjerner og tekst",
  pris: "uden beregning",
  forklaring:
    "Stjernerne og “Scan eller tap”. Det er den samme trykfil med en anden farvekode, så den koster ikke ekstra.",
} as const;

export const FARVE_TEKSTER = {
  tillaegKort: `+${SORT_STANDER_TILLAEG} kr./stk.`,
  gratis: "Ingen tillægspris",
  prisNote:
    SORT_STANDER_TILLAEG > 0
      ? "Tillægget for sort er pr. stander og får samme mængderabat som standeren selv."
      : "Sort og hvid koster det samme.",
} as const;

/**
 * Forklaringen under standerlinjen i en prisopsummering.
 *
 * Tillægget ligger inde i enhedsprisen og har derfor ingen linje for sig
 * selv — men totalen må ikke bare stige uforklarligt, når kunden vælger sort.
 */
export function farveTillaegNote(formateretBeloeb: string): string {
  return `inkl. ${formateretBeloeb} pr. stk. for sort akryl`;
}

/** Den korte pristekst under et farvevalg. Hvid siger det ligeud: intet tillæg. */
export function farveTillaegTekst(farve: StanderFarve): string {
  return standerTillaeg(farve) > 0
    ? FARVE_TEKSTER.tillaegKort
    : FARVE_TEKSTER.gratis;
}

export const FRONT_TEKSTER = {
  tilvalg: "Egen farve på fronten",
  pris:
    EGEN_FRONTFARVE_PRIS > 0
      ? `+${EGEN_FRONTFARVE_PRIS} kr. ex moms`
      : "uden beregning",
  forklaring:
    "Kun den printede front ændrer farve. Sider, bagside og fod beholder standerens valgte farve.",
  prisNote:
    EGEN_FRONTFARVE_PRIS > 0
      ? "Prisen er pr. ordre — ikke pr. stander."
      : "Den koster ikke ekstra.",
} as const;
