import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ORDER_STATUSSER, ORDER_STATUS_LABELS } from "./constants";
import { HANDLING_TEKST } from "./admin-log";

/**
 * ADMIN-HANDLINGERNE — DET, DER IKKE BLEV SKREVET NED, OG DET, DER FEJLEDE
 * I STILHED.
 *
 * `admin_log` er bygget på ét løfte: HVER manuel ændring noteres med hvem,
 * hvornår og hvad der blev rørt. Løftet står i AGENTS.md og i modulets eget
 * hoved — men fem af tretten handlinger skrev ingen linje, og hullet var
 * usynligt, netop fordi loggen så komplet ud.
 *
 * Tre af de fem rører noget, kunden mærker: virksomhedens stamdata (det en
 * pakke sendes efter), hvor den TRYKTE QR-kode peger hen, og ordrens status
 * (om noget bliver trykt og sendt overhovedet).
 *
 * KILDEPRØVER, OG DE LÆSER UDEN KOMMENTARER. Filerne her citerer med vilje
 * den kode, de forklarer — tre gange den 15. september bestod en kildeprøve
 * på en kommentar i stedet for på koden. Se AGENTS.md.
 */

const KILDE = readFileSync(
  join(process.cwd(), "src/app/admin/actions.ts"),
  "utf8",
);

