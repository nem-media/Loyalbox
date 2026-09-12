import { describe, it, expect } from "vitest";
import {
  laesKontakt,
  kontaktMail,
  emneNavn,
  EMNER,
  STANDARD_EMNE,
} from "./kontakt";
import { COMPANY } from "./constants";

/**
 * Kontaktformularen.
 *
 * FORMULAREN ER OFFENTLIG OG SENDER EN MAIL. Det gør valideringen til mere end
 * en høflighed: uden den kan en robot fylde indbakken, og en besked med en
 * ubrugelig svaradresse betyder, at nogen venter på et svar, vi ikke kan sende.
 */

const gyldig = (over: Record<string, unknown> = {}) => ({
  navn: "Mette Hansen",
  email: "mette@cafeaurora.dk",
  telefon: "",
  emne: STANDARD_EMNE,
  besked: "Hej, jeg vil gerne høre om stempelkort til min café.",
  ...over,
});

describe("emnerne", () => {
  it("standardvalget findes i listen", () => {
    // Formularen sætter STANDARD_EMNE som defaultValue. Passede de to ikke
    // sammen, ville en bruger, der ikke rører feltet, få sin egen besked
    // afvist på et felt, de aldrig så.
    expect(emneNavn(STANDARD_EMNE)).toBeTruthy();
  });

  it("kender ikke et emne, der ikke findes", () => {
    expect(emneNavn("noget-andet")).toBeNull();
  });

  it("har ikke to emner med samme værdi", () => {
    const vaerdier = EMNER.map((e) => e.vaerdi);
    expect(new Set(vaerdier).size).toBe(vaerdier.length);
  });
});

describe("laesKontakt", () => {
  it("tager imod navn, mail, emne og en besked", () => {
    expect(laesKontakt(gyldig()).ok).toBe(true);
  });

  it("kræver navn og en mailadresse, vi kan svare på", () => {
    expect(laesKontakt(gyldig({ navn: "" })).fejl.navn).toBeTruthy();
    expect(laesKontakt(gyldig({ navn: "M" })).fejl.navn).toBeTruthy();
    expect(laesKontakt(gyldig({ email: "" })).fejl.email).toBeTruthy();
    expect(laesKontakt(gyldig({ email: "mette@" })).fejl.email).toBeTruthy();
  });

  it("afviser en besked, der ikke kan svares på", () => {
    // Tre tegn er ikke et spørgsmål. Slap den igennem, ville afsenderen vente
    // på et svar, der aldrig kunne blive brugbart.
    expect(laesKontakt(gyldig({ besked: "hej" })).fejl.besked).toBeTruthy();
    expect(
      laesKontakt(gyldig({ besked: "a".repeat(5000) })).fejl.besked,
    ).toBeTruthy();
  });

  it("afviser et emne, der ikke står i listen", () => {
    // Emnet bliver til mailens emnelinje. Uden tjekket kunne enhver tekst
    // sendes med derind.
    expect(laesKontakt(gyldig({ emne: "<h1>hej" })).fejl.emne).toBeTruthy();
  });

  it("telefon er frivilligt, men skal ligne et nummer", () => {
    expect(laesKontakt(gyldig({ telefon: "" })).ok).toBe(true);
    expect(laesKontakt(gyldig({ telefon: "+45 12 34 56 78" })).ok).toBe(true);
    expect(laesKontakt(gyldig({ telefon: "ring til mig" })).fejl.telefon)
      .toBeTruthy();
  });

  it("klipper mellemrum af, så et felt med kun mellemrum er tomt", () => {
    expect(laesKontakt(gyldig({ navn: "   " })).fejl.navn).toBeTruthy();
    expect(laesKontakt(gyldig({ navn: "  Mette  " })).vaerdier?.navn).toBe(
      "Mette",
    );
  });

  it("tager imod felter, der slet ikke blev sendt", () => {
    // En robot sender ikke nødvendigvis alle felter. Læsningen må afvise dem
    // pænt frem for at kaste på `undefined.trim()`.
    const svar = laesKontakt({});
    expect(svar.ok).toBe(false);
    expect(svar.fejl.navn).toBeTruthy();
    expect(svar.fejl.besked).toBeTruthy();
  });
});

describe("kontaktMail", () => {
  it("svar-til er AFSENDEREN og ikke os", () => {
    // Uden den ville et svar gå til vores egen driftsadresse, og beskeden
    // ville se besvaret ud, uden at nogen havde fået noget.
    const mail = kontaktMail(laesKontakt(gyldig()).vaerdier!);
    expect(mail.svarTil).toBe("mette@cafeaurora.dk");
    expect(mail.svarTil).not.toBe(COMPANY.email);
  });

  it("emnelinjen bærer emnet, så indbakken kan sorteres uden at åbne noget", () => {
    const mail = kontaktMail(
      laesKontakt(gyldig({ emne: "faktura" })).vaerdier!,
    );
    expect(mail.emne).toContain(emneNavn("faktura"));
    expect(mail.emne).toContain("Mette Hansen");
  });

  it("hele beskeden kommer med i mailen", () => {
    const besked = "Kan I levere til Grønland? Vi har to butikker.";
    const mail = kontaktMail(laesKontakt(gyldig({ besked })).vaerdier!);
    expect(mail.tekst).toContain(besked);
    expect(mail.tekst).toContain("mette@cafeaurora.dk");
  });
});
