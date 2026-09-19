import { getProduct } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

/**
 * De fire løsninger på platformssiden.
 *
 * NAVN, PRIS OG FREMHÆVNING UDLEDES AF `PRODUCTS` og skrives ikke af.
 * Sektionen hed før "Skilt uden konto", "Reviewstander" og "Reviewstander
 * Pro" — to af tre navne fandtes ikke i kataloget, og LoyalSum Komplet
 * manglede helt. En afskrift kan blive stående, dagen et produkt skifter
 * navn eller pris; et opslag kan ikke.
 *
 * `platforme` er KUN anmeldelsesplatforme. Det egne link (menukort, booking)
 * er ikke en anmeldelse, og en chip ved siden af de tre andre ville få det
 * til at ligne en fjerde platform. Det står i noten i stedet.
 */
export const PLATFORM_VALG: {
  slug: string;
  platforme: string[];
  maerke: string;
  note: string;
  /**
   * Tabellens platformcelle. EGET FELT og ikke `platforme.join()`: den enkle
   * Reviewstander peger på ÉN af dem, mens de to andre viser dem alle. Skrev
   * vi bare navnene i alle tre rækker, stod der det samme tre gange, og
   * forskellen — som er hele pointen — forsvandt.
   */
  platformCelle: string;
  /** Korte celler til tabellen — de skal kunne skimmes, ikke læses. */
  kundenSer: string;
  skifte: string;
  stempelkort: string;
  /**
   * Er der et fysisk skilt med i varen?
   *
   * KOLONNEN KOM TIL MED LoyalSum Komplet Online. Uden den svarede tabellen
   * ens på alle fem spørgsmål for Komplet og Komplet Online — platforme,
   * kundens vej, skifte og stempelkort er de samme — og så ville de to ligne
   * samme vare til to priser. Forskellen ER standeren, og en
   * sammenligningstabel, der ikke har en kolonne til den ene forskel, der
   * findes, sammenligner ikke noget.
   */
  stander: string;
}[] = [
  {
    slug: "reviewstander",
    platforme: ["Google", "Trustpilot", "Facebook"],
    maerke: "Går direkte videre",
    platformCelle: "Én af Google, Trustpilot, Facebook eller eget link",
    kundenSer: "Sendes direkte videre",
    note: "Købes uden konto. QR'en sender kunden direkte videre til det ene link, du vælger — også dit eget, fx menukortet. Der vises ingen side undervejs, og derfor indsamles hverken feedback eller statistik.",
    skifte: "Nej — sættes ved bestillingen",
    stempelkort: "Nej",
    stander: "Ja",
  },
  {
    slug: "reviewstander-pro",
    platforme: ["Google", "Trustpilot", "Facebook"],
    maerke: "Kunden vælger selv",
    platformCelle: "Google, Trustpilot og Facebook — plus eget link",
    kundenSer: "Vælger mellem dine platforme",
    note: "Du bestemmer selv, hvilke platforme kunden får at se, og du kan skifte dem når som helst uden at trykke standeren om. Alle valg vises med samme vægt, og du kan lægge dit eget link ved siden af.",
    skifte: "Ja — når som helst",
    stempelkort: "Nej",
    stander: "Ja",
  },
  {
    slug: "loyalsum-komplet",
    platforme: ["Google", "Trustpilot", "Facebook"],
    maerke: "Alt i Pro + stempelkort",
    platformCelle: "Google, Trustpilot og Facebook — plus eget link",
    kundenSer: "Vælger — og kan tilmelde sig stempelkort",
    note: "Alt fra Reviewstander Pro, og oveni resten af platformen: digitalt stempelkort uden app for dine kunder, kundeklub og opslag af dine bedste anmeldelser.",
    skifte: "Ja — når som helst",
    stempelkort: "Ja",
    stander: "Ja",
  },
  {
    /*
      SAMME SOFTWARE SOM KOMPLET — OG DET ER DERFOR, DEN SKAL MED HER.
      Den stod udenfor med den begrundelse, at tabellen svarer på "hvilken
      stander skal jeg vælge?", og at en vare uden skilt ville få fire
      tankestreger. Det holdt ikke: hver eneste celle har et rigtigt svar,
      fordi platformen er den samme. Det, der manglede, var en kolonne til
      forskellen — se `stander` ovenfor.
    */
    slug: "loyalsum-komplet-online",
    platforme: ["Google", "Trustpilot", "Facebook"],
    maerke: "Alt i Komplet — uden skilt",
    platformCelle: "Google, Trustpilot og Facebook — plus eget link",
    kundenSer: "Vælger — og kan tilmelde sig stempelkort",
    note: "Præcis de samme funktioner som LoyalSum Komplet, men uden noget at stille på disken. Du får dit eget LoyalSum-link og en QR-kode, som du selv deler — på din hjemmeside, i din webshop eller i dine mails.",
    skifte: "Ja — når som helst",
    stempelkort: "Ja",
    stander: "Nej — du deler selv linket",
  },
];

/**
 * "499 kr.", "499 kr. + 99 kr./md." eller "399 kr./md." — samme tal som i
 * checkout.
 *
 * EN VARE UDEN ENGANGSPRIS MÅ IKKE STÅ MED ET NUL FORAN. Uden grenen skrev
 * funktionen "0 kr. + 399 kr./md." for LoyalSum Komplet Online — og i en
 * sammenligningstabel ved siden af tre varer til 499 kr. er dét nul det
 * første, øjet lander på. Samme fælde som i buy-boksen og i katalogkortet:
 * `price: 0` er sandt, men det er ikke en pris, der skal skrives ud.
 */
export function prisTekst(slug: string): string {
  const p = getProduct(slug);
  if (!p) return "";
  const maaned = p.monthlyPrice ? `${formatCurrency(p.monthlyPrice)}/md.` : "";
  if (!p.price) return maaned;
  const engangs = formatCurrency(p.price);
  return maaned ? `${engangs} + ${maaned}` : engangs;
}
