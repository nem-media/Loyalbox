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

  it("peger kun på interne dashboard-sider", () => {
    for (const g of GUIDES) {
      if (g.href) expect(g.href, g.id).toMatch(/^\/dashboard(\/|$)/);
    }
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
        for (const m of kode.matchAll(/(?:GuideHint id|getGuide\()="?([\w-]+)"/g)) {
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
