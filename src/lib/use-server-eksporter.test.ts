import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * EN "use server"-FIL MÅ KUN EKSPORTERE ASYNKRONE FUNKTIONER.
 *
 * Alt andet — en konstant, en streng, et objekt — får Next til at kaste ved
 * MODULINDLÆSNINGEN: "A \"use server\" file can only export async functions,
 * found string." Hele modulet fejler, og dermed hver eneste handling i filen.
 *
 * Det er en ondskabsfuld fejl, fordi den er usynlig indtil produktion:
 * `tsc`, eslint og `next build` går alle igennem, og siden med formularen
 * bliver ved med at loade. Først når nogen TRYKKER, fejler POST'en, og
 * brugeren får en tom fejlside uden besked.
 *
 * Sådan var det gået her: en ubrugt `export const LOGO_ACCEPT = …join(",")`
 * lå i bestillingen uden konto fra PR #90 og lukkede for hvert eneste køb
 * uden konto, uden at noget slog ud. Filtypelisten stod i forvejen inline i
 * `logo-felt.tsx`, så konstanten blev aldrig importeret af nogen.
 *
 * Testen læser filerne som TEKST og kører dem ikke: en import ville trække
 * `server-only` og databaseklienter med ind i testmiljøet.
 */

function filer(mappe: string): string[] {
  return readdirSync(mappe).flatMap((navn) => {
    const sti = join(mappe, navn);
    if (statSync(sti).isDirectory()) return filer(sti);
    return /\.tsx?$/.test(navn) ? [sti] : [];
  });
}

/** Direktivet skal stå ØVERST for at gælde hele filen. */
function erServerfil(kilde: string): boolean {
  return /^\s*["']use server["'];/.test(kilde);
}

/**
 * Kun eksporter på yderste niveau tæller — derfor `^export` uden indrykning.
 * Typer og grænseflader forsvinder ved oversættelsen og er altså ikke
 * eksporter i den forstand, Next taler om.
 */
const TILLADT = /^export\s+(async\s+function|type\s|interface\s)/;

describe('"use server"-filer', () => {
  const serverfiler = filer(join(process.cwd(), "src"))
    .map((sti) => [sti, readFileSync(sti, "utf8")] as const)
    .filter(([, kilde]) => erServerfil(kilde));

  it("findes — ellers tester vi ingenting", () => {
    expect(serverfiler.length).toBeGreaterThan(5);
  });

  it("eksporterer kun asynkrone funktioner", () => {
    const ulovlige: string[] = [];

    for (const [sti, kilde] of serverfiler) {
      kilde.split("\n").forEach((linje, i) => {
        if (!linje.startsWith("export ")) return;
        if (TILLADT.test(linje)) return;
        ulovlige.push(`${sti.replace(process.cwd(), "")}:${i + 1}  ${linje.trim()}`);
      });
    }

    expect(ulovlige).toEqual([]);
  });
});
