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

/**
 * Den SENESTE definition af oprydningen — ikke den første, der nævner navnet.
 *
 * Ankret er `create or replace function` og ikke bare navnet: `revoke all on
 * function public.<navn>` og `comment on function public.<navn>` matcher også
 * en søgning på navnet, og dengang 0043 gav en funktion sine rettigheder, blev
 * revoke-linjen dermed "definitionen" for tre andre prøver — som så faldt på en
 * fil uden en eneste linje af funktionens krop.
 */
function senesteOprydning(): string {
  let fundet = "";
  for (const f of FILER) {
    const tekst = readFileSync(`${MAPPE}/${f}`, "utf8");
    const i = tekst.indexOf(
      "create or replace function public.ryd_op_efter_frister",
    );
    if (i !== -1) fundet = tekst.slice(i);
  }
  if (!fundet) throw new Error("ryd_op_efter_frister findes ikke");
  return fundet;
}

describe("et medlem er aktivt, hvis det samler point", () => {
  /*
   * FEJLEN, DER BLEV RETTET I 0046. "Sidste aktivitet" blev regnet som den
   * seneste af fem datoer — oprettelsen, stempler, medlemskaber, belønninger
   * og rabatter — og alle fem hører til STEMPELKORTET. Pointprogrammet kom
   * til i 0044 med sine egne tabeller, og ingen af dem blev talt med.
   *
   * En butik, der kun kører pointprogram, har medlemmer uden en eneste række
   * i de fem kilder. For dem var "sidste aktivitet" lig med `created_at`, og
   * 24 måneder efter tilmeldingen blev de slettet — midt i et aktivt
   * kundeforhold, og med saldoen med sig, fordi kontoen hænger på medlemmet
   * med `on delete cascade`.
   *
   * Prøven læser den SENESTE definition, så en fremtidig erstatning af
   * funktionen ikke kan tabe de to kilder igen.
   */
  it("tæller pointledgeren og pointkontoen som aktivitet", () => {
    const sql = senesteOprydning();
    const vindue = sql.slice(
      sql.indexOf("with sidste_aktivitet"),
      sql.indexOf("into inaktive"),
    );
    expect(vindue.length, "sidste_aktivitet blev ikke fundet").toBeGreaterThan(0);
    expect(vindue).toContain("loyalty_point_transactions");
    expect(vindue).toContain("loyalty_point_accounts");
  });

  it("har stadig stempelkortets egne kilder med", () => {
    /* Rettelsen må ikke have byttet den ene halvdel ud med den anden. */
    const sql = senesteOprydning();
    const vindue = sql.slice(
      sql.indexOf("with sidste_aktivitet"),
      sql.indexOf("into inaktive"),
    );
    for (const tabel of [
      "loyalty_transactions",
      "loyalty_memberships",
      "customer_rewards",
      "customer_discounts",
    ]) {
      expect(vindue, `${tabel} mangler`).toContain(tabel);
    }
  });
});

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
