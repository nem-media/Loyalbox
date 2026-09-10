import { describe, it, expect } from "vitest";
import { stempelKolonner } from "./stamp-layout";

/** Rækkerne, et givet kolonneantal deler `total` op i — til læselige forventninger. */
function raekker(total: number): number[] {
  const c = stempelKolonner(total);
  const ud: number[] = [];
  let rest = total;
  while (rest > 0) {
    ud.push(Math.min(c, rest));
    rest -= c;
  }
  return ud;
}

describe("stempelKolonner", () => {
  it("holder op til 5 på én række", () => {
    for (let n = 1; n <= 5; n++) expect(stempelKolonner(n)).toBe(n);
  });

  /**
   * De antal, brugeren nævnte — og som det faste 5-net gjorde grimme. Hvert
   * layout skal have en fuld eller næsten fuld sidste række og ingen enlig
   * cirkel.
   */
  it("fordeler de skæve antal pænt", () => {
    expect(raekker(6)).toEqual([3, 3]);
    expect(raekker(7)).toEqual([4, 3]);
    expect(raekker(8)).toEqual([4, 4]);
    expect(raekker(9)).toEqual([3, 3, 3]);
    expect(raekker(10)).toEqual([5, 5]);
    expect(raekker(11)).toEqual([4, 4, 3]);
    expect(raekker(12)).toEqual([4, 4, 4]);
  });

  /**
   * ALDRIG en enlig cirkel på sidste række for 6–30 stempler. Det var hele
   * pointen: en fyldt række med en ensom prik under ser i stykker ud.
   */
  it("efterlader aldrig én enlig cirkel", () => {
    for (let n = 6; n <= 30; n++) {
      const r = raekker(n);
      if (r.length > 1) {
        expect(r[r.length - 1], `n=${n}`).toBeGreaterThan(1);
      }
    }
  });

  it("bruger aldrig mere end 5 kolonner", () => {
    for (let n = 1; n <= 30; n++) {
      expect(stempelKolonner(n)).toBeLessThanOrEqual(5);
    }
  });

  it("tåler skæve input uden at kaste", () => {
    expect(stempelKolonner(0)).toBe(1);
    expect(stempelKolonner(-3)).toBe(1);
    expect(stempelKolonner(7.5)).toBe(stempelKolonner(7));
  });
});