/** Kilden uden kommentarer. Se hovedet. */
function udenKommentarer(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const KODE = udenKommentarer(KILDE);

/** Kroppen af én handling — frem til næste `export async function`. */
function handling(navn: string): string {
  const i = KODE.indexOf(`function ${navn}(`);
  expect(i, `${navn} findes ikke længere`).toBeGreaterThan(-1);
  const rest = KODE.slice(i);
  const slut = rest.indexOf("\nexport ", 1);
  const krop = slut === -1 ? rest : rest.slice(0, slut);
  expect(krop.length, `${navn} har en tom krop`).toBeGreaterThan(100);
  return krop;
}

describe("hver manuel ændring efterlader et spor", () => {
  /**
   * De handlinger, der ændrer noget for en KUNDE. `createCompany` og de to
   * lagerhandlinger er bevidst ikke med: en ny, tom virksomhed har intet
   * "før", og lageret er vores eget og hører ikke til en kunde.
   */
  const SKAL_LOGGE = [
    "updateCompanyAdmin",
    "updateStandLinks",
    "createStandAdmin",
    "saelgAdresseAdmin",
    "setCompanyProduct",
    "saetOpsigelse",
    "genoptagKundeforhold",
    "setOrderStatus",
  ];

  for (const navn of SKAL_LOGGE) {
    it(`${navn} noterer i admin_log`, () => {
      expect(handling(navn)).toContain("noterAdminHandling");
    });
  }

  /** Hver handling, koden kan notere, skal have en læsbar tekst i admin. */
  it("alle handlingstyper har en dansk tekst", () => {
    for (const [n, tekst] of Object.entries(HANDLING_TEKST)) {
      expect(tekst.length, n).toBeGreaterThan(5);
    }
  });
});

describe("loggen er ikke endnu en kopi af kunden", () => {
  /**
   * `admin-log.ts` har reglen: `foer`/`efter` må ALDRIG bære navn, mail eller
   * telefon. Den er ældre og bedre end ønsket om at kunne se "før: peter@…",
   * for en revisionslog med personoplysninger er et sted mere, der skal
   * huskes ved en sletning og ved et dataudtræk.
   *
   * Derfor skriver `updateCompanyAdmin` kun FELTNAVNENE. Prøven her er det
   * eneste, der holder fast i, at nogen ikke "forbedrer" den med værdier.
   */
  it("virksomhedsrettelsen logger felternes navne og ikke deres værdier", () => {
    const krop = handling("updateCompanyAdmin");
    const i = krop.indexOf("noterAdminHandling");
    const kald = krop.slice(i, krop.indexOf("});", i));
    expect(kald).toContain("aendrede_felter");
    // Ingen af de felter, der bærer personoplysninger, må stå i kaldet.
    for (const felt of ["contact_email", "phone", "kontaktperson", "address"]) {
      expect(kald, `${felt} må ikke i loggen`).not.toContain(felt);
    }
  });

  /**
   * ...MEN EN ANMELDELSESADRESSE ER IKKE EN PERSONOPLYSNING. Det er en
   * offentlig forretningsoplysning, og det gamle link er præcis dét, man har
   * brug for, hvis en ændring skal gøres om.
   */
  it("QR-målet logger derimod værdierne", () => {
    const krop = handling("updateStandLinks");
    const i = krop.indexOf("noterAdminHandling");
    expect(krop.slice(i)).toContain("foer:");
  });
});

describe("ordrestatus", () => {
  const krop = handling("setOrderStatus");

  /**
   * Statussen blev kastet til `OrderStatus` uden at blive prøvet. En værdi
   * uden for enum'en afviser databasen med 400 — målt — men handlingen så
   * ikke på svaret og gav intet tilbage.
   */
  it("prøver værdien mod den kendte liste", () => {
    expect(krop).toContain("ORDER_STATUSSER");
    expect(krop).not.toMatch(/as OrderStatus;\s*\n\s*if \(!id\)/);
  });

  it("ser på om opdateringen ramte en række", () => {
    expect(krop).toContain('.select("id")');
    expect(krop).toMatch(/if \(!ramt\?\.length\)/);
  });

  it("svarer kalderen frem for at returnere void", () => {
    expect(krop).toContain("Promise<FormResult>");
  });

  /** Listen og etiketterne skal dække hinanden, ellers vises en tom mulighed. */
  it("hver status har en etiket", () => {
    for (const s of ORDER_STATUSSER) {
      expect(ORDER_STATUS_LABELS[s], s).toBeTruthy();
    }
    expect(Object.keys(ORDER_STATUS_LABELS).sort()).toEqual(
      [...ORDER_STATUSSER].sort(),
    );
  });

  /**
   * Og brugerfladen skal rulle tilbage. Værdien sættes lokalt med det samme,
   * og `router.refresh()` nulstiller ikke en `useState` — uden en tilbagerulning
   * ville dropdown'en blive stående på det, der ikke blev gemt.
   */
  it("brugerfladen ruller tilbage ved fejl", () => {
    const ui = udenKommentarer(
      readFileSync(
        join(process.cwd(), "src/app/admin/ordrer/order-status.tsx"),
        "utf8",
      ),
    );
    expect(ui).toContain("const forrige = value");
    expect(ui).toContain("setValue(forrige)");
  });
});

describe("opsigelsen slår abonnementet op frem for at tro på formularen", () => {
  const krop = handling("saetOpsigelse");

  /**
   * Id'et kom fra et skjult felt og gik direkte til Stripe. Admin er betroet,
   * så det er ikke et angreb, der bekymrer — det er en FORÆLDET SIDE: står
   * fanen åben, mens kundens abonnement skiftes, opsiger knappen noget andet
   * end det, siden viser.
   */
  it("henter id'et fra virksomheden", () => {
    expect(krop).toContain("stripe_subscription_id");
    expect(krop).not.toContain('formData.get("subscription_id")');
  });

  /**
   * Loggen skrev `foer: { opsagt_ved_periodeslut: !opsig }` — en udledning af
   * hvad der blev TRYKKET, ikke hvad der stod. En revisionslog, der gætter sin
   * egen før-værdi, er ikke en revisionslog.
   */
  it("spørger Stripe hvad der stod før, i stedet for at antage det modsatte", () => {
    expect(krop).toContain("subscriptions.retrieve");
    expect(krop).not.toMatch(/opsagt_ved_periodeslut:\s*!opsig/);
  });
});
