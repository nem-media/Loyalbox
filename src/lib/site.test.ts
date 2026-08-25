import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sitemap from "@/app/sitemap";
import { PRIVAT_SIDE, isoTidspunkt } from "./site";

/**
 * Sitemap og robots.
 *
 * `/login` og `/signup` stod i sitemappet OG var indekseret, mens de ikke kan
 * besvare noget, nogen søger på. Værre: `/kort/<token>` viser en kundes navn
 * og stempelsaldo og havde hverken robots-direktiv eller spærring.
 *
 * Fejlen er tavs. Et sitemap, der peger på en privat side, ser rigtigt ud i
 * en kodegennemgang og opdages først, når siden står i et søgeresultat.
 */

const ROD = process.cwd();

/** Stier der ALDRIG må optræde i sitemappet. */
const PRIVATE_STIER = [
  "/login",
  "/signup",
  "/opret-konto",
  "/glemt-adgangskode",
  "/nulstil-adgangskode",
  "/mine-kort",
  "/personale",
  "/kort",
  "/dashboard",
  "/admin",
  "/r/",
];

describe("sitemap", () => {
  const urls = sitemap().map((e) => new URL(e.url).pathname.replace(/\/$/, ""));

  it("indeholder ingen private sider", () => {
    for (const sti of PRIVATE_STIER) {
      const fundet = urls.filter((u) => u === sti || u.startsWith(`${sti}/`));
      expect(fundet, `sitemappet peger på ${fundet.join(", ")}`).toEqual([]);
    }
  });

  it("indeholder de sider, der skal kunne findes", () => {
    for (const sti of [
      "",
      "/produkter",
      "/blog",
      "/reviewstander",
      "/stempelkort",
    ]) {
      expect(urls, `${sti || "/"} mangler i sitemappet`).toContain(sti);
    }
  });
});

describe("private sider", () => {
  it("er markeret noindex", () => {
    expect(PRIVAT_SIDE.robots.index).toBe(false);
  });

  /**
   * Hver side under de private stier skal SELV sige noindex.
   *
   * Robots.txt er ikke nok: en side, der er spærret for crawl, kan Google
   * ikke læse en noindex på — så en allerede indekseret side bliver stående.
   */
  it("erklærer det på hver enkelt side", () => {
    const mapper = [
      "src/app/(auth)",
      "src/app/kort",
      "src/app/mine-kort",
      "src/app/personale",
    ];

    const sider: string[] = [];
    function gaa(dir: string) {
      for (const navn of readdirSync(dir)) {
        const sti = join(dir, navn);
        if (statSync(sti).isDirectory()) gaa(sti);
        else if (navn === "page.tsx") sider.push(sti);
      }
    }
    for (const m of mapper) gaa(join(ROD, m));

    expect(sider.length).toBeGreaterThan(0);
    for (const sti of sider) {
      const kilde = readFileSync(sti, "utf8");
      expect(
        kilde.includes("PRIVAT_SIDE"),
        `${sti.slice(ROD.length + 1)} mangler PRIVAT_SIDE`,
      ).toBe(true);
    }
  });
});

describe("isoTidspunkt", () => {
  it("lægger dansk sommertid på en sommerdato", () => {
    expect(isoTidspunkt("2026-07-29")).toBe("2026-07-29T09:00:00+02:00");
  });

  it("lægger normaltid på en vinterdato", () => {
    expect(isoTidspunkt("2026-01-15")).toBe("2026-01-15T09:00:00+01:00");
  });

  /**
   * DEN, FEJLEN VILLE GEMME SIG I. Med midnat ville sommertidens +02.00
   * gøre tidspunktet til 22.00 UTC DAGEN FØR, og artiklen ville fremstå
   * udgivet et døgn for tidligt overalt, hvor datoen læses i UTC.
   */
  it("peger på SAMME dato, når tidspunktet læses i UTC", () => {
    for (const dato of ["2026-07-29", "2026-01-15", "2026-03-29"]) {
      expect(new Date(isoTidspunkt(dato)).toISOString().slice(0, 10)).toBe(
        dato,
      );
    }
  });
});
