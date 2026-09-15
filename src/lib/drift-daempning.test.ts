import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * DÆMPNINGEN AF ALARMER — DEN PÅSTAND, DER SKAL VÆRE SAND.
 *
 * `drift.ts` har altid båret begrundelsen: dæmpningen ligger i DATABASEN og
 * ikke i en variabel, fordi en serverfunktion kører i mange eksemplarer, og
 * "en fejl, der rammer hundrede gange på et minut, ville blive til hundrede
 * mails".
 *
 * Den var lavet som et OPSLAG efterfulgt af en indsættelse, og det er ikke det
 * samme. **Målt 2026-09-15: ti samtidige fejl i samme opgave gav ti mails.**
 * Tre fejl EFTER hinanden gav nul ekstra — dæmpningen virkede altså
 * upåklageligt i det almindelige tilfælde, og det er derfor fejlen kunne stå.
 *
 * Kildeprøver: den atomiske afgørelse ligger i én SQL-sætning, som ikke kan
 * kaldes uden en database, og det, der skal fanges, er ikke en forkert
 * beregning — det er en spærring, nogen fjerner, fordi den ser overflødig ud.
 */

const MIGRATIONER = "supabase/migrations";

function kilde(sti: string): string {
  return readFileSync(join(process.cwd(), sti), "utf8");
}

function alleMigrationer(): string {
  return readdirSync(MIGRATIONER)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => kilde(`${MIGRATIONER}/${f}`))
    .join("\n");
}

describe("kun én alarm pr. opgave pr. vindue — afgjort af basen", () => {
  const sql = alleMigrationer();

  /**
   * `on conflict do update ... where` er HELE kuren: PostgreSQL låser rækken,
   * prøver betingelsen mod den gemte værdi, og præcis ét samtidigt kald får en
   * række tilbage. Et `select` efterfulgt af et `insert` ville se ens ud i en
   * rolig stund og fejle præcis, når det gælder.
   */
  it("maa_alarmere afgør det i én sætning", () => {
    const i = sql.indexOf("function public.maa_alarmere");
    expect(i, "maa_alarmere findes ikke i nogen migration").toBeGreaterThan(-1);
    const krop = sql.slice(i, i + 900);
    expect(krop).toMatch(/on\s+conflict\s*\(\s*opgave\s*\)\s*do\s+update/i);
    expect(krop).toMatch(/where\s+alarm_daempning\.sidst_alarmeret\s*</i);
    expect(krop).toMatch(/returning\s+true/i);
  });

  /**
   * VINDUET SKAL VÆRE EN PARAMETER. Stod tallet i SQL'en, ville
   * `DAEMPNING_MINUTTER` i drift.ts kunne ændres, uden at noget som helst
   * skete — og de to ville sige hver sit uden at nogen opdagede det.
   */
  it("vinduet kommer fra kalderen og står ikke i SQL'en", () => {
    const i = sql.indexOf("function public.maa_alarmere");
    const krop = sql.slice(i, i + 900);
    expect(krop).toContain("p_minutter");
    expect(krop).not.toMatch(/interval\s+'\d+\s*min/i);
  });

  /** Tabellen er en spærre og ikke en log — den må ikke samle på noget. */
  it("dæmpningstabellen har én række pr. opgave og intet indhold", () => {
    const i = sql.indexOf("table if not exists public.alarm_daempning");
    expect(i).toBeGreaterThan(-1);
    const krop = sql.slice(i, sql.indexOf(");", i));
    expect(krop).toMatch(/opgave\s+text\s+primary\s+key/i);
    // Ingen besked, ingen persondata, intet company_id.
    expect(krop).not.toMatch(/besked|email|navn|company_id/i);
  });
});

describe("drift.ts bruger den — og kan stå i drift uden den", () => {
  const src = kilde("src/lib/drift.ts");

  it("spørger maa_alarmere frem for at tælle linjer", () => {
    expect(src).toContain('rpc("maa_alarmere"');
  });

  /**
   * MIGRATIONER KØRES I HÅNDEN. Koden skal derfor kunne deployes, før 0039 er
   * kørt — falder den ikke tilbage, ville hver eneste fejl enten alarmere
   * eller slet ikke alarmere i mellemtiden. Den gamle tælling dæmper korrekt
   * sekventielt; den er svagere, ikke forkert.
   */
  it("falder tilbage på tællingen, hvis funktionen ikke findes", () => {
    const i = src.indexOf("async function maaAlarmere");
    const krop = src.slice(i, src.indexOf("\n}", i));
    expect(krop).toMatch(/if\s*\(!error\)\s*return/);
    expect(krop).toContain("drift_log");
  });

  /**
   * FEJLEN SKRIVES ALTID. Det er kun MAILEN, der holdes tilbage — ellers ville
   * en dæmpet fejl forsvinde helt, og så er stilhed igen det samme som succes.
   */
  it("skriver linjen i driftsloggen uanset om der blev alarmeret", () => {
    const i = src.indexOf("export async function noterFejl");
    const krop = src.slice(i, src.indexOf("\n}", src.indexOf("catch (err)", i)));
    const indsaet = krop.indexOf('.insert({ opgave, ok: false');
    expect(indsaet).toBeGreaterThan(-1);
    // Indsættelsen må ikke ligge inde i en gren, der kun køres ved alarm.
    expect(krop.slice(0, indsaet)).not.toMatch(/if\s*\(skalAlarmere\)\s*\{/);
  });
});
