import { describe, it, expect } from "vitest";
import {
  laesVenteliste,
  ventelisteMail,
  interesseValg,
  interesseNavn,
  VED_IKKE,
} from "./venteliste";
import { KATALOG } from "./constants";

/**
 * Ventelisten til åbningen.
 *
 * FORMULAREN ER OFFENTLIG OG SENDER EN MAIL. Det gør valideringen til mere
 * end en høflighed: uden den kan en robot fylde indbakken, og et forkert
 * telefonnummer betyder, at nogen aldrig bliver ringet op — uden at opdage
 * hvorfor.
 */

const gyldig = (over: Record<string, unknown> = {}) => ({
  navn: "Mette Hansen",
  email: "mette@cafeaurora.dk",
  telefon: "",
  interesse: VED_IKKE,
  ...over,
});

describe("interesseValg", () => {
  /** Varerne hentes fra kataloget, så listen ikke kan drive fra det, vi sælger. */
  it("rummer alle offentlige varer plus 'ved ikke'", () => {
    const vaerdier = interesseValg().map((v) => v.vaerdi);
    for (const p of KATALOG) expect(vaerdier, p.slug).toContain(p.slug);
    expect(vaerdier).toContain(VED_IKKE);
    expect(vaerdier).toHaveLength(KATALOG.length + 1);
  });

  it("kender ikke et valg, der ikke findes", () => {
    expect(interesseNavn("noget-andet")).toBeNull();
  });
});

describe("laesVenteliste", () => {
  it("tager imod det mindst mulige: navn, mail og et valg", () => {
    expect(laesVenteliste(gyldig()).ok).toBe(true);
  });

  it("kræver navn og en brugbar mailadresse", () => {
    expect(laesVenteliste(gyldig({ navn: "" })).fejl.navn).toBeTruthy();
    expect(laesVenteliste(gyldig({ navn: "M" })).fejl.navn).toBeTruthy();
    expect(
      laesVenteliste(gyldig({ email: "ikke en mail" })).fejl.email,
    ).toBeTruthy();
  });

  /**
   * TELEFON ER FRIVILLIGT, men et forkert nummer må ikke glide igennem: så
   * tror kunden, vi kan ringe, og opdager først noget, når vi ikke gør.
   */
  it("accepterer et tomt telefonnummer, men ikke et forkert", () => {
    expect(
      laesVenteliste(gyldig({ telefon: "" })).fejl.telefon,
    ).toBeUndefined();
    expect(laesVenteliste(gyldig({ telefon: "+45 12 34 56 78" })).ok).toBe(
      true,
    );
    expect(
      laesVenteliste(gyldig({ telefon: "ring til mig" })).fejl.telefon,
    ).toBeTruthy();
  });

  it("afviser et valg, der ikke står på listen", () => {
    expect(
      laesVenteliste(gyldig({ interesse: "" })).fejl.interesse,
    ).toBeTruthy();
    expect(
      laesVenteliste(gyldig({ interesse: "ekstra-stander" })).fejl.interesse,
      "tilkøb er ikke et valg — det har ingen egen side",
    ).toBeTruthy();
  });

  /** Lofterne findes for indbakkens skyld, ikke for sikkerhedens. */
  it("afviser felter, der er urimeligt lange", () => {
    expect(
      laesVenteliste(gyldig({ navn: "a".repeat(200) })).fejl.navn,
    ).toBeTruthy();
  });
});

describe("ventelisteMail", () => {
  it("skriver alt det, der skal til for at ringe tilbage", () => {
    const { emne, tekst } = ventelisteMail({
      navn: "Mette Hansen",
      email: "mette@cafeaurora.dk",
      telefon: "+45 12345678",
      interesse: KATALOG[0].slug,
    });
    expect(emne).toContain("Mette Hansen");
    expect(emne).toContain(KATALOG[0].name);
    expect(tekst).toContain("mette@cafeaurora.dk");
    expect(tekst).toContain("+45 12345678");
  });

  /** Et tomt felt skal SIGE at det er tomt — ikke bare stå blankt. */
  it("siger tydeligt, når telefonnummeret mangler", () => {
    const { tekst } = ventelisteMail({
      navn: "Mette",
      email: "m@eksempel.dk",
      telefon: "",
      interesse: VED_IKKE,
    });
    expect(tekst).toContain("ikke oplyst");
  });
});
