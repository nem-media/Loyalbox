import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { mailHtml } from "./mail-skabelon";
import { laesBlokke } from "./mail-blokke";
import { ordrebekraeftelse } from "./ordrebekraeftelse";
import { type Ordredetaljer } from "./ordrevarsel";
import { kortLinkMail } from "./loyalty/kort-link";
import { bestiltMail, bekraeftetMail, udfoertMail } from "./sletning";
import { COMPANY } from "./constants";

/**
 * MAILENS HTML-UDGAVE.
 *
 * DEN FARLIGE FEJL ER IKKE ET GRIMT AFSNIT — det er en linje, der FORSVINDER,
 * fordi den ikke passede i et mønster. Teksten er kilden, og HTML'en udledes
 * af den; en tavs udeladelse rammer derfor kun dem, der læser HTML (altså
 * næsten alle), mens prøverne på selve teksten bliver ved med at bestå.
 *
 * Derfor er hovedprøven her en DÆKNINGSPRØVE mod de RIGTIGE mails: hver
 * eneste ikke-tomme linje skal kunne findes igen. En pæn ordrebekræftelse,
 * der har tabt leveringsadressen, er værre end en grim, der har den med.
 */

const SITE = "https://loyalsum.dk";

const engangs: Ordredetaljer = {
  type: "engangskoeb",
  vare: "Reviewstander",
  antal: 2,
  beloeb: 798,
  maanedligt: null,
  firmanavn: "Bang & Olufsen Café",
  cvr: "37811769",
  email: "hej@cafeaurora.dk",
  leveringslinjer: ["Café Aurora", "Bredgade 1", "1260 København", "DK"],
  sessionId: "cs_test_123",
  qrAdresse: "https://google.com/maps/place/cafe",
  qrFast: true,
};

const abonnement: Ordredetaljer = {
  ...engangs,
  type: "nyt-abonnement",
  vare: "LoyalSum Komplet",
  antal: 1,
  beloeb: 399,
  maanedligt: 399,
  qrAdresse: `${SITE}/r/cafe-aurora`,
  qrFast: false,
  aktiveringUrl: `${SITE}/aktiver/abc123def456ghi789jkl`,
};

/** Mailene, som de faktisk sendes. */
const MAILS: [string, string][] = [
  ["ordrebekræftelse, engangskøb", ordrebekraeftelse(engangs).tekst],
  ["ordrebekræftelse, abonnement", ordrebekraeftelse(abonnement).tekst],
  [
    "kortlink, ét kort",
    kortLinkMail([{ butik: "Café Aurora", url: `${SITE}/kort/tok` }], SITE)
      .tekst,
  ],
  [
    "kortlink, blandet",
    kortLinkMail(
      [
        { butik: "Café Aurora", url: `${SITE}/kort/tok` },
        { butik: "Frisør Nielsine", url: null },
      ],
      SITE,
    ).tekst,
  ],
  [
    "kortlink, kun konto",
    kortLinkMail([{ butik: "Frisør Nielsine", url: null }], SITE).tekst,
  ],
  /*
    DE TRE SLETNINGSMAILS ER SKREVET ANDERLEDES END RESTEN, og det er netop
    derfor, de skal med: de er HÅRDOMBRUDTE — en sætning løber over flere
    linjer uden en tom linje imellem — og deres adresser står i venstre kant
    uden indrykning. Den første udgave af skabelonen gav dem derfor et afsnit
    pr. linje, altså en opremsning af det, kunden er ved at slette, brækket
    midt over. De er samtidig kundens juridiske dokumentation.
  */
  ["sletning bestilt", bestiltMail("Café Aurora", `${SITE}/slet/x`).tekst],
  [
    "sletning bekræftet",
    bekraeftetMail("Café Aurora", new Date("2026-10-20"), `${SITE}/fortryd/x`)
      .tekst,
  ],
  ["sletning udført", udfoertMail("Café Aurora").tekst],
];

