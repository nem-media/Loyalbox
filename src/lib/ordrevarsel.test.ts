import { describe, it, expect } from "vitest";
import { ordrevarsel, type Ordredetaljer } from "./ordrevarsel";

/**
 * Varslet er den eneste besked, der fortæller et menneske, at der skal pakkes
 * noget. Bliver den utydelig, bliver en ordre ikke sendt — og kunden opdager
 * det før os.
 */
function ordre(over: Partial<Ordredetaljer> = {}): Ordredetaljer {
  return {
    type: "engangskoeb",
    vare: "Reviewstander",
    antal: 1,
    beloeb: 399,
    firmanavn: "Café Hjørnet",
    cvr: "37811769",
    email: "hej@cafehjoernet.dk",
    leveringslinjer: ["Café Hjørnet", "Storegade 1", "8000 Aarhus C", "DK"],
    sessionId: "cs_test_abc",
    ...over,
  };
}

describe("ordrevarsel", () => {
  it("sætter HANDLINGEN øverst, ikke beløbet", () => {
    // Beløbet kan slås op. At der skal pakkes noget, kan ikke gættes.
    const { tekst } = ordrevarsel(ordre());
    expect(tekst.split("\n")[0]).toContain("SKAL PRODUCERES OG SENDES");
    expect(tekst.split("\n")[0]).toContain("1 stk. Reviewstander");
  });

  it("siger tydeligt, når der ikke skal sendes noget", () => {
    const { tekst } = ordrevarsel(
      ordre({ type: "opgradering", leveringslinjer: [] }),
    );
    expect(tekst.split("\n")[0]).toContain("Ingen forsendelse");
    expect(tekst).toContain("Leveringsadresse: ingen");
  });

  it("har firma og beløb i emnet, så indbakken kan skimmes", () => {
    const { emne } = ordrevarsel(ordre());
    expect(emne).toContain("Café Hjørnet");
    expect(emne).toContain("399");
    expect(emne).toContain("Nyt køb");
  });

  it("skelner købstyperne i emnet", () => {
    expect(ordrevarsel(ordre({ type: "tilkoeb" })).emne).toContain("Tilkøb");
    expect(ordrevarsel(ordre({ type: "opgradering" })).emne).toContain(
      "Opgradering",
    );
    expect(ordrevarsel(ordre({ type: "nyt-abonnement" })).emne).toContain(
      "Nyt abonnement",
    );
  });

  it("tager det løbende beløb med, når der er et", () => {
    const { tekst } = ordrevarsel(
      ordre({ type: "nyt-abonnement", maanedligt: 399 }),
    );
    expect(tekst).toContain("pr. måned");
    expect(ordrevarsel(ordre()).tekst).not.toContain("pr. måned");
  });

  it("siger hvad der mangler frem for at udelade linjen", () => {
    // En manglende linje ser ud som om oplysningen ikke findes. En linje, der
    // siger "ikke oplyst", fortæller at der blev spurgt.
    const { tekst } = ordrevarsel(
      ordre({ firmanavn: null, cvr: null, email: null }),
    );
    expect(tekst).toContain("(intet firmanavn)");
    expect(tekst).toContain("(ikke oplyst)");
  });

  it("skriver antal ud, når der er flere", () => {
    const { tekst } = ordrevarsel(ordre({ antal: 12, beloeb: 4069 }));
    expect(tekst).toContain("12 stk.");
    expect(tekst).toContain("× 12");
  });
});
