import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { TERMS_VERSION } from "./constants";
import { DPA_VERSION } from "./dpa";
import { VILKAARSVARSEL_DAGE } from "./abonnement";
import { varselMail, ikrafttraedelse, versionerFor } from "./vilkaarsvarsel";
import { mailHtml } from "./mail-skabelon";
import { readFileSync } from "node:fs";
import { isTestBuyer } from "./commerce";

/**
 * VARSLET SKAL HOLDE DET, AFTALEN LOVER.
 *
 * Handelsbetingelsernes §15: "Ændringer varsles på mail senest 30 dage før,
 * de træder i kraft for dit abonnement, og du kan altid opsige inden da."
 * Databehandleraftalen lover det samme ved en materiel ændring.
 *
 * Indtil mailen fandtes, var det et løfte i en aftale, kunden har accepteret,
 * som systemet ikke kunne holde — samme klasse som en frist, vi lover uden at
 * håndhæve. Prøverne her holder fast i de tre ting, §15 rent faktisk lover:
 * en DATO, en VERSION og retten til at OPSIGE inden da.
 */

const kilde = (sti: string) =>
  readFileSync(sti, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("ikrafttrædelsen", () => {
  it("ligger mindst fristen ude i fremtiden", () => {
    const fra = new Date("2026-03-01T12:00:00Z");
    const d = ikrafttraedelse(fra);
    const dage = Math.round((d.getTime() - fra.getTime()) / 86_400_000);
    expect(dage).toBe(VILKAARSVARSEL_DAGE);
  });

  /*
   * REGNET FRA I DAG OG ALDRIG VALGT I HÅNDEN. En dato, nogen taster, kan
   * komme til at ligge for tæt på — og §15 ville være brudt, uden at noget
   * fejlede. Prøven holder fast i, at funktionen ikke tager en dato ind.
   */
  it("kan ikke sættes tættere på end fristen", () => {
    const s = kilde("src/lib/vilkaarsvarsel.ts");
    expect(s).toContain("VILKAARSVARSEL_DAGE");
    expect(s).not.toMatch(/ikrafttraeden:\s*new Date\(["'`]/);
  });
});

describe("mailens indhold", () => {
  const mail = varselMail({
    slags: "begge",
    ikrafttraeden: ikrafttraedelse(new Date("2026-03-01T12:00:00Z")),
  });

  it("siger hvornår ændringen træder i kraft — i emnet OG i teksten", () => {
    /* En indbakke sorteres på emnelinjen. Et varsel, der bare hedder
       "Opdatering", bliver læst for sent. */
    expect(mail.emne).toMatch(/31\. marts 2026/);
    expect(mail.tekst).toMatch(/31\. marts 2026/);
  });

  it("nævner de versioner, der faktisk gælder", () => {
    expect(mail.tekst).toContain(TERMS_VERSION);
    expect(mail.tekst).toContain(DPA_VERSION);
  });

  /*
   * RETTEN TIL AT OPSIGE ER HALVDELEN AF, HVAD VARSLET ER TIL FOR. Uden den
   * er mailen en orientering, og §15's løfte er ikke opfyldt.
   */
  it("fortæller, at man kan opsige inden da", () => {
    expect(mail.tekst.toLowerCase()).toContain("opsige");
  });

  /*
   * DER STÅR ALDRIG "KLIK HER" — adressen vises i sit fulde omfang. Det er
   * husets regel for alle kundemails, og den vejer tungest her: en mail om en
   * juridisk ændring er præcis dér, hvor modtageren skal kunne se, hvor
   * linket fører hen, før hun trykker.
   */
  it("viser adresserne og ikke et 'klik her'", () => {
    expect(mail.tekst).toMatch(/https:\/\/\S+\/handelsbetingelser/);
    expect(mail.tekst).toMatch(/https:\/\/\S+\/databehandleraftale/);
    expect(mail.tekst.toLowerCase()).not.toContain("klik her");
  });

  /*
   * VÆRDIERNE BEGYNDER I SAMME KOLONNE. `mail-blokke.ts` bygger HTML-udgaven
   * ved at læse teksten, og det er JUSTERINGEN — ikke antallet af mellemrum —
   * der gør en stribe linjer til en opstilling frem for til løse sætninger.
   * Falder den, mister HTML-læseren (altså næsten alle) opstillingen, mens
   * prøver på teksten bliver ved med at bestå.
   */
  it("opstillingens værdier står i samme kolonne", () => {
    const linjer = mail.tekst
      .split("\n")
      .filter((l) => /^[A-ZÆØÅ][^:]*: {2,}\S/.test(l));
    expect(linjer.length).toBeGreaterThanOrEqual(2);
    const kolonner = new Set(linjer.map((l) => l.search(/\S(?=[^\s]*$)|(?<=: +)\S/)));
    const start = linjer.map((l) => l.length - l.replace(/^[^:]*:\s+/, "").length);
    expect(new Set(start).size, `værdierne starter i ${[...new Set(start)]}`).toBe(1);
    expect(kolonner.size).toBeGreaterThan(0);
  });

  it("kun den ændrede aftale nævnes, når kun den er ændret", () => {
    expect(versionerFor("vilkaar")).toHaveLength(1);
    expect(versionerFor("dpa")).toHaveLength(1);
    expect(versionerFor("begge")).toHaveLength(2);
    const kunDpa = varselMail({ slags: "dpa", ikrafttraeden: new Date() });
    expect(kunDpa.tekst).not.toMatch(/\/handelsbetingelser/);
  });
});

describe("udsendelsen kan ikke sende to gange", () => {
  const s = kilde("src/lib/vilkaarsvarsel-udsendelse.ts");

  /*
   * SPÆRREN LIGGER I LOGGEN OG IKKE I EN VARIABEL. En serverfunktion kører i
   * mange eksemplarer, så en tæller ville lade to samtidige tryk begge sende
   * — samme fælde som alarmdæmpningen og lagertrækket.
   */
  it("trækker dem fra, der allerede har fået den", () => {
    expect(s).toContain("vilkaarsvarsel-sendt");
    expect(s).toContain("alleredeSendt");
  });

  /*
   * EN FEJLET MAIL MÅ IKKE LOGGES SOM SENDT. Gjorde den det, ville kunden
   * aldrig blive varslet, og listen ville se færdig ud.
   */
  it("logger først EFTER at mailen er sendt", () => {
    /* Søg inde i FUNKTIONEN og ikke i hele filen: `noterAdminHandling` står
       også i importlinjen øverst, og den kommer altid først. */
    const krop = s.slice(s.indexOf("export async function sendVilkaarsvarsel"));
    const fejlgren = krop.indexOf("if (!ok)");
    const log = krop.indexOf("noterAdminHandling");
    expect(fejlgren).toBeGreaterThan(-1);
    expect(log).toBeGreaterThan(fejlgren);
    expect(krop.slice(fejlgren, log)).toContain("continue;");
  });

  /*
   * INGEN AUTOMATIK. Et varsel, der udløses af en udrulning, ville betyde, at
   * et commit kan maile alle kunder — og versionen hæves ofte som en del af
   * en rettelse.
   */
  it("udløses ikke af en cron eller en udrulning", () => {
    expect(s).not.toContain("cron");
    expect(kilde("src/app/admin/actions.ts")).toContain("sendVilkaarsvarsel");
  });

  /* Loggen må ikke blive endnu en kopi af kunden. */
  it("logger hverken navn eller mailadresse", () => {
    const efter = s.slice(s.indexOf("efter: {"), s.indexOf("efter: {") + 120);
    expect(efter).not.toMatch(/navn|email/);
  });
});

describe("fristen står ét sted", () => {
  /*
   * Tallet står i §15, i databehandleraftalen og i mailen. Tre håndskrevne
   * tredivere bliver før eller siden til to forskellige løfter — og det er
   * teksten, kunden kan holde os op på.
   */
  for (const sti of [
    "src/app/handelsbetingelser/page.tsx",
    "src/lib/dpa.ts",
    "src/lib/vilkaarsvarsel.ts",
  ]) {
    it(`${sti} slår fristen op`, () => {
      expect(kilde(sti)).toContain("VILKAARSVARSEL_DAGE");
    });
  }
});

/*
  DENNE PRØVE LÆSER DEN GENGIVNE MAIL OG IKKE TEKSTEN.

  De to adresser stod på hver sin linje i kilden og SÅ derfor rigtige ud —
  men `mail-blokke.ts` sammenføjer linjer, der ikke slutter en sætning (se
  reglen om hård ombrydning), og en URL slutter ikke på punktum. I HTML'en,
  altså dét næsten alle læser, blev de to links til ét afsnit og stod
  klistret op ad hinanden. Set på den gengivne mail.

  Enhver prøve på `tekst` ville være blevet ved med at bestå. Derfor prøves
  egenskaben dér, hvor den kan brydes: ingen ENKELT `<p>` må bære begge
  adresser.
*/
describe("adresserne i den gengivne mail", () => {
  const html = mailHtml(
    varselMail({ slags: "begge", ikrafttraeden: ikrafttraedelse() }).tekst,
    "https://loyalsum.dk",
  );
  const afsnit = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/g) ?? [];

  it("står i hver sit afsnit", () => {
    const begge = afsnit.filter(
      (p) => p.includes("/handelsbetingelser") && p.includes("/databehandleraftale"),
    );
    expect(begge).toEqual([]);
  });

  it("er begge med som rigtige links", () => {
    for (const sti of ["handelsbetingelser", "databehandleraftale"]) {
      expect(html).toContain(`href="https://loyalsum.dk/${sti}"`);
    }
  });
});

/*
  FILTERET FOR TESTKONTI — PRØVET PÅ DEN FARLIGE RETNING.

  `modtagere()` rører databasen og kan ikke prøves uden den. Egenskaben, der
  betyder noget, kan til gengæld læses i kilden: at der filtreres på
  E-MAILEN og ikke på NAVNET. Listen rummer "Testkiosk Basic" og "Test Café
  Aarhus", og et navnefilter ville udelade en rigtig butik fra et varsel,
  handelsbetingelsernes §15 lover hende — tavst, og først opdaget den dag
  nogen spørger, hvorfor hun aldrig hørte noget.

  KILDEN LÆSES UDEN KOMMENTARER: begrundelserne i den fil citerer med vilje
  den kode, de forklarer, så en prøve på den rå tekst ville også bestå, når
  kaldet var slettet og forklaringen stod tilbage.
*/
describe("testkonti udelades", () => {
  const kilde = readFileSync(
    new URL("./vilkaarsvarsel-udsendelse.ts", import.meta.url),
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("bruger husets egen isTestBuyer frem for en ny definition", () => {
    expect(kilde).toMatch(/import\s*\{[^}]*isTestBuyer[^}]*\}\s*from\s*"@\/lib\/commerce"/);
    expect(kilde).toContain("isTestBuyer(f.contact_email)");
  });

  it("skriver ikke domænet af", () => {
    expect(kilde).not.toContain("@loyalbox.test");
  });

  it("filtrerer ALDRIG på virksomhedens navn", () => {
    /* Enhver optræden af `name` sammen med en test-lignende sammenligning
       er netop den fejl, der ikke må komme ind ad bagdøren. */
    expect(kilde).not.toMatch(/name[^\n]*\.(includes|startsWith|match)\s*\(\s*["'`/][^"'`]*[Tt]est/);
  });

  it("tæller de udeladte, så listen ikke bare bliver kortere", () => {
    expect(kilde).toContain("testkonti");
  });
});

describe("isTestBuyer rammer domænet og ikke navnet", () => {
  it("tager en seed-konto", () => {
    expect(isTestBuyer("komplet@loyalbox.test")).toBe(true);
    expect(isTestBuyer("Komplet@LoyalBox.Test")).toBe(true);
  });

  it("lader en rigtig butik med 'test' i navnet være i fred", () => {
    /* Virksomheden hedder "Testkiosk Basic" — adressen er hendes egen. */
    expect(isTestBuyer("kontakt@testkiosk.dk")).toBe(false);
    expect(isTestBuyer("test@rigtigbutik.dk")).toBe(false);
  });

  it("svarer nej på ingenting", () => {
    expect(isTestBuyer(null)).toBe(false);
    expect(isTestBuyer(undefined)).toBe(false);
  });
});
