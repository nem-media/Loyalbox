import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { KATALOG } from "./constants";

/**
 * SIDENS BREDDE OG DET TRIN, DER STILLER VARERNE PÅ RÆKKE.
 *
 * Kravet er konkret: alle fire varer skal stå ved siden af hinanden på en
 * 14-15" bærbar, dér hvor kunden vælger. To ting bærer det — rammens bredde
 * (`--bredde-side`) og det breakpoint, gitteret skifter på
 * (`--breakpoint-laptop`) — og begge kan gå i stykker UDEN at noget fejler:
 * CSS'en bygger fint, siden ser rigtig ud for den, der kigger på en bred
 * skærm, og kortene falder ned i to rækker for alle andre.
 */

const css = readFileSync("src/app/globals.css", "utf8");
const udenKommentarer = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const kilde = (sti: string) => udenKommentarer(readFileSync(sti, "utf8"));

/** Begge steder varerne tegnes som en stribe kort. */
const GITRE = ["src/app/produkter/page.tsx", "src/components/pricing.tsx"];

function token(navn: string): string {
  const m = new RegExp(`${navn}:\\s*([^;]+);`).exec(css);
  if (!m) throw new Error(`${navn} findes ikke i globals.css`);
  return m[1].trim();
}

describe("rammen er bred nok til fire kort", () => {
  it("--bredde-side er sat og ligger inden for det aftalte", () => {
    const v = token("--bredde-side");
    expect(v).toMatch(/^\d+px$/);
    const px = Number(v.replace("px", ""));
    /* 1152 var den gamle ramme (max-w-6xl); 200 px mere er loftet, brugeren
       gav lov til. Bliver den bredere, er det en anden beslutning. */
    expect(px).toBeGreaterThan(1152);
    expect(px).toBeLessThanOrEqual(1352);
  });

  it("fire kort får plads nok til at kunne læses", () => {
    const px = Number(token("--bredde-side").replace("px", ""));
    /* gap-6 = 24 px mellem fire kort. */
    const kortbredde = (px - 3 * 24) / 4;
    expect(Math.round(kortbredde)).toBeGreaterThanOrEqual(280);
  });

  it("den gamle faste bredde er ikke tilbage nogen steder", () => {
    /* `max-w-6xl` ved siden af `max-w-side` ville give en header, der ikke
       flugter med indholdet under den. */
    for (const sti of [
      ...GITRE,
      "src/components/site-header.tsx",
      "src/components/site-footer.tsx",
      "src/app/bestil/page.tsx",
    ]) {
      expect(kilde(sti), `${sti} bruger den fælles ramme`).not.toContain(
        "max-w-6xl",
      );
    }
  });
});

describe("gitteret skifter til fire på en bærbar", () => {
  /*
   * VÆRDIEN SKAL VÆRE I REM, OG DET ER IKKE KOSMETIK.
   *
   * Tailwinds egne trin er 40/48/64/80rem. Et breakpoint i PX sorteres ikke
   * ind imellem dem: `@media (min-width:1100px)` blev skrevet ud FØR `sm`, og
   * når begge matcher på en bred skærm, vinder den sidste — altså
   * `sm:grid-cols-2`. MÅLT to gange: gitteret stod 2×2 ved 1905 px, først med
   * `min-[1100px]:` og dernæst med et navngivet breakpoint i px. Reglen var
   * der begge gange; den tabte bare.
   */
  it("--breakpoint-laptop er i rem", () => {
    const v = token("--breakpoint-laptop");
    expect(v, "px sorteres forkert mod Tailwinds rem-trin").toMatch(
      /^[\d.]+rem$/,
    );
  });

  it("trinnet ligger mellem lg og xl", () => {
    const rem = Number(token("--breakpoint-laptop").replace("rem", ""));
    /* Under lg (64rem) ville kortene blive ~230 px; over xl (80rem) ville en
       almindelig bærbar aldrig nå det. */
    expect(rem).toBeGreaterThan(64);
    expect(rem).toBeLessThan(80);
  });

  it("begge gitre bruger trinnet og ikke en arbitrær variant", () => {
    for (const sti of GITRE) {
      const s = kilde(sti);
      expect(s, `${sti} bruger det navngivne trin`).toContain(
        "laptop:grid-cols-4",
      );
      expect(
        /min-\[\d+px\]:/.test(s),
        `${sti} må ikke bruge en arbitrær min-bredde — den sorteres forkert`,
      ).toBe(false);
    }
  });

  it("der er fire varer at stille op", () => {
    /* Kravet er "alle fire på række". Kommer der en femte, holder rækken op
       med at passe, og det skal opdages her frem for på en skærm. */
    expect(KATALOG).toHaveLength(4);
  });
});

describe("hovedmenuen bærer højst seks punkter", () => {
  /*
   * MÅLT 2026-09-19: da menuen fik sit syvende punkt, krympede LOGOET fra
   * 204 til 86 px mellem 1024 og 1199 px, så bomærket lå oven i det første
   * menupunkt. Intet stak uden for headeren, siden kunne ikke skubbes til
   * siden, og ingen prøve sagde fra — flex løser pladsmangel ved at KRYMPE,
   * ikke ved at brække. Se AGENTS.md.
   *
   * BLOGGEN ER DEN, DER RØG UD, og det er et valg om, hvad menuen er til:
   * den er vejen til det, man kan købe. Bloggen står i footeren, som også
   * er på hver side, så den mister ingen intern linkværdi.
   *
   * Tallet er et LOFT og ikke en påstand om, at seks er rigtigt. Skal der et
   * syvende ind, skal logoets `right` måles mod navens `left` ved 1024, 1100,
   * 1200, 1280, 1440 og 1920 først — og så må tallet hæves bevidst.
   */
  const header = readFileSync("src/components/site-header.tsx", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  const punkter = [...header.matchAll(/\{\s*href:\s*"([^"]+)"/g)].map(
    (m) => m[1],
  );

  it("menuen har punkter at tælle", () => {
    expect(punkter.length).toBeGreaterThan(3);
  });

  it("der er højst seks", () => {
    expect(punkter, `menuen står med ${punkter.length}`).toHaveLength(6);
  });

  it("bloggen står i footeren og ikke i menuen", () => {
    expect(punkter).not.toContain("/blog");
    const footer = readFileSync("src/components/site-footer.tsx", "utf8");
    expect(footer, "bloggen skal stadig kunne findes").toContain('"/blog"');
  });
});
