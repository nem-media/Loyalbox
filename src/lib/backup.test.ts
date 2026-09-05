import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * BACKUPPEN SKAL KENDE HVER TABEL, DER FINDES.
 *
 * `TABELLER` i `scripts/backup.mjs` er en håndskrevet liste, og en migration,
 * der tilføjer en tabel, glemmer den. Det ER sket: `designs`, `admin_log`,
 * `eksterne_profiler`, `omdoemme_snapshots` og `subscriptions` stod udenfor,
 * mens eksporten meldte "Færdig" hver eneste gang.
 *
 * `designs` var den dyre. `orders.design_id` peger på den, så en gendannelse
 * ville have afvist HVER ENESTE ordre på en fremmednøgle — backuppen så
 * komplet ud og kunne ikke lægges tilbage. Det er samme klasse fejl som
 * logo-listningen, der stille hentede nul filer: den farlige backup er ikke
 * den, der fejler, men den, der lyver.
 *
 * Selve scriptet spørger OGSÅ basen ved hver kørsel og advarer. Prøven her
 * findes, fordi den advarsel først kommer, når nogen husker at køre en backup
 * — og det er typisk den dag, den skal bruges. Der læses i migrationerne, så
 * kontrollen virker uden netværk og uden nøgler.
 */

const ROD = process.cwd();

/** Tabelnavnene fra `create table`-sætningerne i alle migrationer. */
function tabellerIMigrationer(): Set<string> {
  const mappe = join(ROD, "supabase/migrations");
  const fundne = new Set<string>();
  for (const fil of readdirSync(mappe).filter((f) => f.endsWith(".sql"))) {
    const sql = readFileSync(join(mappe, fil), "utf8");
    for (const m of sql.matchAll(
      /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_]+)/gi,
    )) {
      fundne.add(m[1]);
    }
  }
  return fundne;
}

/** Listen, backup-scriptet rent faktisk kører igennem. */
function tabellerIBackup(): string[] {
  const src = readFileSync(join(ROD, "scripts/backup.mjs"), "utf8");
  // [\s\S] frem for flaget `s`: tsconfig'ens mål er ældre end es2018.
  const blok = src.match(/const TABELLER = \[([\s\S]*?)\];/);
  if (!blok) throw new Error("TABELLER blev ikke fundet i scripts/backup.mjs");
  return [...blok[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
}

describe("backuppen dækker hele databasen", () => {
  it("hver tabel fra migrationerne står i TABELLER", () => {
    const liste = tabellerIBackup();
    const mangler = [...tabellerIMigrationer()].filter((t) => !liste.includes(t));
    expect(
      mangler,
      `Disse tabeller bliver ikke eksporteret: ${mangler.join(", ")}. ` +
        `Skriv dem ind i TABELLER i scripts/backup.mjs — og læg dem det rigtige ` +
        `sted i rækkefølgen, jf. deres fremmednøgler.`,
    ).toEqual([]);
  });

  /** Står den samme tabel to gange, eksporteres den to gange og tælles dobbelt. */
  it("ingen tabel står to gange", () => {
    const liste = tabellerIBackup();
    expect(new Set(liste).size).toBe(liste.length);
  });

  /**
   * RÆKKEFØLGEN ER IKKE PYNT — den er dét, der afgør, om en gendannelse går
   * igennem. `orders.design_id` peger på `designs`, så designene skal ind
   * først. Netop den her var forkert, fordi `designs` slet ikke var med.
   */
  it("designs kommer før orders", () => {
    const liste = tabellerIBackup();
    expect(liste.indexOf("designs")).toBeGreaterThanOrEqual(0);
    expect(liste.indexOf("designs")).toBeLessThan(liste.indexOf("orders"));
  });

  /** Alt, der peger på en virksomhed, skal ligge efter companies. */
  it("companies kommer før alt, der hænger på den", () => {
    const liste = tabellerIBackup();
    const companies = liste.indexOf("companies");
    for (const t of [
      "stands",
      "designs",
      "orders",
      "employees",
      "feedback",
      "subscriptions",
      "eksterne_profiler",
      "omdoemme_snapshots",
      "admin_log",
    ]) {
      expect(liste.indexOf(t), `${t} skal ligge efter companies`).toBeGreaterThan(
        companies,
      );
    }
  });

  /**
   * Kontrollen inde i scriptet må ikke forsvinde: uden den kan en ny tabel
   * ligge uden for både listen OG denne prøve, hvis nogen sletter migrationen
   * eller opretter tabellen i hånden.
   */
  it("scriptet spørger selv basen om, hvilke tabeller der findes", () => {
    const src = readFileSync(join(ROD, "scripts/backup.mjs"), "utf8");
    expect(src).toContain("hentTabelnavne");
    expect(src).toMatch(/process\.exit\(1\)/);
  });
});
