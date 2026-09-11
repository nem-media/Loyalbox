import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { traekLagerForOrdre, erLagerFarve } from "./lager";

/**
 * Et minimalt fake for admin-klienten: designopslag + rpc.
 * `farve` styrer, hvad designet svarer; rpc'ens kald optages.
 */
function fakeAdmin(farve: string | null) {
  const rpcKald: { navn: string; args: unknown }[] = [];
  const admin = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({
                  data: farve === null ? null : { stander_farve: farve },
                }),
              };
            },
          };
        },
      };
    },
    rpc(navn: string, args: unknown) {
      rpcKald.push({ navn, args });
      return Promise.resolve({ data: 0, error: null });
    },
  };
  return { admin, rpcKald };
}

type AdminArg = Parameters<typeof traekLagerForOrdre>[0];

describe("traekLagerForOrdre", () => {
  it("trækker antallet fra den farve, designet har", async () => {
    const { admin, rpcKald } = fakeAdmin("sort");
    await traekLagerForOrdre(admin as unknown as AdminArg, {
      design_id: "d1",
      quantity: 3,
    });
    expect(rpcKald).toHaveLength(1);
    expect(rpcKald[0]).toEqual({
      navn: "juster_lager",
      args: { p_farve: "sort", p_delta: -3 },
    });
  });

  it("regner manglende antal som 1", async () => {
    const { admin, rpcKald } = fakeAdmin("hvid");
    await traekLagerForOrdre(admin as unknown as AdminArg, {
      design_id: "d1",
      quantity: null,
    });
    expect(rpcKald[0].args).toEqual({ p_farve: "hvid", p_delta: -1 });
  });

  it("kaster og rører IKKE lageret uden design_id — vi gætter ikke en farve", async () => {
    const { admin, rpcKald } = fakeAdmin("sort");
    await expect(
      traekLagerForOrdre(admin as unknown as AdminArg, {
        design_id: null,
        quantity: 1,
      }),
    ).rejects.toThrow();
    expect(rpcKald).toHaveLength(0);
  });

  it("kaster ved ukendt farve frem for at trække det forkerte lager", async () => {
    const { admin, rpcKald } = fakeAdmin(null);
    await expect(
      traekLagerForOrdre(admin as unknown as AdminArg, {
        design_id: "d1",
        quantity: 1,
      }),
    ).rejects.toThrow();
    expect(rpcKald).toHaveLength(0);
  });

  it("erLagerFarve godkender kun sort og hvid", () => {
    expect(erLagerFarve("sort")).toBe(true);
    expect(erLagerFarve("hvid")).toBe(true);
    expect(erLagerFarve("blå")).toBe(false);
    expect(erLagerFarve(null)).toBe(false);
  });
});

/**
 * LAGERET MÅ ALDRIG SPÆRRE ET KØB ELLER VISES TIL KUNDER.
 *
 * Det var hele præmissen: internt, og salget går igennem selv med tom hylde.
 * Prøven vogter det ved at læse kilden — hverken købsspærren eller de
 * kundevendte flader må importere lager-modulet.
 */
describe("lageret er internt og spærrer ikke salg", () => {
  const L = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("commerce.ts (koebSpaerre) rører ikke lageret", () => {
    expect(L("src/lib/commerce.ts")).not.toContain("lib/lager");
  });

  it("den offentlige standerside importerer ikke lageret", () => {
    expect(L("src/app/r/[slug]/page.tsx")).not.toContain("lib/lager");
  });

  it("checkout-ruten spærrer ikke på lager", () => {
    expect(L("src/app/api/checkout/route.ts")).not.toContain("lib/lager");
  });
});

/**
 * Webhooken trækker fra KUN første gang (samme idempotens som
 * kundebekræftelsen), og et fejlet træk vælter ikke købet.
 */
describe("webhooken trækker fra lageret idempotent", () => {
  const kilde = readFileSync(
    join(process.cwd(), "src/app/api/stripe/webhook/route.ts"),
    "utf8",
  );
  it("kalder traekLagerForOrdre bag foersteGang", () => {
    expect(kilde).toMatch(/if \(foersteGang && opdateretOrdre\?\.length\)/);
    expect(kilde).toContain("traekLagerForOrdre(admin");
  });
  it("sluger en lagerfejl som en driftsnote frem for at fejle mod Stripe", () => {
    // Trækket ligger i en try/catch, der noterer i driftsloggen.
    const iTraek = kilde.indexOf("traekLagerForOrdre(admin");
    const efter = kilde.slice(iTraek, iTraek + 400);
    expect(efter).toContain("catch");
    expect(efter).toContain('noterFejl');
  });
});
