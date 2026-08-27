import "server-only";
import { SKABELON_SORT } from "./print/skabelon-sort";
import { SKABELON_HVID } from "./print/skabelon-hvid";
import { normaliserHex } from "./stander-tilvalg";
import QRCode from "qrcode";
import {
  laesQrSvg,
  LOGO_FELT,
  LOGO_DAEK,
  QR_FELT,
  QR_DAEK,
  QR_MODUL,
  skabelonTil,
  skiveFarve,
  ringFarve,
  kontrast,
} from "./skilt-format";

/**
 * Skiltet, som det bliver trykt — og som det vises i bestillingen.
 *
 * ÉN KILDE. Previewet i designeren og trykfilen kommer fra den SAMME funktion,
 * så de ikke kan komme til at vise hver sit. Alternativet — en let, hjemmelavet
 * gengivelse i previewet — var hurtigere, men så ville kunden godkende ét
 * skilt og få et andet, og det opdages først på en disk.
 *
 * Skabelonerne er Canva-eksporter, hvor al tekst er lavet om til kurver. Der
 * er hverken <text> eller <circle> at rette i; kun farverne står som
 * literaler, og det er dem, der kan skiftes. Se scripts/lav-print-skabelon.mjs.
 */

export {
  SKILT_BREDDE,
  SKILT_HOEJDE,
  lyshed,
  kontrast,
  skabelonTil,
} from "./skilt-format";

export interface SkiltValg {
  /** Baggrundsfarven. Standerens farve, eller kundens egen mod betaling. */
  baggrund: string;
  /** Farven på stjerner, ring og "Scan eller tap". Frit valg, uden beregning. */
  accent: string;
  /**
   * Adressen QR-koden skal føre til — `https://loyalsum.dk/r/<slug>`.
   *
   * Udeladt betyder, at standeren ikke er kendt endnu, og så bliver
   * pladsholderen stående. Et skilt med en FORKERT kode er værre end et med
   * en pladsholder: den forkerte bliver trykt og opdaget af en kunde, der
   * står og scanner.
   */
  qrAdresse?: string | null;
  /**
   * Kundens logo som en `data:`-URI.
   *
   * IKKE EN ADRESSE, og det er ikke til pynt: en SVG, der indlæses gennem et
   * <img>, er et sandkasse-dokument uden adgang til netværket. Et <image
   * href="https://…"> blev derfor tegnet som et brudt ikon — set i browseren.
   * Bagt ind virker filen både i previewet, i trykken og i en PDF, uden at
   * afhænge af, at et lager svarer.
   */
  logoDataUri?: string | null;
}

/**
 * Bygger skiltet som en SVG-streng.
 *
 * TRYKFILEN ER ALTID HELE SKILTET, også de nederste 5 cm, der sidder i foden
 * og aldrig kan ses. Fladen skal trykkes: skæres den fra, står der en hvid
 * stribe frem under foden. Zonen markeres kun i previewet — se `SkiltPreview`.
 */
export async function byggSkilt(valg: SkiltValg): Promise<string> {
  const baggrund = normaliserHex(valg.baggrund) ?? "#111111";
  const accent = normaliserHex(valg.accent) ?? "#4ea4ad";

  const variant = skabelonTil(baggrund);
  const skabelon = variant === "sort" ? SKABELON_SORT : SKABELON_HVID;

  let svg = skabelon
    .replaceAll("{{BG}}", baggrund)
    .replaceAll("{{ACCENT}}", accent)
    // Skiven og ringen AFLEDES af baggrunden frem for at stå fast. Se
    // skiveFarve() — en fast sort cirkel på en bordeaux bund så ud til at
    // høre til et andet skilt.
    .replaceAll("{{SKIVE}}", skiveFarve(baggrund))
    .replaceAll("{{RING}}", ringFarve(baggrund));

  if (valg.qrAdresse) {
    svg = svg.replace(
      "</svg>",
      `${await qrLag(valg.qrAdresse, variant, baggrund)}</svg>`,
    );
  }

  if (valg.logoDataUri) {
    svg = svg.replace("</svg>", `${logoLag(valg.logoDataUri, baggrund)}</svg>`);
  }

  return svg;
}

/**
 * Kundens logo — og hele logofeltet, der forsvinder med det.
 *
 * FELTET SKAL VÆRE HELT VÆK. Bunden, ordet "Dit logo" og den turkise ramme
 * er en pladsholder, ikke en indramning: bliver rammen stående om et logo,
 * ser skiltet ud til at have to mærker. Derfor lægges der først en flade i
 * baggrundsfarven over det hele — lidt større end feltet, så den yderste
 * halvdel af rammens streg også ryger med.
 *
 * LOGOET FÅR HELE FELTET og skaleres med preserveAspectRatio="xMidYMid meet".
 * `meet` er præcis det, der skal til: billedet holder sit sideforhold, fyldes
 * ud til det rører feltets korteste led, og er altid helt med. `slice` ville
 * fylde feltet men skære kanterne af logoet, og det er dét, ingen opdager
 * før skiltet er trykt.
 *
 * Der maskeres ikke: har logoet en hvid baggrund, ses den — præcis som den
 * bliver trykt. Skjulte vi den, ville kunden først opdage det på skiltet, og
 * et skilt kan ikke kaldes tilbage.
 */
