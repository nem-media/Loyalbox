import { COMPANY, type Product } from "@/lib/constants";
import { FRISTER } from "@/lib/opbevaring";

/**
 * Databehandleraftale (DPA).
 *
 * ROLLEFORDELINGEN ER HELE POINTEN: butikken er dataansvarlig for sine egne
 * kunders oplysninger, og LoyalSum er databehandler, der kun må gøre det,
 * butikken beder om. Det er samme sondring som i privatlivspolitikken.
 *
 * Teksten beskriver, hvad systemet FAKTISK gør — det er dér skabelonaftaler
 * plejer at tage fejl. Ændres behandlingen, skal teksten og versionen følge
 * med, ellers har kunden accepteret noget andet end det, der sker.
 *
 * JURIDISK GENNEMSYN MANGLER. Den er skrevet ud fra systemets virkemåde, ikke
 * af en advokat.
 */

/**
 * Version og dato. Accepten gemmes MED versionen på virksomheden, så vi kan se,
 * hvad den enkelte kunde faktisk sagde ja til. Ændres teksten materielt, skal
 * versionen hæves — ellers ser en gammel accept ud til at dække ny tekst.
 */
export const DPA_VERSION = "1.2";
export const DPA_DATE = "2026-08-20";

/** Felter der endnu ikke er verificeret, vises som en tydelig markering. */
export const DPA_UDFYLD = "UDFYLD";

export interface SubProcessor {
  name: string;
  purpose: string;
  /** Hvor behandlingen foregår. UDFYLD hvis den ikke er verificeret. */
  location: string;
  note?: string;
}

/**
 * Underdatabehandlere — dem der reelt rører data på vores vegne.
 *
 * Stripe står bevidst IKKE på listen: de behandler butiksejerens egne
 * betalingsoplysninger som selvstændig dataansvarlig, ikke butikkens kunders
 * data. Det hører under privatlivspolitikken, ikke under denne aftale.
 */
export const SUBPROCESSORS: SubProcessor[] = [
  {
    name: "Supabase",
    purpose: "Database og brugerlogin",
    location: "EU (Irland, eu-west-1)",
  },
  {
    name: "Vercel",
    purpose: "Hosting og afvikling af hjemmesiden",
    location: "EU (Irland, dub1)",
    note: "Regionen er låst i vercel.json. Ændres den, skal denne linje og afsnittet om tredjelande rettes med.",
  },
  {
    name: "Resend (Amazon SES)",
    purpose: "Udsendelse af e-mails",
    location: "EU (Irland, eu-west-1)",
  },
];

export interface DpaSection {
  id: string;
  title: string;
  paragraphs: string[];
  list?: string[];
}

