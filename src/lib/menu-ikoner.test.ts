import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * ET MENUPUNKT KENDES PÅ SIN SILHUET, IKKE PÅ SIN TEGNING.
 *
 * Tre af punkterne i kundens menu var rektangler: Standere (et skilt),
 * Loyalitet (et kort med tre cirkler) og Abonnement (et kort med en stribe).
 * Ved 18 px er detaljerne inden i næsten væk, og tilbage står tre ens
 * firkanter — så øjet kan ikke bruge ikonet til noget, og man læser hver
 * gang. Det er ikke en fejl, nogen melder; det er en menu, der føles træg.
 *
 * Prøverne her fanger de to måder, det opstår på: det samme ikon brugt to
 * gange i samme menu, og to ikoner, der er TEGNET ens.
 */

const kilde = (sti: string) =>
  readFileSync(sti, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const MENUER: [string, string][] = [
  ["src/app/dashboard/layout.tsx", "kundens menu"],
  ["src/app/admin/layout.tsx", "adminmenuen"],
];

describe("menuens ikoner", () => {
  for (const [sti, hvad] of MENUER) {
    it(`${hvad} bruger ikke det samme ikon to gange`, () => {
      const brugte = [...kilde(sti).matchAll(/icon:\s*"(\w+)"/g)].map((m) => m[1]);
      expect(brugte.length, "menuen har ikoner").toBeGreaterThan(3);
      const dubletter = brugte.filter((k, i) => brugte.indexOf(k) !== i);
      expect(
        [...new Set(dubletter)],
        "to punkter deler ikon — de kan ikke skelnes ved 18 px",
      ).toEqual([]);
    });
  }

  it("to ikoner er ikke tegnet ens", () => {
    /*
     * Den anden vej ind: to FORSKELLIGE ikoner med samme geometri. Det sker,
     * når et ikon laves ved at kopiere naboen og skifte en detalje — og
     * detaljen er netop dét, der forsvinder ved 18 px.
     *
     * Formerne læses ud af hver ikonfunktion og sammenlignes som mængder.
     * `krop`-formerne springes over: de er MED VILJE en kopi af tegningens
     * egne flader (silhuetten, der fyldes, når punktet er aktivt).
     */
    const s = kilde("src/components/nav-icons.tsx");
    const stykker = s.split(/export function (\w+Icon)\b/).slice(1);
    const former = new Map<string, string[]>();

    for (let i = 0; i < stykker.length; i += 2) {
      const navn = stykker[i];
      const krop = stykker[i + 1] ?? "";
      /* Kun tegningen: alt efter `krop={` og frem til det afsluttende `}`
         ignoreres ved at fjerne prop'ens indhold. */
      const udenKrop = krop.replace(/krop=\{[\s\S]*?\n\s{4}\}?\s*>/, ">");
      const f = [
        ...[...udenKrop.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]),
        ...[...udenKrop.matchAll(/<(rect|circle)([^/>]*)\/>/g)].map(
          (m) => m[1] + m[2].replace(/\s+/g, " ").trim(),
        ),
      ].sort();
      if (f.length) former.set(navn, f);
    }

    expect(former.size, "der blev fundet ikoner").toBeGreaterThan(8);

    const set = [...former.entries()];
    for (let i = 0; i < set.length; i++) {
      for (let j = i + 1; j < set.length; j++) {
        const [a, fa] = set[i];
        const [b, fb] = set[j];
        expect(
          JSON.stringify(fa) === JSON.stringify(fb),
          `${a} og ${b} er tegnet ens`,
        ).toBe(false);
      }
    }
  });

  it("det aktive punkts fyldte krop findes på menuens egne ikoner", () => {
    /* Markeringen er hele grunden til, at et aktivt punkt kan ses på afstand.
       Et menuikon uden `krop` bliver et hul i mønsteret: alle de andre fyldes,
       og netop dét ene gør ikke. */
    const s = kilde("src/components/nav-icons.tsx");
    const brugte = new Set(
      MENUER.flatMap(([sti]) =>
        [...kilde(sti).matchAll(/icon:\s*"(\w+)"/g)].map((m) => m[1]),
      ),
    );
    const kort = s.slice(s.indexOf("export const NAV_ICONS"));
    for (const noegle of brugte) {
      const m = new RegExp(`${noegle}:\\s*(\\w+)`).exec(kort);
      expect(m, `${noegle} står i NAV_ICONS`).toBeTruthy();
      const fn = m![1];
      const stykke = s.slice(s.indexOf(`export function ${fn}`));
      const slut = stykke.indexOf("\nexport ", 1);
      expect(
        (slut === -1 ? stykke : stykke.slice(0, slut)).includes("krop="),
        `${fn} har ingen fyldt krop til det aktive punkt`,
      ).toBe(true);
    }
  });
});
