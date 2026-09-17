import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * VEJLEDNINGEN MÅ IKKE NÆVNE ÉN BROWSER.
 *
 * `PwaInstall` viser skridtene "læg kortet på hjemmeskærmen", når browseren
 * ikke selv tilbyder en installationsdialog. På iOS gælder det **alle**
 * browsere: de er alle WebKit, og ingen af dem fyrer `beforeinstallprompt`.
 * Teksten sagde alligevel "Del-ikonet nederst i Safari", og det er forkert på
 * to måder for en Chrome-bruger — den nævner en browser, de ikke er i, og
 * knappen sidder ikke dér. **Meldt af brugeren 2026-09-17**, som havde prøvet
 * det på en iPhone i Chrome.
 *
 * Det FÆLLES er ikonet og menupunktet, ikke placeringen: alle går gennem iOS'
 * egen delingsflade, hvor punktet hedder det samme. Prøven her holder fast i,
 * at alle tre browsere er nævnt — den næste, der strammer teksten op, skal
 * ikke kunne skrive den tilbage til kun at gælde Safari.
 */

const udenKommentarer = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const KILDE = udenKommentarer(
  readFileSync(join(process.cwd(), "src/components/pwa-install.tsx"), "utf8"),
);

/** Kun iOS-grenen — den anden gren gælder Android og desktop. */
const IOS_GREN = (() => {
  const i = KILDE.indexOf("isIos ? (");
  expect(i, "iOS-grenen findes ikke").toBeGreaterThan(-1);
  return KILDE.slice(i, KILDE.indexOf(") : (", i));
})();

describe("vejledningen til hjemmeskærmen på iOS", () => {
  it("nævner alle tre browsere og ikke kun én", () => {
    for (const browser of ["Safari", "Chrome", "Firefox"]) {
      expect(IOS_GREN, `${browser} mangler i vejledningen`).toContain(browser);
    }
  });

  /**
   * DEN FEJL, BRUGEREN MELDTE, FANGES AF PRØVEN OVENFOR — ikke af et forbud
   * mod at nævne Safaris placering. At skrive "nederst i Safari" er rigtigt,
   * NÅR de to andre står ved siden af; det var *kun* at skrive det, der var
   * forkert. Første udgave af prøven her forbød ordene og ville have tvunget
   * teksten til at blive mindre brugbar — den prøvede sin egen formulering i
   * stedet for den egenskab, der betyder noget.
   *
   * Egenskaben er: ingen browser står alene. Derfor prøves det sådan.
   */
  it("giver ikke en anvisning, der kun gælder én browser", () => {
    const nævnt = ["Safari", "Chrome", "Firefox"].filter((b) =>
      IOS_GREN.includes(b),
    );
    expect(nævnt.length, `kun ${nævnt.join(", ")} er nævnt`).toBeGreaterThan(1);
  });

  /**
   * Ikonet er det samme overalt og er derfor den eneste sikre kendetegn —
   * placeringen er det ikke.
   */
  it("beskriver ikonet, så det kan findes uanset hvor det sidder", () => {
    expect(IOS_GREN).toMatch(/firkanten med/);
  });

  /** Ultrakort var ønsket: to skridt, ikke tre. */
  it("er på højst to skridt", () => {
    const skridt = IOS_GREN.match(/<li>/g) ?? [];
    expect(skridt.length).toBeLessThanOrEqual(2);
  });

  /**
   * Menupunktet hedder det samme i alle tre, fordi det er iOS' eget — og det
   * er dét, kunden skal lede efter.
   */
  it("siger hvad punktet hedder", () => {
    expect(IOS_GREN).toContain("Føj til hjemmeskærm");
  });
});
