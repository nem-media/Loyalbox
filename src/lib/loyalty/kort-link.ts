import { BRAND_NAVN } from "@/lib/constants";

/**
 * "FIND MIT KORT" — vejen tilbage til et stempelkort, når linket er væk.
 *
 * HVORFOR DEN SKAL FINDES. Sitet lover "uden app · uden konto", og det løfte
 * holder, fordi `selfEnroll()` genbruger medlemmet på e-mail eller telefon:
 * kunden kan stille sig i butikken, taste den samme adresse og få sit kort
 * tilbage med alle sine stempler. Men DÉT kræver, at man er i butikken — der
 * var ingen vej ind hjemmefra. En kunde, der havde mistet linket og sad i sin
 * sofa, kunne ikke komme til sit eget kort, og hverken vi eller butikken
 * kunne hjælpe hende.
 *
 * TRE REGLER, OG DE ER ALLE SAMMEN SIKKERHED:
 *
 * 1. SVARET ER ALTID DET SAMME. Siden må ikke kunne bruges til at spørge, om
 *    en bestemt e-mail handler i en bestemt butik — det ville gøre formularen
 *    til et opslagsværk over butikkens kundeliste. Derfor: "hvis der findes
 *    et kort, har vi sendt et link", uanset hvad vi fandt.
 *
 * 2. LINKET GÅR KUN TIL INDBAKKEN. Tokenet vises ALDRIG på skærmen. Det er
 *    hele grunden til, at det er forsvarligt: kun den, der kan læse mailen,
 *    får adgangen — præcis samme regel som aktiveringslinket efter et køb.
 *
 * 3. ET KORT PÅ EN KONTO FÅR IKKE SIT TOKEN MED. Har kunden knyttet kortet
 *    til en konto, er e-mail alene ikke længere nok til at åbne det — samme
 *    spærre som i `selfEnroll()`. Mailen nævner det og henviser til login;
 *    det er nyttigt for ejeren og siger ingenting til en fremmed, fordi
 *    fremmede ikke får mailen.
 */

/** Hvor længe der går, før samme kort må mailes igen. */
export const KORT_LINK_KARANTAENE_MINUTTER = 10;

/** Det ene svar, siden giver — uanset hvad vi fandt. Se regel 1. */
export const FIND_KORT_KVITTERING =
  "Hvis der findes et stempelkort med den e-mailadresse, har vi sendt et link til det. Kig i din indbakke — og i spamfilteret, hvis den ikke er der.";

export interface KortLinje {
  /** Butikkens navn, så kunden kan kende kortene fra hinanden. */
  butik: string;
  /** Den fulde adresse til kortet. Null når kortet er knyttet til en konto. */
  url: string | null;
}

/**
 * Mailen med kundens kort.
 *
 * REN FUNKTION, så ordlyden kan prøves uden at sende noget — og så teksten
 * ikke bliver skrevet i hånden inde i en handling, hvor ingen kan se den.
 */
export function kortLinkMail(
  kort: KortLinje[],
  /** Sitets adresse. Gives med, så funktionen kan prøves uden et miljø. */
  siteUrl: string,
): { emne: string; tekst: string } {
  const medLink = kort.filter((k) => k.url);
  const paaKonto = kort.filter((k) => !k.url);

  const linjer: string[] = [
    "Hej",
    "",
    medLink.length === 1
      ? "Her er linket til dit stempelkort:"
      : medLink.length > 1
        ? "Her er linkene til dine stempelkort:"
        : "Du har stempelkort hos os, men de er gemt på en konto.",
  ];

  for (const k of medLink) {
    linjer.push("", k.butik, `  ${k.url}`);
  }

  if (medLink.length) {
    linjer.push(
      "",
      /*
       * DET VIGTIGSTE RÅD STÅR HER OG IKKE TIL SIDST. Kunden er lige nu i
       * gang med at rette op på et mistet link — det er præcis øjeblikket,
       * hvor det giver mening at gemme det et sted, det ikke kan mistes igen.
       */
      "Gem linket som bogmærke, eller læg kortet på telefonens hjemmeskærm. Så er det ved hånden næste gang.",
    );
  }

  if (paaKonto.length) {
    linjer.push(
      "",
      medLink.length
        ? "Du har også kort, der er gemt på en konto:"
        : "Det gælder:",
      ...paaKonto.map((k) => `  ${k.butik}`),
      "",
      // TOKENET FØLGER IKKE MED for et kort på en konto — dér er login
      // adgangen, og det er hele pointen med at have knyttet det.
      `Log ind på ${siteUrl}/mine-kort for at åbne dem.`,
    );
  }

  linjer.push(
    "",
    "Har du ikke bedt om denne mail, kan du roligt slette den — der er ikke sket noget med dit kort.",
    "",
    `Venlig hilsen`,
    BRAND_NAVN,
  );

  return {
    /*
     * FLERTALLET TÆLLER ALLE KORT — ikke kun dem med et link. En kunde med et
     * kort i to butikker, hvoraf det ene ligger på hendes konto, har stadig
     * TO kort, og emnefeltet skal svare til det, mailen handler om.
     */
    emne: kort.length > 1 ? "Dine stempelkort" : "Dit stempelkort",
    tekst: linjer.join("\n"),
  };
}
