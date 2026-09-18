import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * BADGEN SKAL KUNNE LÆSES — OG DET ER ET TAL, IKKE ET SKØN.
 *
 * Tre af de fem toner satte samme farve som både bund og skrift. En farve på
 * 10-15 % af sig selv er næsten den samme farve, og resultatet var tekst, der
 * ikke kunne læses: MÅLT på /produkter 2026-09-18 stod badgen "På vej" med
 * #f59e0b på #f6e7cc — **1,76:1**, hvor WCAG AA kræver 4,5 for almindelig
 * tekst. Grøn lå på 2,70 og rød på 3,77. Kun accenten (5,47) var i orden.
 *
 * DET KUNNE STÅ, FORDI DET SÅ RIGTIGT UD. Farverne er husets egne, chippen
 * har den rigtige form, og den, der tegnede den, kunne læse den — en gul tekst
 * på gul bund er netop dét, man ikke opdager ved at kigge. Kun en udregning
 * siger fra.
 *
 * PRØVEN REGNER FREM FOR AT GENKENDE EN STRENG. Den læser de faktiske tokens
 * ud af `globals.css` og de faktiske klasser ud af `badge.tsx`, blander
 * chippens alfa ned i den bund, badgen står på, og regner WCAG-forholdet. En
 * prøve, der bare ledte efter "text-star-tekst", ville bestå, hvis nogen
 * gjorde `--star-tekst` lysere igen — altså præcis den ændring, den skal
 * fange.
 *
 * BEGGE BUNDE PRØVES, fordi badgen bruges begge steder: hvide kort og den
 * råhvide flade (pladsholderen bag "Foto på vej" er `bg-muted-bg`). Råhvid er
 * den mørkeste og dermed den, der afgør.
 */

const css = readFileSync("src/app/globals.css", "utf8");
const badge = readFileSync("src/components/ui/badge.tsx", "utf8");

/** Værdien af et token i `:root`. */
function token(navn: string): string {
  const m = new RegExp(`${navn}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!m) throw new Error(`token ${navn} blev ikke fundet i globals.css`);
  return m[1];
}

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

/* WCAG 2.1: relativ luminans og kontrastforhold. */
const kanal = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const luminans = (c: Rgb) =>
  0.2126 * kanal(c[0]) + 0.7152 * kanal(c[1]) + 0.0722 * kanal(c[2]);

function kontrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminans(a), luminans(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Chippens bund lagt oven på den flade, badgen står på. */
const bland = (farve: Rgb, bund: Rgb, alfa: number): Rgb =>
  farve.map((c, i) => Math.round(alfa * c + (1 - alfa) * bund[i])) as Rgb;

/**
 * Tonerne, som de FAKTISK står i komponenten.
 *
 * Klassenavnet er tokenets navn uden `bg-`/`text-`, så `bg-star/15` er
 * `--star` i 15 % og `text-star-tekst` er `--star-tekst`. Læses de ud frem
 * for at skrives af, kan prøven ikke komme i utakt med komponenten.
 */
function toner(): Record<string, { bund: string; alfa: number; tekst: string }> {
  const blok = /const tones: Record<Tone, string> = \{([\s\S]*?)\};/.exec(badge);
  if (!blok) throw new Error("tones-objektet blev ikke fundet i badge.tsx");

  const ud: Record<string, { bund: string; alfa: number; tekst: string }> = {};
  for (const linje of blok[1].matchAll(/(\w+):\s*"([^"]+)"/g)) {
    const klasser = linje[2].split(/\s+/);
    const bg = klasser.find((k) => k.startsWith("bg-"));
    const tekst = klasser.find((k) => k.startsWith("text-"));
    if (!bg || !tekst) throw new Error(`tonen ${linje[1]} mangler bund/tekst`);

    const [navn, procent] = bg.slice("bg-".length).split("/");
    ud[linje[1]] = {
      bund: `--${navn}`,
      alfa: procent ? Number(procent) / 100 : 1,
      tekst: `--${tekst.slice("text-".length)}`,
    };
  }
  return ud;
}

/* De to flader, en badge står på. Råhvid er den mørkeste og afgør. */
const FLADER = [
  ["hvidt kort", "--card"],
  ["råhvid flade", "--muted-bg"],
] as const;

/** WCAG AA for almindelig tekst. Badgen er 12 px og altså ikke "stor tekst". */
const AA = 4.5;

describe("badgens toner kan læses", () => {
  const alle = toner();

  it("der er fundet toner at prøve", () => {
    /* Går parsingen i stykker, må prøven ikke bestå med nul toner. */
    expect(Object.keys(alle).length).toBeGreaterThanOrEqual(5);
  });

  for (const [tone, opskrift] of Object.entries(toner())) {
    for (const [hvor, flade] of FLADER) {
      it(`${tone} klarer ${AA}:1 på ${hvor}`, () => {
        const bund = bland(
          rgb(token(opskrift.bund)),
          rgb(token(flade)),
          opskrift.alfa,
        );
        const forhold = kontrast(rgb(token(opskrift.tekst)), bund);
        expect(
          Number(forhold.toFixed(2)),
          `${tone} på ${hvor}: ${token(opskrift.tekst)} på ${forhold.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(AA);
      });
    }
  }

  /*
   * OG SIGNALFARVERNE SELV MÅ IKKE BLIVE MØRKERE FOR AT LØSE DET.
   * `--star` tegner stjernerne på anmeldelseskortene, og `--success`/
   * `--danger` er fyld og streger 100+ steder. Rettelsen ligger i egne
   * teksttokens netop for ikke at flytte dem; bliver de en dag ét og samme
   * token igen, er vi tilbage ved 1,76.
   */
  it("teksttokens er noget andet end fladefarverne", () => {
    for (const [flad, tekst] of [
      ["--star", "--star-tekst"],
      ["--success", "--success-tekst"],
      ["--danger", "--danger-tekst"],
    ]) {
      expect(token(tekst), `${tekst} er sin egen farve`).not.toBe(token(flad));
    }
  });
});
