import { describe, it, expect } from "vitest";
import { readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { POSTS, overskriftId, faqItems, relaterede } from "./blog";

/**
 * SEO-invarianter for bloggen.
 *
 * Testene her handler ikke om, at koden virker — de handler om, at indholdet
 * ikke saboterer sig selv. Alle fejlene nedenfor er tavse: siden bygger,
 * artiklen ser rigtig ud, og først uger senere ses det i Search Console.
 */

const ROD = process.cwd();

/** Alle ruter i appen, udledt af hvor der ligger en `page.tsx`. */
function ruter(): Set<string> {
  const fundet = new Set<string>();

  function gaa(dir: string, rute: string) {
    for (const navn of readdirSync(dir)) {
      const sti = join(dir, navn);
      if (!statSync(sti).isDirectory()) {
        if (navn === "page.tsx") fundet.add(rute === "" ? "/" : rute);
        continue;
      }
      // (grupper) findes ikke i URL'en; [dynamiske] segmenter kan ikke
      // efterprøves som statisk streng og springes over.
      if (navn.startsWith("(") || navn.startsWith("@")) gaa(sti, rute);
      else if (navn.startsWith("[")) continue;
      else gaa(sti, `${rute}/${navn}`);
    }
  }

  gaa(join(ROD, "src", "app"), "");
  return fundet;
}

/** Alle href-værdier i en artikels brødtekst. */
function links(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
}

function alHtml(post: (typeof POSTS)[number]): string[] {
  return post.body.flatMap((b) => {
    switch (b.type) {
      case "p":
        return [b.html];
      case "ul":
      case "ol":
        return b.items;
      case "table":
        return b.rows.flat();
      case "note":
        return [b.html];
      case "faq":
        return b.items.flatMap((i) => [i.q, i.a]);
      case "cta":
        return [b.href];
      default:
        return [];
    }
  });
}

describe("blogindhold", () => {
  it("har unikke slugs", () => {
    const set = new Set(POSTS.map((p) => p.slug));
    expect(set.size).toBe(POSTS.length);
  });

  /**
   * KANNIBALISERINGSVAGTEN.
   *
   * To sider, der jagter samme søgeord, konkurrerer med hinanden i stedet for
   * med konkurrenterne — Google vælger én af dem, og ofte den forkerte. Det er
   * sket før i projektet: et blogindlæg jagtede samme ord som `/stempelkort`
   * og måtte skrives om og viderestilles.
   *
   * De reserverede ord tilhører landingssiderne. En artikel må gerne handle om
   * emnet — den må bare ikke sigte efter det samme ord.
   */
  const RESERVEREDE: Record<string, string> = {
    stempelkort: "/stempelkort",
    "digitalt stempelkort": "/stempelkort",
    "digitalt stempelkort til virksomheder": "/stempelkort",
    reviewstander: "/reviewstander",
    anmeldelsesstander: "/reviewstander",
  };

  it("har unikke søgeord, og ingen der tilhører en landingsside", () => {
    const set = new Set<string>();
    for (const p of POSTS) {
      const kw = p.keyword.toLowerCase().trim();

      expect(
        RESERVEREDE[kw],
        `"${p.slug}" sigter efter "${kw}", som tilhører ${RESERVEREDE[kw]}`,
      ).toBeUndefined();

      expect(set.has(kw), `"${kw}" er brugt af to artikler`).toBe(false);
      set.add(kw);
    }
  });

  it("har et billede, der findes, og en alt-tekst der beskriver det", () => {
    for (const p of POSTS) {
      expect(
        existsSync(join(ROD, "public", p.image)),
        `${p.slug}: billedet ${p.image} findes ikke`,
      ).toBe(true);

      expect(p.imageAlt.length, `${p.slug}: alt-tekst mangler`).toBeGreaterThan(
        20,
      );
      // "Billede af …" er støj: skærmlæseren siger allerede, at det er et
      // billede, og Google får intet ud af ordet.
      expect(p.imageAlt.toLowerCase().startsWith("billede")).toBe(false);
    }
  });

  it("har beskrivelser, der kan være i et søgeresultat", () => {
    for (const p of POSTS) {
      // Under ~70 tegn spilder plads; over ~165 klippes den midt i en sætning.
      expect(
        p.description.length,
        `${p.slug}: beskrivelsen er ${p.description.length} tegn`,
      ).toBeGreaterThanOrEqual(70);
      expect(
        p.description.length,
        `${p.slug}: beskrivelsen er ${p.description.length} tegn`,
      ).toBeLessThanOrEqual(200);
    }
  });

  it("har interne links, der peger på noget, der findes", () => {
    const kendte = ruter();
    const slugs = new Set(POSTS.map((p) => p.slug));

    for (const p of POSTS) {
      for (const href of alHtml(p)
        .flatMap(links)
        .concat(p.body.flatMap((b) => (b.type === "cta" ? [b.href] : [])))) {
        if (!href.startsWith("/")) continue; // eksterne links efterprøves ikke
        const sti = href.split(/[?#]/)[0].replace(/\/$/, "");

        if (sti.startsWith("/blog/")) {
          expect(
            slugs.has(sti.slice("/blog/".length)),
            `${p.slug}: linker til ${href}, som ikke findes`,
          ).toBe(true);
          continue;
        }

        // Dynamiske ruter (fx /produkter/[slug]) kan ikke slås op statisk.
        if (sti.startsWith("/produkter/")) continue;

        expect(
          kendte.has(sti === "" ? "/" : sti),
          `${p.slug}: linker til ${href}, som ikke er en rute`,
        ).toBe(true);
      }
    }
  });

  it("linker ikke til sig selv", () => {
    for (const p of POSTS) {
      for (const href of alHtml(p).flatMap(links)) {
        expect(href, `${p.slug} linker til sig selv`).not.toBe(
          `/blog/${p.slug}`,
        );
      }
    }
  });

  it("har beslægtede artikler, der findes og ikke er artiklen selv", () => {
    for (const p of POSTS) {
      for (const slug of p.related ?? []) {
        expect(slug, `${p.slug}: beslægtet med sig selv`).not.toBe(p.slug);
      }
      expect(relaterede(p).length).toBe((p.related ?? []).length);
    }
  });

  it("har FAQ-spørgsmål med både spørgsmål og svar", () => {
    for (const p of POSTS) {
      for (const f of faqItems(p)) {
        expect(f.q.trim().length, `${p.slug}: tomt spørgsmål`).toBeGreaterThan(
          10,
        );
        // Et FAQ-svar bliver til strukturdata. Et for kort svar giver hverken
        // læseren eller Google noget.
        expect(f.a.trim().length, `${p.slug}: for kort svar`).toBeGreaterThan(
          40,
        );
      }
    }
  });

  it("giver hver overskrift i en artikel sit eget anker", () => {
    for (const p of POSTS) {
      const ider = p.body
        .filter((b) => b.type === "h2")
        .map((b) => overskriftId((b as { text: string }).text));

      expect(
        new Set(ider).size,
        `${p.slug}: to overskrifter giver samme anker`,
      ).toBe(ider.length);

      for (const id of ider) expect(id.length).toBeGreaterThan(0);
    }
  });

  /**
   * UDGIVELSESKADENCE.
   *
   * Seks artikler med samme dato er præcis det mønster, Google bruger til at
   * genkende masseproduceret indhold — og det så bloggen ud til at være, fordi
   * hele batchen blev skrevet på én dag. En blog, der udkommer med mellemrum,
   * ligner en, nogen passer.
   *
   * Reglen er mindst to dage mellem to udgivelser. Den står som en test og
   * ikke som en note, fordi den ellers bliver glemt af den, der tilføjer den
   * næste artikel — og fejlen kan først ses, når alle datoerne ligger der.
   */
  const MINDST_DAGES_MELLEMRUM = 2;

  it("udgiver ikke to artikler for tæt på hinanden", () => {
    const datoer = POSTS.map((p) => ({
      slug: p.slug,
      dato: new Date(p.date),
    })).sort((a, b) => a.dato.getTime() - b.dato.getTime());

    for (let i = 1; i < datoer.length; i++) {
      const dage =
        (datoer[i].dato.getTime() - datoer[i - 1].dato.getTime()) / 86_400_000;

      expect(
        dage,
        `"${datoer[i].slug}" udkommer ${dage} dag(e) efter "${datoer[i - 1].slug}"`,
      ).toBeGreaterThanOrEqual(MINDST_DAGES_MELLEMRUM);
    }
  });

  it("udgiver ikke i fremtiden", () => {
    // En udgivelsesdato frem i tiden får Google til at udskyde indekseringen,
    // og læseren ser en artikel, der endnu ikke er skrevet.
    const iDag = new Date().toISOString().slice(0, 10);
    for (const p of POSTS) {
      expect(
        p.date <= iDag,
        `${p.slug}: udgivet ${p.date}, i dag er ${iDag}`,
      ).toBe(true);
    }
  });

  it("har en opdateringsdato, der ligger efter udgivelsen", () => {
    for (const p of POSTS) {
      if (!p.updated) continue;
      expect(
        p.updated >= p.date,
        `${p.slug}: opdateret før den blev udgivet`,
      ).toBe(true);
    }
  });
});
