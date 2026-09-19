import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { KOMPLET_FUNKTIONER, getProduct } from "./constants";
import { GUIDES } from "./guides";

/**
 * LOYALITET ER TO FORMER — OG DEN ANDEN BLEV GLEMT HVER GANG.
 *
 * Stempelkortet kom først, og i et år betød "loyalitet" præcis ét stempelkort.
 * Pointprogrammet kom til i 0044/0045 med sine egne tabeller og sine egne
 * sider — men de steder, der SPØRGER om loyalitet, blev ved med kun at kigge
 * efter et stempelkort. Fejlene var ikke i pointkoden; de var i alt det
 * gamle, der aldrig lærte, at der var kommet en form mere.
 *
 * DET VÆRSTE EKSEMPEL: `/r/<slug>` — siden QR-koden lander på — afgjorde ud
 * fra `loyalty_programs` alene, om der overhovedet skulle vises en
 * tilmeldingsknap. Tilmeldingssiden kunne begge dele, men en butik med KUN et
 * pointprogram fik aldrig knappen derhen. Varen var købt, programmet aktivt,
 * og kunderne kunne ikke tilmelde sig.
 *
 * Prøverne her spørger til EGENSKABEN — "kigger stedet efter begge former?" —
 * og ikke til en bestemt ordlyd. Kommentarer skæres væk, så en begrundelse,
 * der nævner point, ikke kan bestå prøven i kodens sted.
 */

const kilde = (sti: string) =>
  readFileSync(sti, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("de steder, der spørger 'har butikken loyalitet?'", () => {
  /*
   * Hvert sted her stillede spørgsmålet som "findes der et stempelkort?".
   * Svaret skal komme fra BEGGE tabeller, ellers er en pointbutik usynlig.
   */
  const STEDER: [string, string][] = [
    ["src/app/r/[slug]/page.tsx", "standeren kunden scanner"],
    ["src/app/dashboard/loyalitet/page.tsx", "loyalitetsoverblikket"],
    ["src/app/dashboard/standere/[id]/page.tsx", "standerens side i dashboardet"],
    ["src/app/kort/tilmeld/[slug]/page.tsx", "tilmeldingssiden"],
  ];

  for (const [sti, hvad] of STEDER) {
    it(`${hvad} kigger efter et pointprogram og ikke kun et stempelkort`, () => {
      const s = kilde(sti);
      expect(s, `${sti} slår stempelkort op`).toContain("loyalty_programs");
      expect(
        /hentAktivePointProgrammer|hentPointProgrammer|loyalty_point_programs/.test(
          s,
        ),
        `${sti} spørger kun om stempelkort`,
      ).toBe(true);
    });
  }

  /*
   * OG SVARET SKAL KOMBINERES, ikke bare hentes. Det er muligt at slå
   * pointprogrammet op og alligevel træffe beslutningen på stempelkortet
   * alene — det var netop, hvad overblikket gjorde: listen blev hentet
   * længere nede, efter at siden allerede var vendt tilbage med onboarding.
   */
  it("standeren åbner døren, når ENTEN stempelkort ELLER point findes", () => {
    const s = kilde("src/app/r/[slug]/page.tsx");
    expect(s).toMatch(/const hasLoyalty = harStempelkort \|\| harPoint/);
  });

  it("overblikket viser kun onboarding, når BEGGE dele mangler", () => {
    const s = kilde("src/app/dashboard/loyalitet/page.tsx");
    expect(s).toMatch(/!programCount && pointProgrammerFoerst\.length === 0/);
  });

  it("standersiden efterlyser kun loyalitet, når BEGGE dele mangler", () => {
    const s = kilde("src/app/dashboard/standere/[id]/page.tsx");
    expect(s).toMatch(/!program && pointProgrammer\.length === 0/);
  });
});

describe("det, kunden får at vide om hvad der følger med", () => {
  /*
   * "Hvad får jeg / hvad får jeg ikke" er dér, en glemt funktion koster
   * mest: den koster et salg, eller den får en kunde til at lede efter noget,
   * de allerede betaler for.
   */
  const KOMPLET = getProduct("loyalsum-komplet")!;
  const ONLINE = getProduct("loyalsum-komplet-online")!;

  it("begge Komplet-varer nævner pointprogrammet i deres egen tekst", () => {
    for (const vare of [KOMPLET, ONLINE]) {
      const tekst = [
        vare.tagline,
        vare.description,
        vare.metaDescription ?? "",
        vare.metaTitle ?? "",
        ...vare.features,
      ]
        .join(" ")
        .toLowerCase();
      expect(tekst, `${vare.slug} nævner stempelkort`).toContain("stempelkort");
      expect(tekst, `${vare.slug} nævner point`).toMatch(/point/);
    }
  });

  it("muren, der siger nej, nævner begge former", () => {
    /* En Pro-kunde læser præcis dette for at finde ud af, hvad de mangler. */
    const mur = kilde("src/app/dashboard/loyalitet/layout.tsx");
    expect(mur).toMatch(/stempelkort/i);
    expect(mur).toMatch(/pointprogram/i);
  });

  it("abonnementslinjen dækker begge former", () => {
    const linje = KOMPLET_FUNKTIONER.find((f) => f.rute.includes("loyalitet"));
    expect(linje, "loyalitetslinjen findes").toBeTruthy();
    expect(linje!.label.toLowerCase()).toContain("stempelkort");
    expect(linje!.label.toLowerCase()).toMatch(/point/);
  });

  it("der findes en vejledning i at oprette et pointprogram", () => {
    /* Hjælpesiden havde ni vejledninger og ikke én om pointprogrammet — en
       funktion, kunden betaler for i LoyalSum Komplet. */
    const g = GUIDES.find((x) => x.id === "pointprogram");
    expect(g, "vejledningen findes").toBeTruthy();
    expect(g!.kraever, "den hører til Komplet").toBe("komplet");
    expect(g!.steps.length).toBeGreaterThanOrEqual(3);
  });
});

describe("det juridiske beskriver også pointdata", () => {
  /*
   * En pointsaldo og bevægelserne bag den er personoplysninger på lige fod
   * med stempler. Stod de ikke i databehandleraftalen, i fristerne og i
   * sletningsbeskeden, lovede dokumenterne noget andet, end systemet gør.
   */
  const FILER = [
    "src/lib/dpa.ts",
    "src/lib/opbevaring.ts",
    "src/lib/sletning.ts",
    "src/app/privatliv/page.tsx",
    "src/app/handelsbetingelser/page.tsx",
  ];

  for (const sti of FILER) {
    it(`${sti} nævner point ved siden af stempler`, () => {
      const s = kilde(sti).toLowerCase();
      expect(s, "nævner stempler").toMatch(/stempel|stempler/);
      expect(s, "nævner point").toMatch(/point/);
    });
  }
});
