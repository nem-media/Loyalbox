import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * TO DUBLETTER MERE — KUNDENS KORT OG STEMPELKORTETS BELØNNING.
 *
 * Fundet ved en fejning EFTER gennemgangen: mønsteret "læs-så-skriv uden en
 * vagt" gav fjorten kandidater, og disse to var ægte. Begge lå i områder, der
 * ikke var blevet kigget på — præcis som `redeemDiscount` i 0041. Det er
 * samme lektie tredje gang: en områdeopdeling efterlader identiske fejl lige
 * ved siden af.
 *
 * MÅLT PÅ DEMODATA 2026-09-16:
 *
 *  1. To samtidige tilmeldinger med SAMME e-mail gav **to kort med hver sit
 *     token**. Kunden står med to, og kun det ene kan findes igen: både
 *     `selfEnroll` og `/kort/find` slår op med `limit(1)` og rammer vilkårligt
 *     det ene. Stemplerne fordeler sig så på to kort.
 *
 *  2. To samtidige redigeringer af samme stempelkort gav **to primære
 *     belønninger** — og det er værre, end det lyder. `giveStamp()` slår den
 *     primære op med `.maybeSingle()`, og med to rækker svarer PostgREST
 *     **406/PGRST116**. Fejlen blev slugt, `reward` blev null, og der blev
 *     ALDRIG udstedt en belønning igen. Butikkens stempelkort holdt op med at
 *     virke, uden at noget fejlede nogen steder.
 */

const MIGRATIONER = "supabase/migrations";

const udenKommentarer = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/^\s*--.*$/gm, "");

const ALLE_SQL = readdirSync(MIGRATIONER)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => udenKommentarer(readFileSync(join(MIGRATIONER, f), "utf8")))
  .join("\n");

const kilde = (sti: string) =>
  udenKommentarer(readFileSync(join(process.cwd(), sti), "utf8"));

describe("ét kort pr. kunde pr. butik", () => {
  it("unikke indekser på e-mail og telefon", () => {
    for (const felt of ["email", "phone"]) {
      expect(
        ALLE_SQL,
        `mangler unikt indeks på (company_id, ${felt})`,
      ).toMatch(
        new RegExp(
          `create\\s+unique\\s+index[^;]*?on\\s+public\\.loyalty_members\\s*\\(\\s*company_id,\\s*${felt}\\s*\\)\\s*where\\s+${felt}\\s+is\\s+not\\s+null`,
          "i",
        ),
      );
    }
  });

  /**
   * `where ... is not null` er nødvendigt: en kunde må gerne oprettes med kun
   * et telefonnummer, og så er e-mailen tom. Uden filteret ville det andet
   * tomme felt kollidere med det første, og anden kunde uden e-mail kunne
   * ikke oprettes.
   */
  it("indekserne rammer kun udfyldte felter", () => {
    const uden =
      /create\s+unique\s+index[^;]*?on\s+public\.loyalty_members\s*\([^)]*\)\s*;/i;
    expect(ALLE_SQL).not.toMatch(uden);
  });

  it("selfEnroll tager imod en tabt kapløbsindsættelse", () => {
    const k = kilde("src/app/kort/actions.ts");
    const i = k.indexOf("export async function selfEnroll");
    const krop = k.slice(i, k.indexOf("\nexport ", i + 10));
    expect(krop).toContain("23505");
    // ...og bruger så det kort, den anden anmodning oprettede.
    expect(krop).toMatch(/vandt/);
  });

  /** `unique (program_id, member_id)` fandtes; svaret blev bare ikke set på. */
  it("medlemskabets dublet sluges, men andre fejl gør ikke", () => {
    const k = kilde("src/app/kort/actions.ts");
    const m = /from\("loyalty_memberships"\)\s*\.insert\(/.exec(k);
    expect(m, "indsættelsen af medlemskabet findes ikke").not.toBeNull();
    expect(k.slice(m!.index, m!.index + 600)).toMatch(
      /msFejl\.code !== "23505"/,
    );
  });
});

describe("én primær belønning pr. program", () => {
  it("et partielt unikt indeks håndhæver det", () => {
    expect(ALLE_SQL).toMatch(
      /create\s+unique\s+index[^;]*?on\s+public\.loyalty_rewards\s*\(\s*program_id\s*\)\s*where\s+is_primary/i,
    );
  });

  /**
   * Indekset må IKKE også filtrere på `status = 'active'`: en arkiveret primær
   * skal tælle med, ellers kan "slå belønningen fra" og "til igen" ende med to
   * rækker — og dét er netop den vej, `rewardType === "none"` går.
   */
  it("indekset ser også arkiverede primære", () => {
    const m = /create\s+unique\s+index[^;]*?loyalty_rewards\s*\(\s*program_id\s*\)\s*where\s+([^;]+);/i.exec(
      ALLE_SQL,
    );
    expect(m).not.toBeNull();
    expect(m![1]).not.toMatch(/status/i);
  });

  it("updateProgram opdaterer i stedet, når kapløbet tabes", () => {
    const k = kilde("src/app/dashboard/loyalitet/actions.ts");
    const i = k.indexOf("const rewardFelter");
    const krop = k.slice(i, i + 2200);
    expect(krop).toContain("23505");
    expect(krop).toMatch(/\.update\(rewardFelter\)/);
  });
});

describe("giveStamp sluger ikke fejlen på belønningsopslaget", () => {
  /**
   * DET VAR DÉT, DER GJORDE DUBLETTEN FARLIG. `maybeSingle()` svarer 406 ved
   * mere end én række; blev svaret ikke set på, blev `reward` bare null, og
   * ingen belønning blev udstedt — uden at noget fejlede.
   */
  it("læser fejlen og siger fra", () => {
    const k = kilde("src/lib/loyalty/service.ts");
    const i = k.indexOf('.eq("is_primary", true)');
    const krop = k.slice(Math.max(0, i - 400), i + 900);
    expect(krop).toMatch(/error:\s*rewardErr/);
    expect(krop).toMatch(/if \(rewardErr\)/);
    expect(krop).toContain("noterFejl");
  });
});