/** HTML uden tags og entiteter — altså dét, en læser rent faktisk ser. */
function synligTekst(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

/**
 * Sammenligningsformen.
 *
 * Tegnsætning tages væk i BEGGE ender, fordi opstillingen med vilje flytter
 * den: "Vare:      LoyalSum Komplet" bliver to celler, og kolonet hører til
 * den justering, der ikke længere findes. Prøven spørger, om INDHOLDET er
 * der — ikke om tegnene står samme sted.
 */
function form(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^0-9a-zà-ÿæøå]+/gi, " ")
    .trim();
}

describe("HTML-mailen taber ikke noget", () => {
  for (const [navn, tekst] of MAILS) {
    it(`${navn}: hver linje står i HTML'en`, () => {
      const set = form(synligTekst(mailHtml(tekst, SITE)));
      const linjer = tekst.split("\n").filter((l) => l.trim() !== "");
      expect(linjer.length).toBeGreaterThan(4);

      for (const linje of linjer) {
        expect(set, `linjen mangler i HTML: ${linje.trim()}`).toContain(
          form(linje),
        );
      }
    });

    it(`${navn}: hver adresse er klikbar`, () => {
      /*
       * En adresse, der kun står som tekst i en HTML-mail, er en adresse,
       * kunden skal markere og kopiere. Aktiveringslinket er dét, der giver
       * adgang til noget, der lige er betalt for — det skal kunne trykkes.
       */
      const html = mailHtml(tekst, SITE);
      const urler = tekst.match(/https?:\/\/\S+/g) ?? [];
      for (const url of urler) {
        expect(html, `ingen href til ${url}`).toContain(`href="${url}"`);
      }
    });
  }
});

describe("mailen holder sig selv lys og hel", () => {
  const html = mailHtml(ordrebekraeftelse(abonnement).tekst, SITE);

  it("kundens egne tegn lukker ikke opbygningen op", () => {
    /*
     * Firmanavnet kommer fra et felt, kunden selv har udfyldt. "Bang &
     * Olufsen Café" ville stå som en halv entitet, og et `<` ville lukke
     * mailens opbygning op — navnet går direkte fra basen ind i beskeden.
     */
    expect(html).toContain("Bang &amp; Olufsen Café");
    expect(html).not.toContain("Bang & Olufsen");

    const slem = mailHtml('Hej <script>alert(1)</script>\n\nHej', SITE);
    expect(slem).not.toContain("<script>");
    expect(slem).toContain("&lt;script&gt;");
  });

  it("hver celle har sin egen baggrund", () => {
    /*
     * MØRK TILSTAND VENDER FARVER OM AF SIG SELV i Apple Mail og Outlook.
     * En celle uden `background-color` bliver sort — og teksten i den er sat
     * til en mørk farve, så resultatet er sort på sort. Det ses ikke af den,
     * der tester i lys tilstand, og det er hver anden modtager.
     */
    const celler = html.match(/<td[^>]*>/g) ?? [];
    expect(celler.length).toBeGreaterThan(3);
    for (const c of celler) {
      expect(c, `celle uden baggrund: ${c.slice(0, 80)}`).toMatch(
        /background-color:/,
      );
    }
    expect(html).toContain('name="color-scheme" content="light"');
  });

  it("stilen er inline — der er ingen stilblok at fjerne", () => {
    /*
     * Gmail fjerner `<style>` i nogle visninger, og Outlook tegner med Words
     * motor. Alt, der afhænger af en stilblok, er derfor noget, der virker
     * hos os og ikke hos modtageren.
     */
    expect(html).not.toMatch(/<style[\s>]/i);
    expect(html).not.toMatch(/<link[^>]+stylesheet/i);
    expect(html).not.toMatch(/\bdisplay:\s*(flex|grid)\b/);
  });

  it("logoet bærer intet, teksten ikke også siger", () => {
    /* Billeder er slået fra hos mange. Alt-teksten skal stå i stedet. */
    const img = /<img[^>]*>/.exec(html);
    expect(img, "mailen har et logo").not.toBeNull();
    expect(img![0]).toMatch(/alt="LoyalSum"/);
    expect(img![0], "alt-teksten skal kunne ses på den mørke bjælke").toMatch(
      /color:#ffffff/,
    );
    expect(img![0], "en mail kan ikke hente et relativt billede").toContain(
      `src="${SITE}/`,
    );
  });

  it("afsenderen står med navn, CVR og adresse", () => {
    /* Selskabsoplysningerne står ét sted (COMPANY) og skal med i foden —
       en mail uden afsender ligner en, man ikke skal svare på. */
    const synlig = synligTekst(html);
    expect(synlig).toContain(COMPANY.legalName);
    expect(synlig).toContain(COMPANY.cvr);
    expect(synlig).toContain(COMPANY.address);
  });
});

