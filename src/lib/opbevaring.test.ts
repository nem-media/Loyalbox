import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { FRISTER } from "./opbevaring";

/**
 * Fristerne står to steder: i FRISTER, som er dét kunderne får at se, og i
 * SQL'en, som er dét der faktisk sletter. Testen holder dem op mod hinanden,
 * for driver de fra hinanden, lover privatlivspolitikken noget andet, end
 * systemet gør — og et brudt løfte i et juridisk dokument er værre end slet
 * ingen frist.
 *
 * ALLE migrationer læses, ikke en fast liste. En funktion kan blive erstattet
 * i en senere migration — 0017 erstatter fx 0014's oprydning — og en frist,
 * der flyttede med, må ikke kunne forsvinde ud af tilsynet på vejen.
 */
const MAPPE = "supabase/migrations";
const FILER = readdirSync(MAPPE)
  .filter((f) => f.endsWith(".sql"))
  .sort();
const SQL = FILER.map((f) => readFileSync(`${MAPPE}/${f}`, "utf8")).join("\n");

/** `frist_feedback_navn constant interval := '12 months';` → navn og værdi. */
function fristerISql(): Map<string, string> {
  const fundet = new Map<string, string>();
  const udtryk = /(frist_\w+)\s+constant\s+interval\s*:=\s*'([^']+)'/g;
  for (const m of SQL.matchAll(udtryk)) fundet.set(m[1], m[2]);
  return fundet;
}

describe("opbevaringsfrister", () => {
  it("har samme frister i SQL og i det kunderne får at se", () => {
    const sql = fristerISql();
    const vist = new Map(
      FRISTER.filter((f) => f.sql).map((f) => [f.sql!, f.interval]),
    );

    expect(sql.size).toBeGreaterThan(0);
    expect([...vist.keys()].sort()).toEqual([...sql.keys()].sort());

    for (const [navn, interval] of sql) {
      expect(vist.get(navn), `${navn} er ikke den samme to steder`).toBe(
        interval,
      );
    }
  });

  it("bruger samme værdi for en frist, uanset hvilken migration den står i", () => {
    // En funktion, der erstattes i en senere migration, tager sine
    // frist-konstanter med. Skrives et andet tal dér, ville systemet slette
    // efter én frist, mens dokumenterne lovede en anden — og Map'en ovenfor
    // ville stille lade den sidste vinde.
    const udtryk = /(frist_\w+)\s+constant\s+interval\s*:=\s*'([^']+)'/g;
    const set = new Map<string, Set<string>>();
    for (const [, navn, vaerdi] of SQL.matchAll(udtryk)) {
      if (!set.has(navn)) set.set(navn, new Set());
      set.get(navn)!.add(vaerdi);
    }
    for (const [navn, vaerdier] of set) {
      expect(
        [...vaerdier],
        `${navn} har forskellige værdier i forskellige migrationer`,
      ).toHaveLength(1);
    }
  });

  it("forklarer hvorfor, når der ikke er nogen frist", () => {
    for (const f of FRISTER.filter((f) => f.interval === null)) {
      expect(f.sql, `${f.hvad} har ingen frist og hører ikke til i SQL'en`)
        .toBeUndefined();
      expect(f.hvorfor.length, `${f.hvad} mangler en begrundelse`)
        .toBeGreaterThan(20);
    }
  });

  it("beskriver hver frist i et sprog en butiksejer forstår", () => {
    for (const f of FRISTER) {
      expect(f.hvad.length).toBeGreaterThan(3);
      expect(f.naar.length).toBeGreaterThan(3);
      expect(f.hvorfor).not.toMatch(/null|undefined|TODO/i);
    }
  });
});
