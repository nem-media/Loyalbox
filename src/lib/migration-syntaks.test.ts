import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

/**
 * DOLLAR-CITATERNE I MIGRATIONERNE SKAL GÅ OP.
 *
 * MIGRATIONER KØRES I HÅNDEN i Supabase → SQL Editor, og der er ingen
 * oversætter mellem den, der skriver dem, og den, der kører dem. En funktion,
 * hvis krop begynder med `as $$` og slutter med `$;`, er ikke gyldig
 * PL/pgSQL — men det ses ikke ved at læse filen, og fejlen dukker først op
 * som en rød besked i en browser hos brugeren.
 *
 * DET SKETE 2026-09-18 under pointprogrammet, og årsagen er værd at kende:
 * `String.prototype.replace()` behandler `$$` i ERSTATNINGEN som et escape
 * for ét dollartegn. Et script, der indsatte en SQL-funktion med `replace`,
 * skrev derfor `as $ … end; $;` ud i filen, uden at noget fejlede undervejs.
 * Samme klasse fælde som CRLF og som `useId()`: et værktøj, der gør noget
 * fornuftigt med tegn, der tilfældigvis betyder noget andet i SQL.
 *
 * Prøven er billig og dækker ALLE migrationer, også dem der skrives i morgen.
 */

const MAPPE = "supabase/migrations";

function migrationer(): { navn: string; sql: string }[] {
  return readdirSync(MAPPE)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((navn) => ({ navn, sql: readFileSync(`${MAPPE}/${navn}`, "utf8") }));
}

describe("migrationernes dollar-citater", () => {
  it("hver fil har et lige antal `$$`", () => {
    const skæve: string[] = [];
    for (const { navn, sql } of migrationer()) {
      const antal = (sql.match(/\$\$/g) ?? []).length;
      if (antal % 2 !== 0) skæve.push(`${navn} (${antal})`);
    }
    expect(
      skæve,
      "et ulige antal betyder, at en funktionskrop enten ikke er åbnet eller ikke lukket",
    ).toEqual([]);
  });

  /*
   * ET ENKELT DOLLARTEGN EFTER `as` ER ALTID EN FEJL. Postgres tillader nok
   * navngivne citater (`as $krop$`), men dem bruger dette projekt ikke, og et
   * `as $` alene er præcis det aftryk, en ødelagt erstatning efterlader.
   */
  it("ingen funktion åbnes med et enkelt dollartegn", () => {
    const fund: string[] = [];
    for (const { navn, sql } of migrationer()) {
      const linjer = sql.split(/\r?\n/);
      linjer.forEach((linje, i) => {
        if (/^\s*as\s*\$\s*$/.test(linje)) fund.push(`${navn}:${i + 1}`);
        // `end; $;` — afslutningen på en ødelagt krop.
        if (/^\s*\$;\s*$/.test(linje)) fund.push(`${navn}:${i + 1}`);
      });
    }
    expect(fund, "et `$` hvor der skulle stå `$$` gør SQL'en ugyldig").toEqual([]);
  });

  /*
   * HVER `create or replace function` SKAL HAVE EN KROP. Uden denne linje
   * ville en fil, hvor hele kroppen var faldet ud, stadig bestå prøven
   * ovenfor — nul dollartegn er også et lige antal.
   */
  it("hver funktion har en krop mellem to dollar-citater", () => {
    const mangler: string[] = [];
    for (const { navn, sql } of migrationer()) {
      const funktioner = (sql.match(/create or replace function/g) ?? []).length;
      if (funktioner === 0) continue;
      const kroppe = (sql.match(/\n\s*as\s*\$\$/g) ?? []).length;
      if (kroppe < funktioner) {
        mangler.push(`${navn}: ${funktioner} funktioner, ${kroppe} kroppe`);
      }
    }
    expect(mangler).toEqual([]);
  });
});
