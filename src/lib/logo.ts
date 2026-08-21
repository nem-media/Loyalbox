/**
 * Kontrol af logofilen, kunden uploader til sit skilt.
 *
 * TO REGLER STYRER DET HELE:
 *
 *  1. Vi ændrer ALDRIG filen. Der forsøges ikke automatisk at fjerne en
 *     baggrund. Baggrundsfjernelse fejler uforudsigeligt netop på de logoer,
 *     der har bløde kanter eller skygger, og resultatet ville blive dårligere
 *     end kundens egen fil — men fejlen ville være vores.
 *
 *  2. Vi skjuler ikke problemet. Previewet viser den hvide baggrund, hvis der
 *     er en, i stedet for at maskere den. Det lader kunden finde sin egen fejl,
 *     før den koster et tryk.
 *
 * ADVARSEL FREM FOR BLOKERING, hvor det kan lade sig gøre. En blokering på et
 * blødt kriterium som opløsning irriterer dem, der ved hvad de gør; en advarsel
 * standser dem, der ikke gør. Kun det åbenlyst ubrugelige afvises.
 *
 * ALT KAN KØRE I BROWSEREN. Bredde, højde og transparens står i PNG-filens
 * første bytes, så kontrollen kræver hverken upload, bibliotek eller
 * serverkald — checkout bliver ikke tungere af den.
 */

export const LOGO_KRAV = {
  /** 5 MB. Over det afvises filen. */
  maksBytes: 5 * 1024 * 1024,
  /**
   * Under dette er filen åbenlyst ubrugelig til tryk og afvises. Bevidst sat
   * lavt: alt mellem denne og `anbefaletBredde` er en advarsel, ikke et nej.
   */
  minBredde: 200,
  /** Under dette advares der. */
  anbefaletBredde: 1000,
  /**
   * PNG er det, vi anbefaler og bygger flowet omkring. SVG accepteres, fordi
   * det er skalerbart og trykker perfekt.
   *
   * JPEG er BEVIDST IKKE med. Formatet har ingen transparens og lægger
   * komprimeringsartefakter præcis omkring skarpe kanter og tekst — altså dét,
   * et logo består af. Accepterede vi det, ville vi flytte problemet over i en
   * ansvarsfraskrivelse frem for at undgå det.
   */
  typer: ["image/png", "image/svg+xml"] as const,
  typenavne: "PNG eller SVG",
} as const;

export const LOGO_TEKSTER = {
  overskrift: "Upload dit logo",
  hjaelp: "PNG med transparent baggrund anbefales. Maks. 5 MB.",
  anbefaling:
    "For det bedste resultat anbefaler vi et PNG-logo med transparent baggrund.",
  somUploadet: "Logoet printes som udgangspunkt, som du uploader det.",
  baggrundsforbehold:
    "Hvis filen indeholder en hvid eller farvet baggrund, kan denne derfor blive synlig i det færdige print.",
  vikontrollerer:
    "Vi kontrollerer filen inden produktion, men vi kan ikke garantere optimalt resultat ved lav opløsning eller uønsket baggrund.",
  transparentFundet: "Transparent baggrund fundet.",
  fastBaggrund: "Dit logo ser ud til at have en fast baggrund.",
  lavOploesning:
    "Dit logo kan være for lavopløst til optimalt print. Upload gerne en større fil.",
} as const;

export interface PngHoved {
  bredde: number;
  hoejde: number;
  /** Kan filen indeholde gennemsigtighed? Se `laesPngHoved` for hvad det dækker. */
  harAlfa: boolean;
}

const PNG_SIGNATUR = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Læser bredde, højde og transparens ud af en PNG.
 *
 * IHDR er altid den første chunk og ligger på en fast plads, så bredde og
 * højde er to opslag. Transparensen kræver lidt mere:
 *
 *   farvetype 4 og 6  har en alfakanal indbygget
 *   farvetype 0, 2, 3 kan have en tRNS-chunk, der udpeger gennemsigtige farver
 *
 * Derfor gennemløbes chunkene indtil IDAT, hvor billeddataene begynder — tRNS
 * SKAL ligge før den, så der er ingen grund til at læse resten af filen.
 *
 * Returnerer null, hvis det ikke er en PNG. Det er ikke en fejl: en SVG har
 * ingen pixels, og så er der intet at advare om.
 */
