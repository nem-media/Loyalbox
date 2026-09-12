import { describe, it, expect } from "vitest";
import { kortManifest, kortManifestSti, KORT_NAVN_MAKS } from "./kort-manifest";
import { SITE_NAME } from "./constants";

/**
 * Kortets eget manifest.
 *
 * DET AFGØRENDE ER `start_url`. Det fælles manifest starter på /mine-kort, som
 * kræver en konto — og et stempelkort virker UDEN konto. Peger det her samme
 * sted hen, får en kunde uden login et ikon på hjemmeskærmen, der åbner en
 * loginside, efter at have trykket "Læg kortet på min telefon".
 */

const TOKEN = "df47b8da447f4ed6e032e0482124a77a";

describe("kortManifest", () => {
  it("starter på KORTET og ikke på /mine-kort", () => {
    const m = kortManifest(TOKEN, "Café Aurora");
    expect(m.start_url).toBe(`/kort/${TOKEN}`);
    expect(m.start_url).not.toContain("mine-kort");
  });

  it("giver hvert kort sit eget id, så to kort ikke bliver ét ikon", () => {
    const a = kortManifest("aaa", "Café Aurora");
    const b = kortManifest("bbb", "Café Aurora");
    expect(a.id).not.toBe(b.id);
  });

  it("bruger butikkens navn, så ikonet hedder det sted, stemplerne er fra", () => {
    const m = kortManifest(TOKEN, "Café Aurora");
    expect(m.name).toContain("Café Aurora");
    expect(m.short_name).toBe("Café Aurora");
  });

  it("klipper et langt butiksnavn, så telefonen ikke gør det midt i et ord", () => {
    const m = kortManifest(TOKEN, "Frisør Nielsine i Nuuk");
    expect(m.short_name.length).toBeLessThanOrEqual(KORT_NAVN_MAKS);
    expect(m.short_name.endsWith("…")).toBe(true);
  });

  it("falder tilbage på vores eget navn, hvis butikken ikke har et", () => {
    // Navnet kan være tomt i basen; et ikon uden tekst er værre end vores navn.
    expect(kortManifest(TOKEN, "   ").short_name).toBe(SITE_NAME);
    expect(kortManifest(TOKEN, null).short_name).toBe(SITE_NAME);
  });

  it("scope dækker start_url — ellers åbner appen i browseren", () => {
    const m = kortManifest(TOKEN, "Café Aurora");
    expect(m.start_url.startsWith(m.scope)).toBe(true);
  });

  it("stien til manifestet ligger under kortets egen adresse", () => {
    // Siden og ruten skal være enige; derfor står stien ét sted.
    expect(kortManifestSti(TOKEN)).toBe(
      `/kort/${TOKEN}/manifest.webmanifest`,
    );
  });
});
