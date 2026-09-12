import { describe, it, expect } from "vitest";
import {
  laesKontakt,
  kontaktMail,
  laesSupport,
  supportMail,
  emneNavn,
  EMNER,
  STANDARD_EMNE,
  SVARTID,
  KONTORTID,
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

describe("SVARTID", () => {
  it("nævner kontortiden — ellers er løftet forkert om aftenen", () => {
    // "Typisk svar inden for to timer" er sandt kl. 10 og forkert kl. 22, og
    // en, der skriver om aftenen og intet hører, tror, beskeden er forsvundet.
    expect(SVARTID).toContain(KONTORTID);
    expect(KONTORTID).toMatch(/9/);
    expect(KONTORTID).toMatch(/16/);
  });
});

describe("laesSupport", () => {
  const gyldigSupport = (over: Record<string, unknown> = {}) => ({
    emne: STANDARD_EMNE,
    besked: "Jeg kan ikke få min QR-kode til at pege det rigtige sted hen.",
    ...over,
  });

  it("tager imod et emne og en besked", () => {
    expect(laesSupport(gyldigSupport()).ok).toBe(true);
  });

  it("stiller de SAMME krav til beskeden som den offentlige formular", () => {
    expect(laesSupport(gyldigSupport({ besked: "hej" })).fejl.besked)
      .toBeTruthy();
    expect(
      laesSupport(gyldigSupport({ besked: "a".repeat(5000) })).fejl.besked,
    ).toBeTruthy();
    expect(laesSupport(gyldigSupport({ emne: "opfundet" })).fejl.emne)
      .toBeTruthy();
  });

  it("spørger IKKE om navn og mail", () => {
    // De kommer fra sessionen. Stod de i formularen, kunne de forfalskes.
    const svar = laesSupport(gyldigSupport());
    expect(svar.ok).toBe(true);
    expect(Object.keys(svar.vaerdier!)).toEqual(["emne", "besked"]);
  });
});

describe("supportMail", () => {
  const felter = { emne: "konto", besked: "Jeg kan ikke logge ind." };

  it("bærer butik, produkt og niveau, så vi ikke skal spørge", () => {
    const mail = supportMail(felter, {
      email: "ejer@cafeaurora.dk",
      butik: "Café Aurora",
      produkt: "LoyalSum Komplet",
      plan: "pro",
    });
    expect(mail.tekst).toContain("Café Aurora");
    expect(mail.tekst).toContain("LoyalSum Komplet");
    expect(mail.tekst).toContain("pro");
    expect(mail.emne).toContain("Café Aurora");
    expect(mail.svarTil).toBe("ejer@cafeaurora.dk");
  });

  it("siger det TYDELIGT, når en admin har skrevet via supportadgang", () => {
    // Ellers ligner mailen en henvendelse fra butikken selv, og nogen ville
    // svare kunden på noget, de aldrig har spurgt om.
    const mail = supportMail(felter, {
      email: "admin@loyalbox.test",
      butik: "Café Aurora",
      viaAdmin: true,
    });
    expect(mail.tekst).toMatch(/ADMIN/);
    expect(mail.tekst).toMatch(/ikke selv skrevet/);
  });

  it("klarer en konto helt uden virksomhed", () => {
    const mail = supportMail(felter, { email: "ny@bruger.dk" });
    expect(mail.emne).toContain("ny@bruger.dk");
    expect(mail.tekst).toContain("ingen virksomhed");
  });

  it("hele beskeden kommer med", () => {
    const mail = supportMail(felter, { email: "ny@bruger.dk" });
    expect(mail.tekst).toContain(felter.besked);
  });
});