export const DPA_SECTIONS: DpaSection[] = [
  {
    id: "baggrund",
    title: "1. Baggrund og roller",
    paragraphs: [
      `Denne aftale regulerer den behandling af personoplysninger, som ${COMPANY.legalName} foretager på vegne af kunden i forbindelse med brugen af LoyalSum.`,
      "Kunden er dataansvarlig for oplysninger om sine egne kunder og bestemmer, hvad der indsamles, og hvad det bruges til. LoyalSum er databehandler og behandler alene oplysningerne efter kundens instruks.",
      "Aftalen indgås automatisk ved købet og gælder, så længe kunden bruger LoyalSum.",
    ],
  },
  {
    id: "formaal",
    title: "2. Formål og karakter af behandlingen",
    paragraphs: [
      "Behandlingen sker udelukkende for at levere de funktioner, kunden har købt:",
    ],
    list: [
      "At tage imod feedback og anmeldelser fra kundens egne kunder gennem en stander.",
      "At føre digitale stempelkort: tilmelding, optjening af stempler, belønninger og rabatter.",
      "At vise kunden statistik over brugen af standeren.",
    ],
  },
  {
    id: "kategorier",
    title: "3. Kategorier af registrerede og oplysninger",
    paragraphs: [
      "De registrerede er kundens egne kunder samt kundens eget personale.",
      "Der behandles disse oplysninger om kundens kunder:",
    ],
    list: [
      "Feedback: bedømmelse, en eventuel fritekstkommentar samt navn og e-mail, hvis kunden selv skriver dem. Alle tre felter er frivillige for den, der giver feedback.",
      "Stempelkort: navn, e-mail, telefonnummer og et eventuelt kundenummer — kun det, butikken selv beder om — samt optjente stempler, belønninger og rabatter.",
      "Statistik over scanninger: tidspunkt og enhedstype. Der gemmes hverken IP-adresse eller andet, der kan pege på en enkelt person.",
      "Om personalet: navn, e-mail og hvilke rettigheder de har.",
    ],
  },
  {
    id: "instruks",
    title: "4. Instruks",
    paragraphs: [
      "LoyalSum behandler kun personoplysninger efter dokumenteret instruks fra kunden. Denne aftale, sammen med den brug kunden gør af systemet, udgør instruksen.",
      "Oplysningerne bruges ikke til egne formål, videresælges ikke og bruges ikke til at træne kunstig intelligens.",
      "Mener LoyalSum, at en instruks strider mod databeskyttelsesreglerne, gives der besked med det samme.",
    ],
  },
  {
    id: "fortrolighed",
    title: "5. Fortrolighed",
    paragraphs: [
      "Kun de personer hos LoyalSum, der har brug for adgang for at levere og drive tjenesten, har adgang til oplysningerne. De er pålagt tavshedspligt.",
    ],
  },
  {
    id: "sikkerhed",
    title: "6. Sikkerhed",
    paragraphs: [
      "LoyalSum træffer passende tekniske og organisatoriske foranstaltninger, herunder:",
    ],
    list: [
      "Al trafik sendes krypteret.",
      "Adgangskoder gemmes aldrig i klartekst.",
      "Hver butiks data er teknisk adskilt, så én butik ikke kan se en andens.",
      "Adgang til at stemple og indløse gives pr. medarbejder og kan lukkes enkeltvis af butikken selv.",
      "Kundens stempelkort tilgås via en hemmelig adresse, der fungerer som nøgle, og som ikke kan gættes.",
    ],
  },
  {
    id: "underdatabehandlere",
    title: "7. Underdatabehandlere",
    paragraphs: [
      "Kunden giver hermed generel tilladelse til, at LoyalSum benytter de underdatabehandlere, der er anført nedenfor.",
      "Ændres listen, får kunden besked senest 30 dage før, og kunden kan gøre indsigelse. Kan der ikke findes en løsning, kan kunden opsige abonnementet.",
    ],
  },
  {
    id: "tredjelande",
    title: "8. Overførsel til tredjelande",
    paragraphs: [
      "Al behandling af personoplysninger sker inden for EU/EØS. Både database, hosting og udsendelse af e-mails ligger i Irland, som det fremgår af skemaet ovenfor.",
      "Skulle det blive nødvendigt at overføre personoplysninger til et land uden for EU/EØS, sker det alene på grundlag af EU-Kommissionens standardkontraktbestemmelser eller en gyldig beslutning om tilstrækkeligt beskyttelsesniveau, og kunden får besked forinden.",
    ],
  },
  {
    id: "bistand",
    title: "9. Bistand til kunden",
    paragraphs: [
      "LoyalSum bistår kunden med at opfylde sine forpligtelser, herunder:",
    ],
    list: [
      "Anmodninger fra registrerede om indsigt, rettelse, sletning, begrænsning eller dataportabilitet. Henvender en af butikkens kunder sig til os, videresender vi til butikken.",
      "Sikkerheden i behandlingen samt eventuelle konsekvensanalyser og forudgående høringer.",
    ],
  },
  {
    id: "brud",
    title: "10. Brud på persondatasikkerheden",
    paragraphs: [
      "LoyalSum underretter kunden uden unødig forsinkelse efter at være blevet opmærksom på et brud, og senest inden for 48 timer.",
      "Underretningen beskriver bruddets karakter, hvilke oplysninger og hvor mange registrerede der er berørt, de sandsynlige konsekvenser og hvad der er gjort. Det er kunden, der som dataansvarlig anmelder til Datatilsynet.",
    ],
  },
  {
    id: "revision",
    title: "11. Tilsyn",
    paragraphs: [
      "LoyalSum stiller på anmodning de oplysninger til rådighed, der er nødvendige for at vise, at denne aftale overholdes, og gør det muligt at gennemføre revision, herunder inspektion, ved kunden eller en revisor udpeget af kunden.",
      "Anmodning varsles med rimeligt varsel og må ikke forstyrre driften unødigt. Kunden afholder egne omkostninger.",
    ],
  },
  {
    id: "opbevaring",
    title: "12. Opbevaring og sletning undervejs",
    paragraphs: [
      "LoyalSum sletter automatisk personoplysninger efter faste frister. Oprydningen kører hver nat.",
      "Kunden er dataansvarlig og kan fastsætte andre frister for sine egne kunders oplysninger. Sker det ikke, gælder disse som instruks:",
    ],
    list: FRISTER.map((frist) => `${frist.hvad}: ${frist.naar.toLowerCase()}.`),
  },
  {
    id: "sletning",
    title: "13. Sletning ved ophør",
    paragraphs: [
      "Ved aftalens ophør sletter LoyalSum efter kundens valg alle personoplysninger eller leverer dem tilbage senest 30 dage efter ophøret, medmindre lovgivningen kræver, at de gemmes.",
      "Fristen på 30 dage giver plads til at fortryde en opsigelse. Ønsker kunden sletning med det samme, sker det på anmodning.",
      "Kunden kan til enhver tid slette oplysninger om en enkelt af sine kunder direkte i systemet.",
    ],
  },
  {
    id: "oevrigt",
    title: "14. Ændringer, ansvar og lovvalg",
    paragraphs: [
      "Kræver ny lovgivning eller praksis ændringer i aftalen, varsles de senest 30 dage før.",
      "Aftalen er underlagt dansk ret, og tvister afgøres ved de danske domstole.",
      `Spørgsmål til aftalen sendes til ${COMPANY.email}.`,
    ],
  },
];

/**
 * Kræver produktet en databehandleraftale?
 *
 * Ja for alt, vi sælger i dag — og det er ikke en sjusket generalisering: hver
 * vare indeholder en stander, og standeren tager imod feedback med navn,
 * e-mail og fritekst fra butikkens kunder. Stempelkortet lægger medlemsdata
 * oveni. Kommer der en dag en vare helt uden dataindsamling, markeres den med
 * `noPersonalData` på varen.
 */
export function requiresDpa(product: Pick<Product, "noPersonalData">): boolean {
  return !product.noPersonalData;
}

/** Er virksomhedens accept den gældende version? */
export function dpaIsCurrent(version: string | null | undefined): boolean {
  return version === DPA_VERSION;
}