export function laesPngHoved(buffer: ArrayBuffer): PngHoved | null {
  const b = new Uint8Array(buffer);
  if (b.length < 33) return null;
  for (let i = 0; i < PNG_SIGNATUR.length; i++) {
    if (b[i] !== PNG_SIGNATUR[i]) return null;
  }

  const visning = new DataView(buffer);
  const bredde = visning.getUint32(16, false);
  const hoejde = visning.getUint32(20, false);
  const farvetype = b[25];

  let harAlfa = farvetype === 4 || farvetype === 6;

  if (!harAlfa) {
    // Chunkene starter efter signaturen (8 bytes). Hver er: længde (4),
    // type (4), data, crc (4).
    let pos = 8;
    while (pos + 8 <= b.length) {
      const laengde = visning.getUint32(pos, false);
      const type = String.fromCharCode(b[pos + 4], b[pos + 5], b[pos + 6], b[pos + 7]);
      if (type === "tRNS") {
        harAlfa = true;
        break;
      }
      if (type === "IDAT" || type === "IEND") break;
      // Et vanvittigt længdefelt i en beskadiget fil må ikke give en evig løkke.
      if (laengde > b.length) break;
      pos += 12 + laengde;
    }
  }

  return { bredde, hoejde, harAlfa };
}

export interface Logofil {
  navn: string;
  type: string;
  storrelse: number;
}

export interface Logokontrol {
  /** Må filen bruges? Falsk betyder afvist, ikke "advarsel". */
  ok: boolean;
  /** Grunden til afvisning. Kun sat når ok er falsk. */
  fejl?: string;
  /** Ting kunden bør vide, men som ikke stopper dem. */
  advarsler: string[];
  /** Sat når filen er en PNG, vi kunne læse. */
  hoved?: PngHoved;
}

/**
 * Kontrollerer en logofil.
 *
 * `hoved` gives med, når kalderen selv har læst PNG'en — så slipper vi for at
 * læse filen to gange, og funktionen forbliver ren og testbar.
 */
export function validerLogo(fil: Logofil, hoved?: PngHoved | null): Logokontrol {
  const advarsler: string[] = [];

  const typeOk = (LOGO_KRAV.typer as readonly string[]).includes(fil.type);
  if (!typeOk) {
    return {
      ok: false,
      advarsler,
      fejl: `Filen skal være ${LOGO_KRAV.typenavne}. ${LOGO_TEKSTER.anbefaling}`,
    };
  }

  if (fil.storrelse > LOGO_KRAV.maksBytes) {
    const mb = (fil.storrelse / 1024 / 1024).toFixed(1).replace(".", ",");
    return {
      ok: false,
      advarsler,
      fejl: `Filen fylder ${mb} MB. Den må højst fylde 5 MB.`,
    };
  }

  if (fil.storrelse === 0) {
    return { ok: false, advarsler, fejl: "Filen er tom." };
  }

  if (hoved) {
    if (hoved.bredde < LOGO_KRAV.minBredde) {
      return {
        ok: false,
        advarsler,
        fejl: `Logoet er kun ${hoved.bredde} px bredt og kan ikke trykkes. Upload en større fil.`,
      };
    }
    if (hoved.bredde < LOGO_KRAV.anbefaletBredde) {
      advarsler.push(LOGO_TEKSTER.lavOploesning);
    }
    advarsler.push(
      hoved.harAlfa ? LOGO_TEKSTER.transparentFundet : LOGO_TEKSTER.fastBaggrund,
    );
  }

  return { ok: true, advarsler, hoved: hoved ?? undefined };
}
