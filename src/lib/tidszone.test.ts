import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { formatDate, formatDateTime } from "./utils";
import { TIDSZONE } from "./dansk-dag";

/**
 * ALT, DER VISES TIL EN BUTIK ELLER EN KUNDE, STÅR I DANSK TID.
 *
 * `Intl.DateTimeFormat` uden `timeZone` bruger den tidszone, koden tilfældigvis
 * kører i. Serverfunktionerne kører i UTC, og komponenterne tegnes på
 * serveren — så tallene på skærmen var ude af takt med uret på væggen: en
 * eller to timer forkert, og DATOEN forkert for alt mellem kl. 22 og midnat.
 *
 * MÅLT PÅ EN RIGTIG RÆKKE 2026-09-15: en kundes anmeldelse ligger i basen
 * 2026-09-08T21:01:26Z, altså kl. **23.01** dansk tid. Dashboardet skrev
 * "8. sep., 21.01". Butikken kunne derfor ikke bruge tidspunktet til at finde
 * ud af, hvilken kunde det handlede om — og der står ikke noget om tidszoner
 * på skærmen, så der er ingen måde at gætte det på.
 *
 * Det var tredje udgave af samme fejl på én dag: den daglige stempelgrænse og
 * statistikkens "I dag" målte også fra serverens døgn. Derfor både en
 * ADFÆRDSPRØVE af de to fælles formattere og en FEJEPRØVE, der nægter at lade
 * en ny formatering slippe ind uden tidszone.
 */

describe("de fælles formattere viser dansk tid", () => {
  /** 2026-09-08T21:01:26Z = 23.01 dansk (sommertid, UTC+2). */
  const anmeldelsen = "2026-09-08T21:01:26.758716+00:00";

  it("formatDateTime viser klokkeslættet, kunden faktisk trykkede på", () => {
    expect(formatDateTime(anmeldelsen)).toContain("23.01");
    // Præcis det, dashboardet skrev før rettelsen.
    expect(formatDateTime(anmeldelsen)).not.toContain("21.01");
  });

  /**
   * DATOEN SKIFTER OGSÅ. Kl. 23.30 dansk er stadig 21.30 UTC samme dag — men
   * kl. 01.00 dansk er 23.00 UTC DAGEN FØR, og så skrev skærmen en forkert
   * dag.
   */
  it("formatDate viser den danske dag", () => {
    // 2026-09-16T22:30:00Z = 17. september kl. 00.30 dansk.
    expect(formatDate("2026-09-16T22:30:00Z")).toContain("17.");
  });

  /** Vintertid er UTC+1. Et fast tillæg på to timer ville være forkert her. */
  it("følger sommertidsskiftet", () => {
    // 2026-01-15T23:30:00Z = 16. januar kl. 00.30 dansk.
    expect(formatDate("2026-01-15T23:30:00Z")).toContain("16.");
    // 2026-01-15T22:30:00Z = 15. januar kl. 23.30 dansk — stadig den 15.
    expect(formatDate("2026-01-15T22:30:00Z")).toContain("15.");
  });

  it("tidszonen er ét navn ét sted", () => {
    expect(TIDSZONE).toBe("Europe/Copenhagen");
  });
});

/**
 * FEJEPRØVEN. Den fanger den NÆSTE formatering, ikke de otte, der er rettet.
 *
 * Uden den er rettelsen kun sand i dag: den slags kald skrives et par gange om
 * året, og `timeZone` er præcis dét, man ikke kommer i tanke om, når man
 * kigger på sin egen skærm — som står i dansk tid.
 */
describe("ingen ny datoformatering slipper ind uden tidszone", () => {
  function* filer(mappe: string): Generator<string> {
    for (const navn of readdirSync(mappe)) {
      const sti = join(mappe, navn);
      if (statSync(sti).isDirectory()) yield* filer(sti);
      else if (/\.tsx?$/.test(navn) && !navn.includes(".test.")) yield sti;
    }
  }

  it("hver DateTimeFormat/toLocale*-kald bærer timeZone", () => {
    const synder: string[] = [];

    for (const sti of filer("src")) {
      const kilde = readFileSync(sti, "utf8");
      const udtryk = /(toLocaleDateString|toLocaleString|new Intl\.DateTimeFormat)\s*\(/g;

      for (const m of kilde.matchAll(udtryk)) {
        const foran = kilde.slice(Math.max(0, m.index - 40), m.index);
        // Tal og beløb formateres også med toLocaleString — de har ingen
        // tidszone og skal ingen have.
        if (/NumberFormat/.test(foran)) continue;
        if (/\b(n|amount|beloeb|total)\s*\.$/.test(foran)) continue;

        // Kun kaldets EGET optionsobjekt tæller — frem til første `}`.
        const seg = kilde.slice(m.index, m.index + 400).split("}")[0];
        if (!seg.includes("timeZone")) {
          const linje = kilde.slice(0, m.index).split("\n").length;
          synder.push(`${sti}:${linje}`);
        }
      }
    }

    expect(
      synder,
      "en dato uden `timeZone` vises i serverens tid (UTC), ikke butikkens — " +
        "tilføj `timeZone: TIDSZONE` fra @/lib/dansk-dag",
    ).toEqual([]);
  });
});