function logoLag(dataUri: string, baggrund: string): string {
  return (
    `<rect x="${LOGO_DAEK.x}" y="${LOGO_DAEK.y}" width="${LOGO_DAEK.bredde}" ` +
    `height="${LOGO_DAEK.hoejde}" fill="${baggrund}"/>` +
    `<image href="${escapeXml(dataUri)}" x="${LOGO_FELT.x}" y="${LOGO_FELT.y}" ` +
    `width="${LOGO_FELT.bredde}" height="${LOGO_FELT.hoejde}" ` +
    `preserveAspectRatio="xMidYMid meet"/>`
    // Sidst i dokumentet, så laget ligger ØVERST. En <image> tidligere i
    // filen ville forsvinde under skabelonens egne flader.
  );
}

/**
 * QR-koden som et lag, der lægges oven på pladsholderen.
 *
 * DÆKKER FREM FOR AT FJERNE. Pladsholderen er en gruppe kurver midt i 440
 * andre, og at klippe den ud ville kræve at parse et dokument, vi ikke selv
 * har lavet. Et dækkende felt i baggrundsfarven og koden ovenpå giver samme
 * resultat uden gætværk — og feltets mål er målt på skabelonens egen
 * klippemaske, så de to flugter.
 *
 * MODULERNE ER LYSE PÅ DEN SORTE SKABELON. Det er designets eget valg;
 * pladsholderen ser sådan ud. Telefonkameraer læser inverterede koder.
 *
 * Fejlkorrektion "M": QR-koden sidder på et trykt skilt, der kan blive ridset
 * eller få kaffe på sig, og et niveau over det laveste koster kun lidt plads.
 */
async function qrLag(
  adresse: string,
  variant: "sort" | "hvid",
  baggrund: string,
): Promise<string> {
  const raa = await QRCode.toString(adresse, {
    type: "svg",
    errorCorrectionLevel: "M",
    /*
     * HVILEZONE PÅ 2 MODULER. Standarden foreskriver 4, men koden ligger på
     * en ren flade, der fortsætter langt ud over feltet, så baggrunden selv
     * er zonen. De 2 sikrer, at der ALTID er luft, også hvis feltet en dag
     * rykker tættere på noget andet. Marginen tegnes ikke — den falder
     * sammen med dækfeltet nedenfor, som har baggrundens farve.
     */
    margin: 2,
  });

  const kode = laesQrSvg(raa);
  if (!kode) return "";
  const { d, net } = kode;

  const skala = QR_FELT.side / net;

  return (
    // DÆKFLADEN ER STØRRE END KODEN: de to skabeloner har pladsholderen et
    // punkt fra hinanden, og en for nøjagtig flade ville lade en stump af
    // den stå tilbage langs en kant på den ene af dem.
    `<rect x="${QR_DAEK.x}" y="${QR_DAEK.y}" width="${QR_DAEK.bredde}" ` +
    `height="${QR_DAEK.hoejde}" fill="${baggrund}"/>` +
    `<g transform="translate(${QR_FELT.x} ${QR_FELT.y}) scale(${skala})">` +
    // STROKE OG IKKE FILL. `qrcode` tegner modulerne som åbne, vandrette
    // linjer på halve koordinater (`M0 0.5h7m3 0h1…`) med en stregbredde på
    // 1. En fyldning på dem tegner næsten ingenting — set i previewet, hvor
    // QR-feltet stod tomt med et par svage konturer.
    `<path d="${d}" stroke="${QR_MODUL[variant]}" stroke-width="1" ` +
    `shape-rendering="crispEdges"/></g>`
  );
}

/**
 * `&` og `"` i en URL ville lukke attributten og ødelægge dokumentet.
 * Supabase-adresser indeholder begge dele i deres query.
 */
function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Advarsler, kunden skal se FØR skiltet går i trykken — ikke bagefter. */
export function skiltAdvarsler(valg: SkiltValg): string[] {
  const ud: string[] = [];
  const baggrund = normaliserHex(valg.baggrund) ?? "#111111";
  const accent = normaliserHex(valg.accent) ?? "#4ea4ad";

  /*
   * 3:1 er WCAG's grænse for grafik, der skal kunne ses. Under den forsvinder
   * stjernerne og "Scan eller tap" i baggrunden — og et trykt skilt kan ikke
   * rettes bagefter. Der ADVARES og spærres ikke: det er kundens skilt, og de
   * kan have en grund, vi ikke kender.
   */
  if (kontrast(accent, baggrund) < 3) {
    ud.push(
      "Din farve ligger tæt på baggrunden. Stjernerne og teksten “Scan eller tap” bliver svære at se på det trykte skilt.",
    );
  }

  /*
   * QR-KODEN ER DEN ENE TING, DER SKAL VIRKE. Stjerner, man ikke kan se, er
   * en skønhedsfejl; en kode, et kamera ikke kan læse, gør hele skiltet
   * nytteløst. Grænsen er sat højere end de 3, fordi aflæsningen sker på en
   * skrå skærm i dårligt lys og ikke under en lampe.
   */
  const modul = QR_MODUL[skabelonTil(baggrund)];
  if (kontrast(modul, baggrund) < 4) {
    ud.push(
      "QR-koden får for lidt kontrast mod din baggrund. Vælg en tydeligt lysere eller mørkere farve — ellers kan kameraet ikke læse den.",
    );
  }

  return ud;
}