describe("blokkene læses ud af teksten", () => {
  it("den justerede opstilling bliver en tabel", () => {
    /*
     * MELLEMRUMMENE SIGER INGENTING — JUSTERINGEN GØR. Første udgave krævede
     * to mellemrum efter kolonet og faldt på den rigtige mail: kolonnen er
     * rettet ind efter den LÆNGSTE etiket, så netop den linje har præcis ét.
     * Kvitteringen blev til tre løse sætninger, og det var ikke til at se i
     * koden — kun i mailen.
     */
    const blokke = laesBlokke(
      ["Vare:      LoyalSum Komplet", "Betalt nu: 399 kr."].join("\n"),
    );
    expect(blokke).toHaveLength(1);
    expect(blokke[0].slags).toBe("tabel");
  });

  it("to sætninger med kolon er ikke en tabel", () => {
    /* Den anden vej: to linjer, der begge har et kolon, men ikke er rettet
       ind efter hinanden, er prosa og skal blive ved med at være det. */
    const blokke = laesBlokke(
      ["Bemærk: du kan skifte det senere.", "Husk: skiltet sendes i dag."].join(
        "\n",
      ),
    );
    expect(blokke[0].slags).toBe("afsnit");
  });

  it("en adresse under en etiket bliver et link, flere værdier bliver en liste", () => {
    const etLink = laesBlokke("Opret din adgang:\n  https://loyalsum.dk/x");
    expect(etLink[0].slags).toBe("link");

    const liste = laesBlokke("Sendes til:\n  Café Aurora\n  Bredgade 1");
    expect(liste[0].slags).toBe("vaerdier");
  });

  it("en linje, der ikke passer i et mønster, bliver stående", () => {
    /* Sidste udvej er et afsnit — aldrig at springe linjen over. */
    const blokke = laesBlokke("En helt almindelig sætning uden noget særligt.");
    expect(blokke).toHaveLength(1);
    expect(blokke[0].slags).toBe("afsnit");
  });
});

describe("kun kundemails får HTML", () => {
  it("alarmer og interne beskeder sendes som ren tekst", () => {
    /*
     * En alarm og et ordrevarsel læses i en travl indbakke og ofte på en
     * telefon, og dér er ren tekst bedre end pæn: man kan søge i den, citere
     * den og se hele beskeden i ét blik uden at rulle forbi en bjælke. En
     * designet alarm er en alarm, der tager længere tid at forstå.
     *
     * Prøven læser kilden, fordi der ikke er noget at kalde uden at sende en
     * rigtig mail.
     */
    const s = readFileSync("src/lib/mail.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    const kunde = /return send\(AFSENDER_KUNDE[^;]*;/.exec(s);
    expect(kunde, "sendKundeMail findes").not.toBeNull();
    expect(kunde![0], "kundemailen sendes med HTML").toMatch(/true\s*\)/);

    for (const m of s.matchAll(/return send\(AFSENDER_DRIFT[^;]*;/g)) {
      expect(m[0], "en intern mail er sendt som HTML").not.toMatch(/true\s*\)/);
    }
  });

  it("den rene tekst sendes ALTID med", () => {
    /*
     * En mail med kun HTML scorer dårligere hos spamfiltre, og en klient, der
     * er sat til ren tekst, ville vise ingenting. Begge udgaver kommer ud af
     * den SAMME tekst, så de aldrig kan sige hver sit.
     */
    const s = readFileSync("src/lib/mail.ts", "utf8");
    expect(s).toMatch(/text:\s*tekst,/);
    expect(s).toMatch(/html:\s*mailHtml\(tekst,/);
  });
});
