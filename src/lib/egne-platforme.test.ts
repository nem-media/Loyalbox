import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  laesEgnePlatforme,
  resolvePublicReviewLinks,
  MAKS_EGNE_PLATFORME,
  MAKS_ANMELDELSESLINKS,
} from "./stands";
import { reviewChoices } from "./review-flow";
import type { Database } from "./types/database";

type Stand = Database["public"]["Tables"]["stands"]["Row"];

/** Kun de felter, funktionerne rører. Resten er ligegyldigt her. */
const stander = (over: Partial<Stand>): Stand =>
  ({
    id: "s1",
    company_id: "c1",
    name: "Disken",
    slug: "abc123",
    destination_type: "google",
    google_review_url: null,
    trustpilot_url: null,
    facebook_url: null,
    custom_url: null,
    custom_label: null,
    egne_platforme: [],
    is_active: true,
    kun_viderestilling: false,
    created_at: "2026-09-09T00:00:00Z",
    ...over,
  }) as Stand;

describe("laesEgnePlatforme", () => {
  it("læser et brugbart par", () => {
    expect(
      laesEgnePlatforme([{ navn: "jameda", url: "https://jameda.de/x" }]),
    ).toEqual([{ navn: "jameda", url: "https://jameda.de/x" }]);
  });

  /**
   * KOLONNEN ER JSONB og kan indeholde hvad som helst — en håndredigering i
   * Supabase, en ældre form, en halv skrivning. Anmeldelsessiden er dét,
   * BUTIKKENS KUNDER møder, og den må ikke kunne vælte af en uventet værdi.
   */
  it("springer det ubrugelige over i stilhed", () => {
    expect(laesEgnePlatforme(null)).toEqual([]);
    expect(laesEgnePlatforme("ikke et array")).toEqual([]);
    expect(laesEgnePlatforme([{ navn: "kun navn" }])).toEqual([]);
    expect(laesEgnePlatforme([{ url: "https://kun.url" }])).toEqual([]);
    expect(laesEgnePlatforme([{ navn: "  ", url: "https://x.dk" }])).toEqual([]);
    expect(laesEgnePlatforme([42, null, "x"])).toEqual([]);
  });

  it("tager højst to", () => {
    const mange = Array.from({ length: 5 }, (_, i) => ({
      navn: `P${i}`,
      url: `https://p${i}.dk`,
    }));
    expect(laesEgnePlatforme(mange)).toHaveLength(MAKS_EGNE_PLATFORME);
  });
});

describe("resolvePublicReviewLinks med egne platforme", () => {
  it("lægger de egne efter de kendte", () => {
    const links = resolvePublicReviewLinks(
      stander({
        google_review_url: "https://g.page/r/x",
        egne_platforme: [{ navn: "jameda", url: "https://jameda.de/x" }],
      }),
    );
    expect(links.map((l) => l.platform)).toEqual(["Google", "jameda"]);
  });

  /**
   * TO EGNE PLATFORME ER BEGGE `custom`. Uden en entydig nøgle ville React
   * kunne genbruge det forkerte element i listen — og knappen pege på den
   * anden platforms adresse.
   */
  it("giver hver egen platform sin egen nøgle", () => {
    const valg = reviewChoices(
      resolvePublicReviewLinks(
        stander({
          egne_platforme: [
            { navn: "A", url: "https://a.dk" },
            { navn: "B", url: "https://b.dk" },
          ],
        }),
      ),
    );
    const noegler = valg.map((v) => v.key);
    expect(new Set(noegler).size, noegler.join(",")).toBe(noegler.length);
  });

  /** Sidste skanse — den rigtige afvisning sker, når der gemmes. */
  it("viser aldrig flere end grænsen", () => {
    const links = resolvePublicReviewLinks(
      stander({
        google_review_url: "https://g.page/r/x",
        trustpilot_url: "https://trustpilot.com/x",
        facebook_url: "https://facebook.com/x",
        egne_platforme: [
          { navn: "A", url: "https://a.dk" },
          { navn: "B", url: "https://b.dk" },
        ],
      }),
    );
    expect(links).toHaveLength(MAKS_ANMELDELSESLINKS);
  });
});

/**
 * NEUTRALITETEN MÅ IKKE VAKLE, fordi der kom flere platforme til.
 *
 * `reviewChoices()` får stadig ikke bedømmelsen, og alle valg vejer det
 * samme. Bliver et af de nye valg gjort "primært" på en anden måde, er det
 * review gating med ekstra trin.
 */
describe("flere platforme ændrer ikke reglen", () => {
  const valg = reviewChoices(
    resolvePublicReviewLinks(
      stander({
        google_review_url: "https://g.page/r/x",
        egne_platforme: [{ navn: "jameda", url: "https://jameda.de/x" }],
      }),
    ),
  );

  it("giver alle valg samme vægt", () => {
    for (const v of valg) expect(v.weight, v.key).toBe("primary");
  });

  it("beholder feedback direkte til butikken som et valg", () => {
    expect(valg.some((v) => v.kind === "private")).toBe(true);
  });

  /** Signaturen er værnet: den kan ikke sortere efter noget, den ikke får. */
  it("tager stadig ikke bedømmelsen som argument", () => {
    const kilde = readFileSync(
      join(process.cwd(), "src/lib/review-flow.ts"),
      "utf8",
    );
    expect(kilde).toMatch(/export function reviewChoices\(\s*publicLinks: PublicLink\[\],?\s*\)/);
  });
});

/**
 * GRÆNSEN HÅNDHÆVES, HVOR VALGET TRÆFFES.
 *
 * Sattes den kun ved visningen, ville panelet vise et link, butikkens kunder
 * aldrig fik — og det ville ingen opdage. Prøves i kilden, fordi handlingen
 * kræver hele Next-runtimen for at kunne kaldes.
 */
describe("gemningen afviser den fjerde platform", () => {
  const KILDE = readFileSync(
    join(process.cwd(), "src/app/dashboard/actions.ts"),
    "utf8",
  );

  it("tæller alle anmeldelseslinks og siger fra", () => {
    expect(KILDE).toMatch(/MAKS_ANMELDELSESLINKS/);
    expect(KILDE).toMatch(/antalLinks > MAKS_ANMELDELSESLINKS/);
  });

  it("kræver både navn og link, og validerer adressen", () => {
    expect(KILDE).toMatch(/erGyldigUrl\(url\)/);
    expect(KILDE).toMatch(/Skriv både navn og link/);
  });
});
