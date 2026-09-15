import { describe, it, expect } from "vitest";
import { beregnOmdoemme, gennemsnit, andele, vejetScore, eksternScore, ratingTilScore, offentligKundescore, TOM_FORDELING } from "./omdoemme";
import { stampProgress } from "./loyalty/balance";
import { grupperPrAdresse } from "./data";

/**
 * EN HELT NY KONTO MÅ IKKE KUNNE FREMKALDE NaN, undefined ELLER ET FALSK TAL.
 *
 * Den tomme tilstand er den eneste, ALLE kunder er i på deres første dag, og
 * den er samtidig den, ingen tester — der er jo ingenting at kigge på. Et
 * "NaN" eller et selvsikkert "0,0" på dag ét er dyrere end en fejl længere
 * inde: det er kundens første indtryk af, om tallene kan bruges til noget.
 *
 * NULL OG NUL ER IKKE DET SAMME, og det er hele pointen i flere af prøverne
 * nedenfor: en butik uden en eneste utilfreds kunde har ikke undladt at følge
 * op — der var intet at følge op på. Se `haandteringsScore()`.
 */
const erTal = (v: unknown) => typeof v === "number" && Number.isFinite(v);

describe("TOM TILSTAND: en konto uden data", () => {
  it("omdømmet er null hele vejen igennem — ikke 0 og ikke NaN", () => {
    const r = beregnOmdoemme({ fordeling: { ...TOM_FORDELING }, haandteredeNegative: 0, profiler: [] });
    expect(r.score).toBeNull();
    expect(r.kundescore).toBeNull();
    expect(r.andele).toBeNull();
    expect(r.antalOplevelser).toBe(0);
    for (const [k, v] of Object.entries(r.dele)) {
      expect(v === null || erTal(v), `${k} = ${v}`).toBe(true);
    }
    for (const v of Object.values(r.faktiskeVaegte)) expect(erTal(v)).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/null,"etiket":"NaN"|NaN|undefined/);
  });

  it("de rene beregninger svarer null frem for NaN", () => {
    expect(gennemsnit({ ...TOM_FORDELING })).toBeNull();
    expect(andele({ ...TOM_FORDELING })).toBeNull();
    expect(vejetScore([])).toBeNull();
    expect(eksternScore([])).toBeNull();
    // Division med nul-spænd må heller ikke give Infinity.
    expect(ratingTilScore(3, 1, 1)).toBeNull();
    expect(offentligKundescore({ ...TOM_FORDELING }, true)).toBeNull();
  });

  it("et stempelkort uden stempler viser 0 og ikke NaN", () => {
    const p = stampProgress(0, 10);
    expect(erTal(p.have) && erTal(p.required)).toBe(true);
    expect(p.reached).toBe(false);
    // Et program uden tærskel må ikke dividere med nul.
    const u = stampProgress(3, 0);
    expect(Number.isFinite(u.have) && Number.isFinite(u.required)).toBe(true);
  });

  it("statistik pr. adresse tåler en butik uden scanninger", () => {
    const r = grupperPrAdresse({
      stands: [{ id: "s1", name: "Disken" }],
      scans: [],
      feedback: [],
    } as never);
    expect(Array.isArray(r)).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/NaN|undefined/);
    // Et stille sted skal stadig stå på listen — det er dét, ejeren skal se.
    expect(r.length).toBe(1);
  });
});
