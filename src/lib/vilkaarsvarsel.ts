import { BRAND_NAVN, COMPANY, SITE_NAME, TERMS_VERSION } from "./constants";
import { DPA_VERSION } from "./dpa";
import { VILKAARSVARSEL_DAGE } from "./abonnement";
import { TIDSZONE } from "./dansk-dag";

/**
 * VARSLING OM ÆNDREDE VILKÅR — DEN MAIL, AFTALEN ALLEREDE LOVER.
 *
 * Handelsbetingelsernes §15: "Ændringer varsles på mail senest 30 dage før,
 * de træder i kraft for dit abonnement, og du kan altid opsige inden da. Det
 * samme gælder, hvis databehandleraftalen ændres materielt." Og aftalen selv:
 * "Hæves aftalens version, får kunden besked på mail."
 *
 * INDTIL NU FANDTES DEN MAIL IKKE. Versionerne kunne hæves, dashboardet skrev
 * "der findes en nyere udgave", og dér stoppede det — altså et løfte i en
 * aftale, kunden har accepteret, som systemet ikke kunne holde. Det er samme
 * klasse som en frist, vi lover uden at håndhæve: værre end ingen frist, for
 * så står løftet dokumenteret.
 *
 * TEKSTEN ER KILDEN, OGSÅ HER. `mail-skabelon.ts` bygger HTML'en ved at læse
 * den tekst, der står herunder — så et ord kan kun rettes ét sted, og
 * `text`-delen er ordret dét, kunden får. Opstillingen med "Aftale:" og
 * "Version:" følger `mail-blokke.ts`' grammatik: værdierne begynder i SAMME
 * kolonne, og dét er, hvad der gør en stribe linjer til en opstilling frem
 * for til løse sætninger.
 *
 * DER STÅR IKKE "KLIK HER". Adressen vises i sit fulde omfang, som i alle
 * husets kundemails: en mail om en JURIDISK ændring er præcis dér, hvor
 * modtageren skal kunne se, hvor linket fører hen, før hun trykker.
 *
 * DER ER INGEN AFMELDING, og det er ikke en forglemmelse: man kan ikke
 * framelde sig et varsel om en aftale, man er part i.
 */

/** Hvilken aftale er ændret? Bestemmer både emnet og hvad der linkes til. */
export type VarselSlags = "vilkaar" | "dpa" | "begge";

export interface Varsel {
  slags: VarselSlags;
  /** Datoen, ændringen træder i kraft. Udledt — se `ikrafttraedelse()`. */
  ikrafttraeden: Date;
}

/**
 * Hvornår ændringen træder i kraft.
 *
 * REGNET FRA I DAG OG ALDRIG VALGT I HÅNDEN. "Senest 30 dage før" er et loft,
 * og en dato, nogen taster, kan komme til at ligge for tæt på — det ville
 * bryde §15 uden at noget fejlede. Her kan den ikke.
 */
export function ikrafttraedelse(fra: Date = new Date()): Date {
  const d = new Date(fra);
  d.setDate(d.getDate() + VILKAARSVARSEL_DAGE);
  return d;
}

/** Dansk dato, som kunden læser den. Tidszonen er butikkens — se `dansk-dag.ts`. */
function datoTekst(d: Date): string {
  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIDSZONE,
  }).format(d);
}

const NAVNE: Record<VarselSlags, string> = {
  vilkaar: "handelsbetingelserne",
  dpa: "databehandleraftalen",
  begge: "handelsbetingelserne og databehandleraftalen",
};

/**
 * Versionerne, varslet handler om.
 *
 * LÆST AF KONSTANTERNE OG ALDRIG SKREVET IND. Skrev afsenderen versionen i
 * hånden, kunne mailen love en anden udgave end den, der ligger på sitet —
 * og kunden ville læse den forkerte.
 */
