import { describe, it, expect } from "vitest";
import {
  LOGO_KRAV,
  LOGO_TEKSTER,
  laesPngHoved,
  validerLogo,
  type Logofil,
} from "./logo";

/**
 * Bygger en PNG med netop det hoved, en test har brug for.
 *
 * CRC-felterne udfyldes ikke — `laesPngHoved` kontrollerer dem ikke, og skulle
 * den en dag begynde på det, ville disse tests fejle højlydt frem for stille
 * at lade en beskadiget fil slippe igennem.
 */
function png({
  bredde = 1200,
  hoejde = 400,
  farvetype = 6,
  tRNS = false,
  efterIDAT = false,
}: {
  bredde?: number;
  hoejde?: number;
  /** 0 grå · 2 RGB · 3 palet · 4 grå+alfa · 6 RGBA */
  farvetype?: number;
  tRNS?: boolean;
  /** Læg tRNS EFTER IDAT — dér hvor den ikke må stå, og ikke må findes. */
  efterIDAT?: boolean;
}): ArrayBuffer {
  const chunks: number[][] = [];

  const chunk = (type: string, data: number[]) => [
    ...tal32(data.length),
    ...[...type].map((c) => c.charCodeAt(0)),
    ...data,
    0, 0, 0, 0, // crc, ikke udfyldt
  ];

  const ihdr = [
    ...tal32(bredde),
    ...tal32(hoejde),
    8, // bitdybde
    farvetype,
    0, 0, 0, // komprimering, filter, interlace
  ];
  chunks.push(chunk("IHDR", ihdr));

  if (tRNS && !efterIDAT) chunks.push(chunk("tRNS", [0, 0, 0]));
  chunks.push(chunk("IDAT", [0, 0, 0, 0]));
  if (tRNS && efterIDAT) chunks.push(chunk("tRNS", [0, 0, 0]));
  chunks.push(chunk("IEND", []));

  const bytes = [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...chunks.flat(),
  ];
  return new Uint8Array(bytes).buffer;
}

function tal32(n: number): number[] {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}

function fil(over: Partial<Logofil> = {}): Logofil {
  return { navn: "logo.png", type: "image/png", storrelse: 120_000, ...over };
}

describe("læsning af PNG-hovedet", () => {
  it("finder bredde og højde", () => {
    const h = laesPngHoved(png({ bredde: 1234, hoejde: 567 }));
    expect(h).toEqual({ bredde: 1234, hoejde: 567, harAlfa: true });
  });

  it("kender de farvetyper, der har alfa indbygget", () => {
    expect(laesPngHoved(png({ farvetype: 6 }))?.harAlfa).toBe(true); // RGBA
    expect(laesPngHoved(png({ farvetype: 4 }))?.harAlfa).toBe(true); // grå+alfa
    expect(laesPngHoved(png({ farvetype: 2 }))?.harAlfa).toBe(false); // RGB
    expect(laesPngHoved(png({ farvetype: 0 }))?.harAlfa).toBe(false); // grå
  });

  it("finder transparens i en palet-PNG via tRNS", () => {
    // Den hyppigste transparente PNG fra et designprogram er farvetype 3 med
    // tRNS. Ledte vi kun efter farvetype 4 og 6, ville vi kalde den fast.
    expect(laesPngHoved(png({ farvetype: 3, tRNS: true }))?.harAlfa).toBe(true);
    expect(laesPngHoved(png({ farvetype: 3 }))?.harAlfa).toBe(false);
  });

  it("leder ikke efter tRNS efter IDAT", () => {
    // tRNS SKAL ligge før billeddataene. Stopper vi ikke ved IDAT, læser vi
    // hele filen igennem for ingenting — og på en 5 MB fil mærkes det.
    expect(laesPngHoved(png({ farvetype: 3, tRNS: true, efterIDAT: true }))?.harAlfa)
      .toBe(false);
  });

  it("svarer null på noget, der ikke er en PNG", () => {
    expect(laesPngHoved(new Uint8Array([1, 2, 3]).buffer)).toBeNull();
    // En SVG har ingen pixels — det er ikke en fejl, der er bare intet at måle.
    expect(laesPngHoved(new TextEncoder().encode("<svg/>").buffer)).toBeNull();
  });
});

describe("kontrol af logofilen", () => {
  it("godtager en stor transparent PNG uden advarsler om opløsning", () => {
    const k = validerLogo(fil(), laesPngHoved(png({ bredde: 1200 })));
    expect(k.ok).toBe(true);
    expect(k.advarsler).toContain(LOGO_TEKSTER.transparentFundet);
    expect(k.advarsler).not.toContain(LOGO_TEKSTER.lavOploesning);
  });

  it("advarer om lav opløsning uden at blokere", () => {
    const k = validerLogo(fil(), laesPngHoved(png({ bredde: 600 })));
    expect(k.ok).toBe(true);
    expect(k.advarsler).toContain(LOGO_TEKSTER.lavOploesning);
  });

  it("siger til, når baggrunden er fast — men trykker den alligevel", () => {
    const k = validerLogo(fil(), laesPngHoved(png({ farvetype: 2 })));
    expect(k.ok).toBe(true);
    expect(k.advarsler).toContain(LOGO_TEKSTER.fastBaggrund);
  });

  it("afviser det åbenlyst ubrugelige", () => {
    const bitte = validerLogo(fil(), laesPngHoved(png({ bredde: 64 })));
    expect(bitte.ok).toBe(false);
    expect(bitte.fejl).toContain("64 px");
  });

  it("afviser filer over 5 MB", () => {
    const k = validerLogo(fil({ storrelse: LOGO_KRAV.maksBytes + 1 }));
    expect(k.ok).toBe(false);
    expect(k.fejl).toContain("5 MB");
  });

  it("godtager præcis 5 MB", () => {
    expect(validerLogo(fil({ storrelse: LOGO_KRAV.maksBytes })).ok).toBe(true);
  });

  it("afviser en tom fil", () => {
    expect(validerLogo(fil({ storrelse: 0 })).ok).toBe(false);
  });

  it("afviser JPEG", () => {
    // Ikke en forglemmelse: JPEG har ingen transparens og lægger artefakter
    // omkring skarpe kanter og tekst — altså dét, et logo består af.
    const k = validerLogo(fil({ navn: "logo.jpg", type: "image/jpeg" }));
    expect(k.ok).toBe(false);
    expect(k.fejl).toContain("PNG eller SVG");
  });

  it("godtager SVG uden at måle pixels", () => {
    const k = validerLogo(
      fil({ navn: "logo.svg", type: "image/svg+xml", storrelse: 4_000 }),
      null,
    );
    expect(k.ok).toBe(true);
    expect(k.advarsler).toHaveLength(0);
  });
});
