import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { GUIDES, getGuide } from "./guides";
import { EARN_MODEL_LABELS } from "./loyalty/constants";

/**
 * Vejledningerne er indhold, ikke logik — men tre ting kan gå i stykker
 * ubemærket, og dem fanger vi her.
 */

describe("GUIDES", () => {
  it("har unikke id'er — de bruges som ankre i URL'en", () => {
    const ids = GUIDES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("har indhold i hver vejledning", () => {
    for (const g of GUIDES) {
      expect(g.title.length, g.id).toBeGreaterThan(0);
      expect(g.summary.length, g.id).toBeGreaterThan(0);
      expect(g.steps.length, g.id).toBeGreaterThan(0);
    }
  });

  /**
   * Vejledninger peger på sider i APPEN — aldrig ud på en marketingside eller
   * et eksternt sted. Reglen var før "kun /dashboard", og den holdt, så længe
   * alt kunne gøres derindefra.
   *
   * `/bestil` er tilføjet, fordi den første vejledning netop handler om det
   * ene, en konto UDEN abonnement kan: designe og bestille. Den ligger uden
   * for dashboardet, men er lige så meget en del af appen — og en vejledning,
   * der ikke må linke til den, ville sende folk til en side, de skulle finde
   * selv.
   */
  const TILLADTE_ROEDDER = [/^\/dashboard(\/|$)/, /^\/bestil(\/|$)/];

  it("peger kun på sider i appen", () => {
    for (const g of GUIDES) {
      if (!g.href) continue;
      expect(
        TILLADTE_ROEDDER.some((r) => r.test(g.href!)),
        `${g.id}: ${g.href}`,
      ).toBe(true);
    }
  });

  /**
   * En vejledning, der beskriver noget spærret, skal SIGE det. Hjælpesiden
   * viste alle ni til alle, og den første bad om at oprette en stander —
   * spærret uden abonnement. Fanges her, så en ny vejledning ikke kan glide
   * ind uden at tage stilling.
   */
  it("markerer hvad en vejledning forudsætter", () => {
    const spaerrede: Record<string, "abonnement" | "komplet"> = {
      "/dashboard/standere": "abonnement",
      "/dashboard/personale": "abonnement",
      "/dashboard/feedback": "abonnement",
      "/dashboard/opslag": "komplet",
      "/dashboard/loyalitet": "komplet",
    };
    for (const g of GUIDES) {
      const traeffer = Object.keys(spaerrede).find((r) =>
        g.href?.startsWith(r),
      );
      if (traeffer) {
        expect(g.kraever, `${g.id} peger på ${g.href}`).toBe(
          spaerrede[traeffer],
        );
      }
    }
  });

  it("har mindst én vejledning, alle kan følge", () => {
    // Ellers er hjælpesiden tom for en konto, der endnu ikke har købt noget.
    expect(GUIDES.filter((g) => !g.kraever).length).toBeGreaterThan(0);
  });

  it("lister alle optjeningsmodeller i stempelkort-vejledningen", () => {
    // Trinnet udledes af EARN_MODEL_LABELS. Tilføjes en ny model til domænet,
    // skal den dukke op her af sig selv — ellers står vejledningen og lyver.
    const step = getGuide("stempelkort")!.steps.find(
      (s) => typeof s !== "string",
    );
    expect(step).toBeDefined();
    const items = typeof step === "string" ? [] : (step?.items ?? []);
    expect(items.length).toBe(Object.keys(EARN_MODEL_LABELS).length);
  });
});

describe("hjælp brugt ude på siderne", () => {
  /** Alle id'er, som dashboardet beder om via GuideHint/getGuide. */
  function brugteIder(dir: string): string[] {
    const fundet: string[] = [];
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const sti = join(dir, e.name);
      if (e.isDirectory()) {
        fundet.push(...brugteIder(sti));
      } else if (e.name.endsWith(".tsx")) {
        const kode = readFileSync(sti, "utf8");
        for (const m of kode.matchAll(
          /(?:GuideHint id|getGuide\()="?([\w-]+)"/g,
        )) {
          fundet.push(m[1]);
        }
      }
    }
    return fundet;
  }

  it("refererer kun til vejledninger, der findes", () => {
    // Et id skrevet forkert i en side ville ellers bare vise ingenting —
    // hjælpen forsvinder lydløst netop dér, hvor brugeren stod fast.
    const ider = brugteIder(join(process.cwd(), "src", "app", "dashboard"));
    expect(ider.length).toBeGreaterThan(0);
    for (const id of ider) {
      expect(getGuide(id), `ukendt vejledning: ${id}`).toBeDefined();
    }
  });
});
