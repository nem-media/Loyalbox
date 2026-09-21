import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import manifest from "@/app/manifest";
import { kortManifest } from "./kort-manifest";

/**
 * APP-IKONET MÅ IKKE VÆRE GENNEMSIGTIGT.
 *
 * `icon-512.png` var en gennemsigtig stjerne OG erklæret `purpose: "maskable"`.
 * En maskable-ikon er et LØFTE til styresystemet om, at hele fladen er dækket:
 * launcheren beskærer til sin egen form og fylder selv resten ud — med SORT,
 * når der ikke er noget. Det samme gælder `apple-icon.png`, for iOS
 * understøtter slet ikke gennemsigtighed i et hjemmeskærmsikon. Meldt af
 * brugeren, set på Android.
 *
 * FEJLEN KAN IKKE SES I KODEN OG HELLER IKKE PÅ EN SKÆRM: filen ser rigtig ud
 * i enhver billedfremviser, der tegner den på hvidt. Den viser sig først på en
 * hjemmeskærm. Derfor måles filerne her.
 *
 * Filerne laves af `scripts/lav-app-ikoner.mjs`.
 */

const IKONER = [
  "public/icon-192.png",
  "public/icon-512.png",
  "public/icon-maskable-512.png",
  "src/app/icon.png",
  "src/app/apple-icon.png",
];

describe("app-ikonerne", () => {
  for (const sti of IKONER) {
    it(`${sti} er helt uigennemsigtig`, async () => {
      const { data, info } = await sharp(readFileSync(sti))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      /* HJØRNERNE ER DÉR, DET GÅR GALT, og det er også dér, en launcher
         beskærer. Alle fire tjekkes, plus den laveste alfa i hele billedet —
         et enkelt gennemsigtigt hul midt i mærket ville også blive sort. */
      let mindst = 255;
      for (let i = 3; i < data.length; i += info.channels) {
        if (data[i] < mindst) mindst = data[i];
      }
      expect(
        mindst,
        `${sti} har en gennemsigtig pixel — en launcher fylder den med sort`,
      ).toBe(255);
    });
  }

  it("maskable har sin EGEN fil", () => {
    /* Den må ikke dele fil med "any": den ene skal fylde, den anden skal
       holde sig inden for de inderste 80 %. Deler de fil, bliver mærkets
       spidser klippet af — eller også bliver "any" unødigt lille. */
    for (const m of [manifest(), kortManifest("abc", "Testbutik")]) {
      const maskable = m.icons!.filter((i) =>
        String(i.purpose ?? "").includes("maskable"),
      );
      const any = m.icons!.filter((i) => String(i.purpose ?? "") === "any");
      expect(maskable.length).toBeGreaterThan(0);
      expect(any.length).toBeGreaterThan(0);
      for (const mi of maskable) {
        for (const ai of any) {
          expect(
            mi.src,
            "maskable og any peger på den samme fil",
          ).not.toBe(ai.src);
        }
      }
    }
  });

  it("mærket holder sig inden for den sikre zone i maskable-udgaven", async () => {
    /* KUN DE INDERSTE 80 % ER SIKRE. Måles på ALFA ville sige ingenting nu,
       hvor fladen er dækket — så der måles på FARVE: hvor langt ud fra midten
       findes en pixel, der ikke er baggrunden? Stjernens spidser er dét, der
       først bliver klippet, og de er netop pixels, der skiller sig ud. */
    const { data, info } = await sharp(
      readFileSync("public/icon-maskable-512.png"),
    )
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const midt = { x: info.width / 2, y: info.height / 2 };
    const bg = (() => {
      const i = 0; // hjørnet er baggrund
      return [data[i], data[i + 1], data[i + 2]];
    })();

    let yderst = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * info.channels;
        const afvig =
          Math.abs(data[i] - bg[0]) +
          Math.abs(data[i + 1] - bg[1]) +
          Math.abs(data[i + 2] - bg[2]);
        /* 60 er rigeligt over skærets egen variation (en blød gradient over
           hele fladen) og langt under mærkets kontrast mod bunden. */
        if (afvig < 60) continue;
        const r = Math.hypot(x - midt.x, y - midt.y);
        if (r > yderst) yderst = r;
      }
    }

    const sikkerRadius = (info.width / 2) * 0.8;
    expect(
      yderst,
      `mærket når ${Math.round(yderst)} px fra midten; den sikre zone stopper ved ${Math.round(sikkerRadius)}`,
    ).toBeLessThan(sikkerRadius);
  });
});
