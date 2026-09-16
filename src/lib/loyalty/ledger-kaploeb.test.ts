import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * TILBAGEFØRSEL OG RABATTER — DE TRE, DER IKKE BLEV KIGGET PÅ.
 *
 * Da stempling og indløsning blev rettet (0038), lå `reverseStamp()`,
 * `grantDiscount()` og `redeemDiscount()` uden for dét, der blev gennemgået.
 * De havde heller ikke ÉN eneste prøve — og alle tre bar samme fejl:
 *
 *  1. **Tilbageførslen.** To samtidige tilbageførsler af samme stempel gav to
 *     negative rækker; saldoen endte på **-5** i stedet for 0. Kunden mister
 *     stempler, hun har optjent, og kan ikke se hvorfor.
 *  2. **Rabatgrænserne.** Med en samlet grænse på ÉN blev der udstedt **tre**
 *     rabatter. `total_limit` er en kampagnes budget: hver overskridelse er en
 *     vare, butikken giver væk uden at have regnet med det.
 *  3. **Rabatindløsningen.** To samtidige indløsninger fik **begge** grønt lys
 *     — to ekspedienter ved hver sin kasse giver samme rabat to gange. Det er
 *     nøjagtig den fejl, `redeemReward()` fik rettet.
 *
 * TO FORSKELLIGE KURE, FORDI PROBLEMERNE ER FORSKELLIGE. En tilbageførsel er
 * en ENTYDIGHED og kan bæres af et partielt unikt indeks. En grænse er en
 * TÆLLING, og den kan intet indeks udtrykke — derfor en funktion, der låser
 * rabatrækken, tæller og indsætter i samme transaktion.
 *
 * Kildeprøverne læser UDEN kommentarer: filerne citerer med vilje den kode, de
 * forklarer.
 */

const MIGRATIONER = "supabase/migrations";

const udenKommentarer = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/^\s*--.*$/gm, "");

const SERVICE = udenKommentarer(
  readFileSync(join(process.cwd(), "src/lib/loyalty/service.ts"), "utf8"),
);

const ALLE_SQL = readdirSync(MIGRATIONER)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => udenKommentarer(readFileSync(join(MIGRATIONER, f), "utf8")))
  .join("\n");

/** Kroppen af én funktion — frem til næste `export`. */
function krop(navn: string): string {
  const i = SERVICE.indexOf(`export async function ${navn}`);
  expect(i, `${navn} findes ikke`).toBeGreaterThan(-1);
  const rest = SERVICE.slice(i + 10);
  const slut = rest.indexOf("\nexport ");
  const ud = slut === -1 ? rest : rest.slice(0, slut);
  expect(ud.length, `${navn} har en tom krop`).toBeGreaterThan(200);
  return ud;
}

describe("en transaktion kan kun tilbageføres én gang", () => {
  it("et partielt unikt indeks håndhæver det", () => {
    expect(ALLE_SQL).toMatch(
      /create\s+unique\s+index[^;]*?on\s+public\.loyalty_transactions\s*\(\s*reversal_of\s*\)\s*where\s+reversal_of\s+is\s+not\s+null/i,
    );
  });

  /**
   * `where reversal_of is not null` er ikke en optimering: næsten alle
   * transaktioner er IKKE tilbageførsler, og uden filteret ville indekset
   * kræve, at der kun fandtes ÉN sådan række i hele tabellen.
   */
  it("indekset gælder kun rækker, der ER en tilbageførsel", () => {
    expect(ALLE_SQL).not.toMatch(
      /create\s+unique\s+index[^;]*?on\s+public\.loyalty_transactions\s*\(\s*reversal_of\s*\)\s*;/i,
    );
  });

  it("koden tager imod en tabt kapløbsindsættelse som 'allerede tilbageført'", () => {
    const k = krop("reverseStamp");
    expect(k).toContain("23505");
    expect(k).toMatch(/allerede tilbageført/i);
  });
});

describe("en rabat kan kun indløses én gang", () => {
  const k = krop("redeemDiscount");

  it("markeringen er betinget af, at den stadig er ledig", () => {
    expect(k).toMatch(/\.eq\("status",\s*"available"\)/);
  });

  it("der ses på, om opdateringen ramte en række", () => {
    expect(k).toContain('.select("id")');
    expect(k).toMatch(/if \(!vundet\?\.length\)/);
  });
});

describe("rabattens grænser afgøres i basen", () => {
  it("giv_rabat låser rabatrækken, før den tæller", () => {
    const i = ALLE_SQL.indexOf("function public.giv_rabat");
    expect(i, "giv_rabat findes ikke i nogen migration").toBeGreaterThan(-1);
    const f = ALLE_SQL.slice(i, i + 2000);
    // `for update` er hele kuren: uden den kan to kald begge tælle "der er
    // plads" og begge indsætte.
    expect(f).toMatch(/from\s+public\.discounts[\s\S]*?for\s+update/i);
    expect(f).toContain("per_customer_limit");
    expect(f).toContain("total_limit");
    expect(f).toMatch(/insert into public\.customer_discounts/i);
  });

  /**
   * GRUNDEN SKAL MED TILBAGE. "Kunden har fået den før" og "kampagnen er brugt
   * op" er to forskellige beskeder til den, der står ved disken — samme regel
   * som `koebSpaerre()`.
   */
  it("svarer med en grund og ikke bare sandt/falsk", () => {
    const i = ALLE_SQL.indexOf("function public.giv_rabat");
    const f = ALLE_SQL.slice(i, i + 2000);
    for (const grund of [
      "ikke-fundet",
      "ikke-aktiv",
      "kunde-graense",
      "samlet-graense",
      "ok",
    ]) {
      expect(f, grund).toContain(grund);
    }
  });

  it("koden tæller ikke længere selv", () => {
    const k = krop("grantDiscount");
    expect(k).toContain('rpc("giv_rabat"');
    // Selve fejlen: en tælling i JS efterfulgt af en indsættelse.
    expect(k).not.toMatch(/count:\s*"exact"/);
    expect(k).not.toMatch(/from\("customer_discounts"\)\s*\n\s*\.insert/);
  });

  /** Hver grund skal have en dansk besked — ellers får personalet ingenting. */
  it("hver grund har en besked i koden", () => {
    const k = krop("grantDiscount");
    for (const grund of [
      "ikke-fundet",
      "ikke-aktiv",
      "kunde-graense",
      "samlet-graense",
    ]) {
      expect(k, grund).toContain(grund);
    }
  });
});
