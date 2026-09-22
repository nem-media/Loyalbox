/**
 * UDTALELSER — OG DEN ENE REGEL, DER GØR SEKTIONEN LOVLIG.
 *
 * En kundeudtalelse på et website er en anprisning. Er den opdigtet, er den
 * vildledende markedsføring efter markedsføringslovens § 5-6, og den rammer
 * samme sted som review gating: troværdigheden i, at anmeldelser hos os
 * betyder noget. Vi må altså gerne BYGGE sektionen, før vi har udtalelser —
 * vi må bare ikke vise noget, der ikke er sagt.
 *
 * DE SEKS HERUNDER ER RIGTIGE (bekræftet 22. september 2026). De er sagt af
 * faktiske LoyalSum-kunder, og kunderne har accepteret at blive citeret.
 * Indtil da stod her tre pladsholdere, som `synligeUdtalelser()` filtrerede
 * fra i produktion — spærren bliver stående, fordi den næste udtalelse, nogen
 * skriver ind, skal igennem samme bevidste valg.
 *
 * AFSENDEREN ER EN KATEGORI OG ALDRIG EN PERSON.
 *
 * Kunderne er citeret ANONYMT: "Bager i København", ikke et navn og en
 * butik. Det er et valg, og det er hverken en forglemmelse eller en
 * udvanding. Et navn og et firma er personoplysninger, som kræver deres eget
 * samtykke og skal kunne trækkes tilbage — og en branche plus en landsdel
 * siger læseren præcis dét, der er relevant: at det er en forretning som
 * hendes egen. Derfor findes felterne `navn` og `virksomhed` ikke længere.
 *
 * BILLEDER FINDES IKKE SOM FELT, og det er med vilje. Vi har ingen godkendte
 * kundebilleder, og et AI-ansigt eller et stockfoto ved siden af et citat er
 * en påstand om et menneske. Avataren i sektionen tegner INITIALER af
 * kategorien — se `initialer()` og begrundelsen i `udtalelser.tsx` for,
 * hvorfor den ikke må være `KundeAvatar`.
 *
 * SÅDAN TAGES EN NY IND: skriv den herunder UDEN `isPlaceholder`, og kun når
 * kunden har sagt ja. Ingen anden kode skal røres.
 */
export interface Udtalelse {
  id: string;
  /**
   * Hvem der har sagt det — som BRANCHE OG LANDSDEL, aldrig som person.
   *
   * Fx "Bager i København". Teksten bruges både som billedtekst under citatet
   * og som kilde til avatarens initialer, så de to ikke kan komme til at
   * sige hver sit.
   */
  afsender: string;
  /** Citatet, som det er sagt. Redigér ikke meningen. */
  citat: string;
  /**
   * SAND = må kun ses under udvikling. Udelades feltet, er udtalelsen
   * godkendt og rigtig, og så vises den alle steder.
   */
  isPlaceholder?: true;
}

export const UDTALELSER: Udtalelse[] = [
  {
    id: "bager-kbh",
    afsender: "Bager i København",
    citat:
      "Det står bare ved kassen, og kunderne finder selv ud af resten. Det er nok det, jeg bedst kan lide ved det.",
  },
  {
    id: "frisoer-midtsj",
    afsender: "Frisør på Midtsjælland",
    citat:
      "Vi havde tidligere almindelige stempelkort, og de blev hele tiden glemt eller væk. Nu har kunderne det på mobilen, og det fungerer meget bedre for os.",
  },
  {
    id: "cafe-fyn",
    afsender: "Café på Fyn",
    citat:
      "Nem opsætning og overraskende lidt vi selv skal holde øje med. Vi bruger især anmeldelser og stempelkortet.",
  },
  {
    id: "restaurant-aarhus",
    afsender: "Restaurant i Aarhus",
    citat:
      "Vi ville egentlig bare gøre det lettere for gæsterne at anmelde os, men er endt med også at bruge loyalitetsdelen. Det giver god mening at have det samlet.",
  },
  {
    id: "butik-nordsj",
    afsender: "Butik i Nordsjælland",
    citat:
      "Det har fungeret rigtig godt. Kunderne spørger faktisk selv til deres point nu. Det havde jeg ikke regnet med.",
  },
  {
    id: "salon-trekant",
    afsender: "Salon i Trekantsområdet",
    citat:
      "Det vigtigste for os var, at det ikke blev endnu et tungt system, som personalet skulle lære. Vi kom hurtigt i gang, og kunderne har taget godt imod det.",
  },
];

/**
 * Initialerne i avataren — FØRSTE og SIDSTE ord i kategorien.
 *
 * "Bager i København" → BK, "Salon i Trekantsområdet" → ST. Mellemordene er
 * bindeord ("i", "på") og siger intet; første ord er branchen og sidste ord
 * er stedet, altså præcis de to ting, labelen består af.
 *
 * DE UDLEDES OG SKRIVES IKKE AF. Stod bogstaverne som deres eget felt, kunne
 * de komme i utakt med teksten under dem — og en avatar, der siger noget
 * andet end billedteksten ved siden af, er en fejl, ingen opdager.
 *
 * Ét ord giver ét bogstav frem for at gentage det: "BB" ud af "Bager" ville
 * påstå to ord, der ikke er der. `udtalelser.test.ts` kræver, at hver
 * afsender i listen giver mindst ét bogstav.
 */
export function initialer(afsender: string): string {
  const ord = afsender.trim().split(/\s+/).filter(Boolean);
  if (ord.length === 0) return "";
  const foerste = ord[0]!.charAt(0);
  const sidste = ord.length > 1 ? ord[ord.length - 1]!.charAt(0) : "";
  return (foerste + sidste).toUpperCase();
}

/**
 * Dem, der må vises her og nu.
 *
 * Grenen er `NODE_ENV` og ikke et eget miljøflag: en ny indstilling kan
 * MANGLE i produktionen, og virkningen ville være tavs — præcis den fælde, en
 * signeret gendan-nøgle undgår ved at bruge en nøgle, der altid er der.
 * `NODE_ENV` er `production` i hver eneste Vercel-bygning og kan ikke glemmes.
 *
 * SPÆRREN BLIVER STÅENDE, SELV OM LISTEN I DAG KUN RUMMER GODKENDTE CITATER.
 * Den koster ingenting, og den er dét, der gør, at den næste udtalelse kan
 * skrives ind og ses lokalt, før nogen har sagt ja til den.
 */
export function synligeUdtalelser(): Udtalelse[] {
  const godkendte = UDTALELSER.filter((u) => !u.isPlaceholder);
  if (process.env.NODE_ENV === "production") return godkendte;
  return UDTALELSER;
}
