import { describe, it, expect } from "vitest";
import { kronerTilOere, pointTarget, stempelTarget } from "./targets";
import { beregnPoint } from "@/lib/loyalty/point";

/**
 * WEBSHOPPEN REGNER SOM DISKEN.
 *
 * `pointTarget()` må ikke have sine egne regler: 1 point pr. 10 kr. er 1 point
 * pr. 10 kr., og der rundes NED, præcis som `beregnPoint()`. Prøven holder de
 * to enige over mange beløb — den eneste forskel er, at webshoppen regner i
 * øre, så en float ikke kan ramme ved siden af.
 */

describe("point", () => {
  const regel = { earn_model: "per_amount" as const, earn_value: 10 };

  it("750 kr. → 75, 450 kr. → 45, 249 kr. → 24", () => {
    expect(pointTarget(regel, 75000, true)).toBe(75);
    expect(pointTarget(regel, 45000, true)).toBe(45);
    expect(pointTarget(regel, 24900, true)).toBe(24);
  });

  it("ikke kvalificeret eller intet grundlag → 0", () => {
    expect(pointTarget(regel, 75000, false)).toBe(0);
    expect(pointTarget(regel, 0, true)).toBe(0);
  });

  it("samme svar som beregnPoint() over mange beløb og satser", () => {
    for (const vaerdi of [1, 2.5, 7, 10, 12.34, 25, 100]) {
      for (let oere = 0; oere < 50000; oere += 1237) {
        const disk = beregnPoint({ model: "per_amount", earnValue: vaerdi, amount: oere / 100 });
        expect(pointTarget({ earn_model: "per_amount", earn_value: vaerdi }, oere, true), `${oere} øre ved ${vaerdi} kr.`).toBe(disk);
      }
    }
  });

  it("ingen float-fejl: 0,30 kr. ved 0,10 kr./point er 3 point", () => {
    expect(pointTarget({ earn_model: "per_amount", earn_value: 0.1 }, 30, true)).toBe(3);
  });

  it("per_visit giver programmets faste antal; manual giver intet", () => {
    expect(pointTarget({ earn_model: "per_visit", earn_value: 5 }, 100, true)).toBe(5);
    expect(pointTarget({ earn_model: "per_visit", earn_value: 5 }, 0, true)).toBe(0);
    expect(pointTarget({ earn_model: "manual", earn_value: 5 }, 100000, true)).toBe(0);
  });

  it("kroner læses som øre uden afrundingsstøj", () => {
    expect(kronerTilOere(10)).toBe(1000);
    expect(kronerTilOere("12.34")).toBe(1234);
    expect(kronerTilOere(0.1)).toBe(10);
    expect(kronerTilOere("abc")).toBe(0);
  });
});

describe("stempler: ét pr. kvalificerende ordre", () => {
  it("1 stempel ved ≥ 100 kr.; 80 kr. giver intet; uden minimum tæller enhver betalt ordre", () => {
    expect(stempelTarget(75000, true, 10000)).toBe(1);
    expect(stempelTarget(45000, true, 10000)).toBe(1);
    expect(stempelTarget(8000, true, 10000)).toBe(0);
    expect(stempelTarget(100, true, null)).toBe(1);
    expect(stempelTarget(75000, false, null)).toBe(0);
    expect(stempelTarget(0, true, null)).toBe(0);
  });
});
