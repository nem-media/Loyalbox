import { describe, it, expect } from "vitest";
import { erGyldigtCvr, normaliserCvr, visCvr } from "./cvr";
import { COMPANY } from "./constants";

/**
 * CVR-nummeret er spærren mod, at en privatperson køber på vilkår, der
 * forudsætter et erhvervskøb. Går kontrollen i stykker, forsvinder spærren
 * uden at noget fejler — derfor testen.
 */
describe("CVR-kontrol", () => {
  it("godtager vores eget nummer", () => {
    // Modulus 11-regnestykket er verificeret mod netop dette nummer.
    expect(erGyldigtCvr(COMPANY.cvr)).toBe(true);
  });

  it("godtager kendte gyldige numre", () => {
    for (const cvr of ["37811769", "25313763", "10150817"]) {
      expect(erGyldigtCvr(cvr), cvr).toBe(true);
    }
  });

  it("fanger et forkert ciffer", () => {
    // Den hyppigste tastefejl. En længdekontrol ville lade den passere.
    expect(erGyldigtCvr("37811768")).toBe(false);
    expect(erGyldigtCvr("37811760")).toBe(false);
  });

  it("fanger to ombyttede cifre", () => {
    // Den næsthyppigste. 37811769 → 37811796
    expect(erGyldigtCvr("37811796")).toBe(false);
  });

  it("afviser alt der ikke er otte cifre", () => {
    for (const forkert of [
      "",
      "3781176",
      "378117690",
      "abcdefgh",
      "3781 176",
      null,
      undefined,
    ]) {
      expect(erGyldigtCvr(forkert), String(forkert)).toBe(false);
    }
  });

  it("afviser nul, som ellers består regnestykket", () => {
    expect(erGyldigtCvr("00000000")).toBe(false);
  });

  it("tilgiver mellemrum, punktummer og DK-præfiks", () => {
    for (const skrevet of [
      " 37811769 ",
      "37 81 17 69",
      "37.81.17.69",
      "DK37811769",
      "dk 37811769",
    ]) {
      expect(erGyldigtCvr(skrevet), skrevet).toBe(true);
      expect(normaliserCvr(skrevet)).toBe("37811769");
    }
  });

  it("viser nummeret med landekode", () => {
    expect(visCvr(" 37 81 17 69 ")).toBe("DK 37811769");
  });
});
