import { getProduct } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

/**
 * De tre løsninger på platformssiden.
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
  },
];

/** "499 kr." eller "499 kr. + 99 kr./md." — samme tal som i checkout. */
export function prisTekst(slug: string): string {
  const p = getProduct(slug);
  if (!p) return "";
  const engangs = formatCurrency(p.price);
  return p.monthlyPrice
    ? `${engangs} + ${formatCurrency(p.monthlyPrice)}/md.`
    : engangs;
}
