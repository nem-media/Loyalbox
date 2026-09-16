import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * "GEM PÅ MIN KONTO" ER UIGENKALDELIG — OG TEKSTEN SKAL SIGE DET.
 *
 * Fundet på en rigtig gennemgang af kundens rejse 2026-09-16: panelet lovede
 * kun "Så kan du altid finde det igen — også hvis du skifter telefon". Sandt
 * for den, der trykker. Men handlingen er eksklusiv og permanent:
 *
 *  - et kort kan kun ligge på ÉN konto (`claimCardForUser` afviser en anden),
 *  - der findes INGEN "fjern fra min konto" nogen steder i systemet,
 *  - bagefter spærrer `selfEnroll()` for at åbne kortet med e-mail/telefon,
 *  - og `/kort/find` sender ikke tokenet til et kort på en konto.
 *
 * For alle andre end den, der trykkede, betyder knappen altså det stik
 * modsatte af, hvad der stod. Og kortets adresse er ét link, som bliver delt:
 * kunden viser kortet til en, der selv er logget ind, og ét klik flytter det
 * permanent.
 *
 * MODELLEN ÆNDRES IKKE. Besiddelse af tokenet ER autorisationen, og det er
 * dét, der gør, at kortet virker uden konto. Det, der manglede, var at sige
 * konsekvensen højt, før nogen trykker.
 */

const PANEL = readFileSync(
  join(process.cwd(), "src/app/kort/[token]/save-card-panel.tsx"),
  "utf8",
);

/** Kun det, kunden FÅR AT SE — ikke forklaringen til den næste udvikler. */
const SYNLIG = PANEL.replace(/\/\*[\s\S]*?\*\//g, "").replace(
  /\{\/\*[\s\S]*?\*\/\}/g,
  "",
);

describe("panelet siger, hvad handlingen koster", () => {
  it("nævner at kortet kun kan ligge ét sted", () => {
    expect(SYNLIG).toMatch(/kun ligge/i);
    expect(SYNLIG).toMatch(/én<\/span>\s*konto|én konto/i);
  });

  it("nævner at det ikke kan gøres om", () => {
    expect(SYNLIG).toMatch(/kan det ikke flyttes|ikke fortrydes|kan ikke gøres om/i);
  });

  /**
   * DEN VIGTIGSTE SÆTNING. Mister kunden linket bagefter, er e-mail-vejen
   * lukket — og dét er præcis den vej, resten af produktet lover ("uden app ·
   * uden konto").
   */
  it("nævner at e-mail-vejen lukker", () => {
    expect(SYNLIG).toMatch(/e-?mail/i);
    expect(SYNLIG).toMatch(/hentes frem|findes frem|åbne/i);
  });

  it("står FØR knappen og ikke som en note bagefter", () => {
    const advarsel = SYNLIG.search(/kun ligge/i);
    const knap = SYNLIG.search(/Gem på min konto/);
    expect(advarsel).toBeGreaterThan(-1);
    expect(knap).toBeGreaterThan(-1);
    expect(advarsel).toBeLessThan(knap);
  });
});

describe("der er stadig ingen vej tilbage — og dét er dét, teksten dækker", () => {
  /**
   * Prøven er her, fordi advarslen kun er SAND, så længe der ikke findes en
   * fortryd-knap. Bygges en dag en "fjern fra min konto", skal teksten skrives
   * om — og så skal denne prøve fejle, så nogen husker det.
   */
  function* filer(mappe: string): Generator<string> {
    for (const navn of readdirSync(mappe)) {
      const sti = join(mappe, navn);
      if (statSync(sti).isDirectory()) yield* filer(sti);
      else if (/\.tsx?$/.test(navn) && !navn.includes(".test.")) yield sti;
    }
  }

  it("ingen handling frigiver et kort fra en konto", () => {
    const fundet: string[] = [];
    for (const sti of filer("src")) {
      const kode = readFileSync(sti, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      // En frigivelse ville nulstille ejeren på et medlem.
      if (
        /loyalty_members[\s\S]{0,300}?user_id:\s*null/.test(kode) ||
        /\bunclaimCard\b|\bfrigivKort\b/.test(kode)
      ) {
        fundet.push(sti);
      }
    }
    expect(
      fundet,
      "der findes nu en måde at frigive et kort på — skriv advarslen i " +
        "save-card-panel.tsx om, så den passer",
    ).toEqual([]);
  });
});