export function versionerFor(slags: VarselSlags): string[] {
  const ud: string[] = [];
  if (slags !== "dpa") ud.push(`Handelsbetingelser: version ${TERMS_VERSION}`);
  if (slags !== "vilkaar") ud.push(`Databehandleraftale: version ${DPA_VERSION}`);
  return ud;
}

/**
 * Selve mailen.
 *
 * REN FUNKTION UDEN NETVÆRK OG UDEN DATABASE, så ordlyden kan prøves — og
 * `vilkaarsvarsel.test.ts` kræver, at datoen, versionerne og retten til at
 * opsige står i teksten. Det er de tre ting, §15 lover.
 */
export function varselMail(varsel: Varsel): { emne: string; tekst: string } {
  const hvad = NAVNE[varsel.slags];
  const dato = datoTekst(varsel.ikrafttraeden);
  const base = `https://${COMPANY.email.split("@")[1]}`;

  /*
    VÆRDIERNE BEGYNDER I SAMME KOLONNE — se `mail-blokke.ts`, hvor det er
    JUSTERINGEN og ikke antallet af mellemrum, der gør en stribe linjer til en
    opstilling. Bredden REGNES af den længste etiket og skrives ikke som et
    tal: første udgave stod på 18, og "Handelsbetingelser:" er 19 tegn, så
    `padEnd` gjorde ingenting og netop dén linje faldt ud af opstillingen.
    Et fast tal her ville skulle rettes, hver gang en etiket bliver længere.
  */
  const raekker: [string, string][] = [
    ...versionerFor(varsel.slags).map((v) => {
      const [etiket, vaerdi] = v.split(": ");
      return [etiket + ":", vaerdi] as [string, string];
    }),
    ["Træder i kraft:", dato],
  ];
  const bredde = Math.max(...raekker.map(([e]) => e.length)) + 2;

  const linjer = [
    `Vi har opdateret ${hvad} for ${SITE_NAME}.`,
    "",
    ...raekker.map(([etiket, vaerdi]) => `${etiket.padEnd(bredde)}${vaerdi}`),
    "",
    `Ændringen træder i kraft den ${dato}, altså ${VILKAARSVARSEL_DAGE} dage fra i dag. Indtil da gælder den udgave, du allerede har accepteret.`,
    "",
    "Du kan læse den nye udgave her:",
    "",
    /*
      EN TOM LINJE MELLEM DE TO ADRESSER, OG DEN ER IKKE PYNT.
      `mail-blokke.ts` SAMMENFØJER linjer, der ikke slutter en sætning — en
      regel, der findes, fordi sletningsmailene er skrevet med hårde
      linjeskift midt i sætninger. En URL slutter ikke på punktum, så de to
      adresser blev føjet sammen til ÉN linje i HTML-udgaven og stod klistret
      op ad hinanden. Set på den gengivne mail; i den rå tekst så den rigtig
      ud, og enhver prøve på teksten ville være blevet ved med at bestå.
    */
    ...(varsel.slags !== "dpa" ? [`${base}/handelsbetingelser`, ""] : []),
    ...(varsel.slags !== "vilkaar" ? [`${base}/databehandleraftale`, ""] : []),
    /* RETTEN TIL AT OPSIGE ER IKKE EN VENLIGHED — den står i §15 og er
       halvdelen af, hvad varslet er til for. Udelades den, er mailen en
       orientering og ikke et varsel. */
    "Er du ikke enig i ændringen, kan du opsige dit abonnement inden da under Betaling og kvitteringer i dit dashboard. Du beholder adgangen resten af den periode, du har betalt for.",
    "",
    `Har du spørgsmål, så svar bare på denne mail eller skriv til ${COMPANY.email}.`,
    "",
    `Venlig hilsen`,
    BRAND_NAVN,
  ];

  return {
    /* Emnet siger HVAD og HVORNÅR. En indbakke sorteres på emnelinjen, og et
       varsel, der bare hedder "Opdatering", bliver læst for sent. */
    emne: `Ændring af ${hvad} — træder i kraft ${dato}`,
    tekst: linjer.join("\n"),
  };
}
