import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * FEJLEN, DENNE PASSER PÅ: "Vis logo" tegnede før kun et bogstav-mærke, fordi
 * ruten aldrig hentede virksomhedens `logo_url`. Nu skal ruten både LÆSE
 * logo_url og sende et logo videre til billedet, og en redigeret tekst skal
 * kunne styre opslaget. Kildeprøve, fordi ruten renderer et billede via next/og.
 */
const KILDE = readFileSync(
  join(process.cwd(), "src/app/dashboard/opslag/image/route.ts"),
  "utf8",
);

describe("opslags-billedruten", () => {
  it("henter virksomhedens logo_url og sender et logo til billedet", () => {
    expect(KILDE).toMatch(/select\("name, logo_url"\)/);
    expect(KILDE).toContain("logoDataUri(company?.logo_url)");
    expect(KILDE).toContain("logoDataUri: logo");
  });

  it("normaliserer logoet til PNG (så SVG/webp også virker i Satori)", () => {
    expect(KILDE).toContain("sharp(raa)");
    expect(KILDE).toContain("data:image/png;base64");
  });

  it("bruger den redigerede tekst, når der er en", () => {
    expect(KILDE).toContain('q.get("text")');
    expect(KILDE).toContain("egenTekst || template.text");
  });

  it("bygger egen-farve-baggrund ud fra c-parameteren", () => {
    expect(KILDE).toContain("customBackground(q.get(\"c\")");
  });
});
