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
 */

export const STANDER_FARVER = [
  { vaerdi: "sort", navn: "Sort", hex: "#111111" },
  { vaerdi: "hvid", navn: "Hvid", hex: "#ffffff" },
] as const;

export type StanderFarve = (typeof STANDER_FARVER)[number]["vaerdi"];

export const STANDARD_STANDERFARVE: StanderFarve = "sort";

/**
 * Pris for egen farve på fronten. **Pr. ORDRE, ikke pr. stander** — det er én
 * opsætning i trykket, uanset hvor mange skilte der laves af den.
 *
 * Af samme grund gives der ingen mængderabat på den: rabatten hører til
 * enheden, og der er kun én opsætning.
 */
export const EGEN_FRONTFARVE_PRIS = 139;

/**
 * LoyalSums egen farve på skiltet: stjernerne, ringen om logoet og
 * "Scan eller tap". Det er den, designet er tegnet med.
 *
 * ACCENTEN ER GRATIS AT SKIFTE, i modsætning til frontfarven. Det er ikke en
 * venlighed, men en konsekvens: accenten er den samme trykfil med en anden
 * farvekode, mens baggrunden er et selvstændigt tryk. Prisen følger, hvad der
 * faktisk koster noget.
 *
 * BEMÆRK at det ikke er sitets accentfarve (#26616e). Skiltet er tegnet i
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
 * blive opkrævet 139 — eller omvendt.
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
export const FRONT_TEKSTER = {
  tilvalg: "Egen farve på fronten",
  pris: `+${EGEN_FRONTFARVE_PRIS} kr. ex. moms`,
  forklaring:
    "Kun den printede front ændrer farve. Sider, bagside og fod beholder standerens valgte farve.",
  prisNote: "Prisen er pr. ordre — ikke pr. stander.",
} as const;
