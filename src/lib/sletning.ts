import { randomBytes, timingSafeEqual } from "node:crypto";
import { COMPANY, SITE_NAME } from "@/lib/constants";
import { SLETNING_ANGREFRIST_DAGE } from "@/lib/abonnement";

/**
 * Selvbetjent sletning af alt.
 *
 * KUNDEN ER DATAANSVARLIG for sine egne kunders oplysninger og skal kunne
 * komme af med dem uden at bede os om lov. Men en sletning kan ikke gøres om,
 * og den rammer ikke kun den, der klikker: butikkens egne kunder mister deres
 * stempler samme sekund. Derfor er der tre uafhængige spærrer og en
 * fortrydelsesfrist oveni:
 *
 *   1. Man skal være logget ind som ejer af netop den virksomhed.
 *   2. Man skal skrive virksomhedens navn præcist. Et fejlklik skriver ikke.
 *   3. Man skal klikke et link, der er sendt til den registrerede mailadresse.
 *      Det beviser adgang til firmaets postkasse — ikke bare til en åben
 *      computer i baglokalet.
 *   4. Derefter går der syv dage, hvor det kan annulleres med ét klik.
 *
 * De tre første er UAFHÆNGIGE: at bryde én af dem rækker ikke. Den fjerde er
 * den, der fanger den beslutning, man fortryder dagen efter.
 *
 * Vil kunden hellere have det gjort med det samme, eller kan de ikke komme til
 * deres mail, skriver de til os. Den vej står i teksterne herunder, fordi en
 * selvbetjening uden en menneskelig udvej efterlader nogen strandet.
 */

/** Hvor bekræftelseslinket peger hen. Ligger under /dashboard, så login kræves. */
export const BEKRAEFT_STI = "/dashboard/abonnement/slet/bekraeft";

/**
 * Nyt token. 32 tilfældige bytes — det skal ikke kunne gættes, og det er den
 * eneste af de fire spærrer, der er hemmelig.
 */
export function nytToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Sammenligning i konstant tid.
 *
 * Et almindeligt `===` afslører gennem sin svartid, hvor mange tegn der var
 * rigtige, og tokenet kan gættes tegn for tegn. Samme grund som i
 * /api/cron/oprydning.
 */
export function tokenPasser(
  givet: string | null | undefined,
  gemt: string | null | undefined,
): boolean {
  if (!givet || !gemt) return false;
  const a = Buffer.from(givet);
  const b = Buffer.from(gemt);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Skrev de virksomhedens navn rigtigt?
 *
 * Mellemrum i enderne og store/små bogstaver tilgives — det er en spærre mod
 * fejlklik, ikke en stavekonkurrence. Alt andet skal passe.
 */
export function navnPasser(skrevet: string, firmanavn: string): boolean {
  return skrevet.trim().toLocaleLowerCase("da-DK") ===
    firmanavn.trim().toLocaleLowerCase("da-DK");
}

/** Hvornår sletningen udføres, hvis den bekræftes nu. */
export function udfoeresDen(nu = new Date()): Date {
  const d = new Date(nu);
  d.setDate(d.getDate() + SLETNING_ANGREFRIST_DAGE);
  return d;
}

/** Dansk dato, som den skrives i mails. */
function dansk(dato: Date): string {
  return dato.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export interface Mail {
  emne: string;
  tekst: string;
}

/**
 * Mail 1 — bestillingen. Indeholder linket, der skal klikkes.
 *
 * Den skriver HVAD der slettes, før den skriver hvordan man bekræfter. En
 * bekræftelsesmail, der begynder med en knap, bliver klikket uden at blive
 * læst.
 */
export function bestiltMail(firmanavn: string, link: string): Mail {
  return {
    emne: `Bekræft at alt skal slettes for ${firmanavn}`,
    tekst: `Der er bedt om, at alle data for ${firmanavn} slettes hos ${SITE_NAME}.

Det omfatter dine kunders stempelkort og stempler, al feedback, dine
standere og deres QR-koder, dine medarbejderes adgange og dit login.
Standerne holder op med at virke. Det kan ikke fortrydes bagefter.

Vi gemmer kun fakturaerne. Det er ikke et valg — bogføringsloven kræver
regnskabsmateriale i fem år efter regnskabsårets udløb.

Bekræft med dette link:
${link}

Der går derefter ${SLETNING_ANGREFRIST_DAGE} dage, før det sker, og du kan
annullere hele vejen.

Var det ikke dig, der bad om det, skal du ikke gøre noget — uden dette link
sker der ingenting. Skriv til ${COMPANY.email}, hvis du vil have os til at se
på det.`,
  };
}

/**
 * Mail 2 — bekræftet. Nu er datoen sat, og den står i emnefeltet.
 *
 * Datoen i emnet er med vilje: den mail skal kunne findes igen i en indbakke
 * af en, der er kommet i tvivl om, hvor lang tid der er tilbage.
 */
export function bekraeftetMail(
  firmanavn: string,
  udfoeres: Date,
  annullerLink: string,
): Mail {
  return {
    emne: `Alt for ${firmanavn} slettes ${dansk(udfoeres)}`,
    tekst: `Sletningen er bekræftet. Alle data for ${firmanavn} slettes
${dansk(udfoeres)}.

Indtil da sker der ingenting: dine kunder kan stadig få stempler, og alt
kan komme tilbage, hvis du fortryder.

Fortryd her:
${annullerLink}

Du kan også skrive til ${COMPANY.email} — så annullerer vi det for dig.

Skal det gå hurtigere end ${dansk(udfoeres)}, kan vi også det. Skriv til os.`,
  };
}

/**
 * Mail 3 — kvitteringen for, at det er sket.
 *
 * Den sendes, FØR oplysningerne er væk — bagefter findes mailadressen ikke
 * længere. Den er ikke en høflighed: en dataansvarlig skal kunne dokumentere,
 * at sletningen faktisk blev gennemført, og denne mail er kundens bevis.
 */
export function udfoertMail(firmanavn: string): Mail {
  return {
    emne: `Alt er nu slettet for ${firmanavn}`,
    tekst: `Alle personoplysninger for ${firmanavn} er slettet hos ${SITE_NAME}:
kundernes stempelkort og stempler, al feedback, standere og QR-koder,
medarbejderadgange, kontaktoplysninger og logo.

Tilbage er alene fakturaerne, som bogføringsloven kræver gemt i fem år
efter regnskabsårets udløb. De indeholder virksomhedens navn og adresse og
intet om dine kunder.

Denne mail er din kvittering. Gem den — som dataansvarlig skal du kunne
vise, at sletningen blev gennemført.

Spørgsmål: ${COMPANY.email}`,
  };
}
