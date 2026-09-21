import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * DIALOGEN SKAL FANGES FØR HYDRERINGEN.
 *
 * Chrome fyrer `beforeinstallprompt`, så snart siden opfylder kravene — og
 * det sker som regel FØR React har hydreret. `PwaInstall` lyttede i en
 * `useEffect`, som pr. definition først kører bagefter, så eventet var
 * passeret og gik i gulvet. Komponenten så da en browser uden API og foldede
 * de manuelle skridt ud: altså iOS-reserven vist til en Android-bruger, der
 * havde den rigtige knap til rådighed. Meldt af brugeren.
 *
 * MÅLT BAGEFTER i en rigtig Chrome mod `/mine-kort`: browseren fyrer selv
 * eventet (`isTrusted: true`), fangeren griber det, komponenten læser det, og
 * knappen kalder `prompt()`. Kravene var altså opfyldt hele tiden — det var
 * kun timingen.
 *
 * FEJLEN ER TAVS OG AFHÆNGER AF FART: på en hurtig maskine når React det, og
 * så virker knappen. Den rammer den langsomme telefon på et dårligt net —
 * altså netop den, der har mest gavn af at lægge kortet på skærmen. Den kan
 * derfor ikke findes ved at prøve på en bærbar, og det er grunden til, at den
 * står her.
 */

const kilde = (sti: string) =>
  readFileSync(sti, "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const FANG = kilde("src/components/pwa-fang.tsx");
const INSTALL = kilde("src/components/pwa-install.tsx");
const LAYOUT = kilde("src/app/layout.tsx");

describe("installationsdialogen", () => {
  it("fangeren står i roden, så den kører på hver side", () => {
    expect(LAYOUT).toContain("<PwaFang />");
  });

  it("fangeren er et RÅT script og ikke en komponent med en effekt", () => {
    /* Hele pointen er, at koden kører under parsingen. `next/script` ville
       planlægge den efter hydreringen, og en `useEffect` er dét, fejlen var. */
    expect(FANG).toContain("dangerouslySetInnerHTML");
    expect(FANG).toContain("beforeinstallprompt");
    expect(FANG).not.toContain("useEffect");
  });

  it("komponenten LÆSER globalen frem for kun at lytte selv", () => {
    expect(INSTALL).toContain("INSTALL_GLOBAL");
    /* En egen `beforeinstallprompt`-lytter ville se rigtig ud og virke på en
       hurtig maskine — og gøre præcis ingenting dér, hvor fejlen findes. */
    expect(
      INSTALL.includes('"beforeinstallprompt"'),
      "komponenten skal hente eventet hos fangeren, ikke lytte selv",
    ).toBe(false);
  });

  it("dialogen læses som ekstern tilstand og ikke med en effekt", () => {
    /* Værdien ejes af browseren og ændrer sig uafhængigt af React — samme
       grund som `display-mode` og platformen i samme fil. React Compiler
       afviser desuden synkron `setState` i en effekt (se AGENTS.md). */
    expect(INSTALL).toContain("useSyncExternalStore");
    expect(INSTALL).not.toContain("useEffect");
  });
});
