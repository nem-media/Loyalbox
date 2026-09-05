import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * DEN OFFENTLIGE SCORE HENTET, ikke bare regnet.
 *
 * `omdoemme.test.ts` prøver beregningen, som er ren og nem at holde fast. Men
 * "kundeoplevelser ældre end 12 måneder tæller ikke med" er IKKE beregningens
 * ansvar — det afgøres af en `gte` på forespørgslen, og den kan forsvinde uden
 * at en eneste af de rene prøver bliver rød. Derfor står den her, hvor
 * forespørgslen faktisk bliver stillet.
 *
 * Basen er byttet ud med en attrap, der svarer på nøjagtig de filtre, koden
 * sætter. Fjerner nogen datogrænsen, tæller de gamle rækker med, og prøven
 * falder.
 */

const createClient = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: () => createClient() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

const { hentOffentligKundescore, hentOffentligtGrundlag } = await import(
  "./omdoemme-data"
);

interface Raekke {
  rating: number;
  created_at: string;
}

/** Datoerne, koden bad om at tælle fra. Tom betyder: ingen grænse sat. */
let graenser: string[] = [];

/**
 * En attrap af PostgREST-kæden. Den kan kun det, `hentFordeling` bruger —
 * `.eq()` på virksomhed og rating og `.gte()` på datoen — og den er `then`-bar,
 * fordi koden venter på selve kæden og ikke på et `.execute()`.
 */
function fakeKlient(raekker: Raekke[]) {
  return {
    from() {
      let rating: number | null = null;
      let siden: string | null = null;
      const q = {
        select: () => q,
        eq: (kolonne: string, vaerdi: unknown) => {
          if (kolonne === "rating") rating = Number(vaerdi);
          return q;
        },
        gte: (kolonne: string, vaerdi: string) => {
          if (kolonne === "created_at") {
            siden = vaerdi;
            graenser.push(vaerdi);
          }
          return q;
        },
        then: (svar: (r: { count: number }) => unknown) =>
          Promise.resolve(
            svar({
              count: raekker.filter(
                (r) =>
                  (rating === null || r.rating === rating) &&
                  (siden === null || r.created_at >= siden),
              ).length,
            }),
          ),
      };
      return q;
    },
  };
}

/** En dato N måneder tilbage, skrevet som basen ville skrive den. */
function forMaanederSiden(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}

function raekker(spec: { rating: number; maanederSiden: number; antal: number }[]) {
  return spec.flatMap(({ rating, maanederSiden, antal }) =>
    Array.from({ length: antal }, () => ({
      rating,
      created_at: forMaanederSiden(maanederSiden),
    })),
  );
}

beforeEach(() => {
  graenser = [];
  createClient.mockReset();
});

describe("den offentlige kundescore hentet fra basen", () => {
  /**
   * DET HER ER HELE POINTEN MED PERIODEN. Ti sure kunder for to år siden må
   * ikke kunne trække et tal ned, som en kunde læser i dag — og ti glade
   * kunder dengang må ikke kunne bære det oppe.
   */
  it("tæller kun kundeoplevelser fra de seneste 12 måneder", async () => {
    createClient.mockResolvedValue(
      fakeKlient(
        raekker([
          { rating: 5, maanederSiden: 2, antal: 10 },
          { rating: 1, maanederSiden: 24, antal: 10 },
        ]),
      ),
    );

    const score = await hentOffentligKundescore("c1", true);
    expect(score).not.toBeNull();
    expect(score!.antal).toBe(10);
    expect(score!.score).toBe(5);
  });

  /** Grænsen skal sættes på ALLE fem tællinger — ikke kun den første. */
  it("sætter datogrænsen på hver eneste tælling", async () => {
    createClient.mockResolvedValue(fakeKlient([]));
    await hentOffentligKundescore("c1", true);

    expect(graenser).toHaveLength(5);
    const maaneder = Math.round(
      (Date.now() - new Date(graenser[0]).getTime()) / (1000 * 60 * 60 * 24 * 30.4),
    );
    expect(maaneder).toBe(12);
    expect(new Set(graenser).size).toBe(1);
  });

  /**
   * ER VISNINGEN SLÅET FRA, RØRES BASEN IKKE. Tjekket ligger før
   * forespørgslerne, så det almindelige tilfælde koster nul kald på en side,
   * kunder rammer — og der er ingen vej, ad hvilken tallet kan slippe ud.
   */
  it("henter slet ikke noget, når visningen er slået fra", async () => {
    createClient.mockResolvedValue(
      fakeKlient(raekker([{ rating: 5, maanederSiden: 1, antal: 50 }])),
    );

    expect(await hentOffentligKundescore("c1", false)).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("grundlaget bag dashboardets forslag", () => {
  /**
   * Dashboardet skal kunne vise et eksempel og afgøre, om forslaget skal
   * komme, UDEN at visningen er slået til. Det er butikkens eget dashboard;
   * ingen kunde ser noget af det.
   */
  it("regner på samme 12 måneder, selv om visningen er slået fra", async () => {
    createClient.mockResolvedValue(
      fakeKlient(
        raekker([
          { rating: 5, maanederSiden: 3, antal: 24 },
          { rating: 4, maanederSiden: 6, antal: 6 },
          { rating: 1, maanederSiden: 18, antal: 40 },
        ]),
      ),
    );

    const grundlag = await hentOffentligtGrundlag("c1");
    expect(grundlag.antal).toBe(30);
    expect(grundlag.kundescore).toBe(4.8);
    expect(grundlag.visning).not.toBeNull();
    expect(grundlag.visning!.foreloebig).toBe(false);
  });

  /** Under minimumsgrænsen er der intet at vise et eksempel på. */
  it("giver ingen visning under minimumsgrænsen", async () => {
    createClient.mockResolvedValue(
      fakeKlient(raekker([{ rating: 5, maanederSiden: 1, antal: 4 }])),
    );

    const grundlag = await hentOffentligtGrundlag("c1");
    expect(grundlag.antal).toBe(4);
    expect(grundlag.visning).toBeNull();
  });
});
