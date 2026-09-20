import { FORNYELSE_FORKLARING, COMPANY, BRAND_NAVN } from "./constants";
import { SVARTID } from "./kontakt";
import type { Ordredetaljer } from "./ordrevarsel";

/**
 * Ordrebekræftelsen til KUNDEN.
 *
 * HVORFOR DEN FINDES: efter et køb hørte kunden ingenting. Stripes egen
 * kvittering er slået fra i dashboardet ("Successful payments"), og vi sendte
 * kun et varsel til os selv. Kunden så altså kvitteringssiden og derefter
 * intet, før skiltet lå i postkassen — og en bestilling, man ikke kan se
 * bevis på, føles som en, der ikke gik igennem.
 *
 * SAMME `Ordredetaljer` SOM DET INTERNE VARSEL, og det er med vilje: to
 * beskrivelser af samme ordre, bygget på hvert sit datasæt, ville før eller
 * siden komme til at sige forskellige ting om det samme køb.
 *
 * FORSKELLEN PÅ DE TO er hvad de svarer på. Varslet til os siger "der skal
 * pakkes noget". Bekræftelsen til kunden siger "vi har fået din bestilling,
 * her er hvad du har købt, og her er hvad der sker nu". Derfor står næste
 * skridt øverst i den ene og til sidst i den anden.
 */

function kroner(n: number): string {
  return `${n.toLocaleString("da-DK")} kr.`;
}

/**
 * Hvad kunden skal forvente. Må kun love det, vi FAKTISK gør.
 *
 * Leveringstiden kommer fra `COMPANY.deliveryDays`, som også står i
 * handelsbetingelserne — så de to ikke kan komme til at love hver sit.
 */
function hvadSkerDerNu(d: Ordredetaljer): string[] {
  const linjer: string[] = ["Hvad sker der nu?"];

  if (d.leveringslinjer.length > 0) {
    // INGEN "du hører fra os, når det er afsendt" — vi sender IKKE en
    // forsendelsesmail (admin skifter blot ordrens status). Kun løftet om
    // leveringstid, som vi faktisk holder, og som også står i
    // handelsbetingelserne via COMPANY.deliveryDays.
    linjer.push(
      `Vi går i gang med at producere dit skilt og sender det inden for ${COMPANY.deliveryDays}.`,
    );
  }

  if (d.maanedligt) {
    /*
     * UDEN ET SKILT ER DER INTET AT VENTE PÅ.
     *
     * Sætningen "du behøver ikke vente på skiltet" er en trøst til den, der
     * har et skilt i posten. Til en Online-kunde er den en gåde: hvilket
     * skilt? Derfor to sætninger — den samme besked, sagt sandt begge steder.
     */
    linjer.push(
      d.digital
        ? "Du kan logge ind med det samme. Dit LoyalSum-link og din QR-kode står klar i dashboardet under Standere, og du kan dele dem, hvor du vil."
        : "Du kan logge ind med det samme og sætte din QR-adresse op — du behøver ikke vente på skiltet.",
    );
  }

  return linjer;
}

export function ordrebekraeftelse(d: Ordredetaljer): {
  emne: string;
  tekst: string;
} {
  const linjer: string[] = [
    d.firmanavn ? `Hej ${d.firmanavn}` : "Hej",
    "",
    "Tak for din bestilling. Her er, hvad vi har registreret.",
    "",
    `Vare:      ${d.vare}${d.antal > 1 ? ` × ${d.antal}` : ""}`,
    `Betalt nu: ${kroner(d.beloeb)} ex moms`,
  ];

  if (d.maanedligt) {
    linjer.push(`Herefter:  ${kroner(d.maanedligt)} ex moms pr. måned`);
    /*
     * HVORNÅR DER TRÆKKES IGEN. Beløbet ovenfor er hele månedsprisen — her
     * stod før en forklaring på, hvorfor det IKKE var det, fordi cyklussen
     * var ankret til den 20. og første periode derfor pro rata. Nu er
     * spørgsmålet et andet og lige så vigtigt: hvornår kommer næste træk?
     * Et abonnement uden en dato er dét, folk opsiger for en sikkerheds skyld.
     */
    linjer.push("", FORNYELSE_FORKLARING);
  }

  /*
   * MOMSEN NÆVNES EKSPLICIT. Priserne på sitet er ex moms, fordi vi sælger
   * til virksomheder — men beløbet, der er trukket på kortet, ER med moms.
   * Uden denne linje ser bekræftelsen ud til at være et andet beløb end det,
   * kunden kan se i banken.
   */
  linjer.push(
    "",
    "Beløbene er ex moms. Der er lagt 25 % dansk moms oveni ved betalingen, og det fremgår af fakturaen fra Stripe.",
  );

  /*
   * LINKET STÅR PÅ SKRIFT, OG DET ER IKKE PYNT.
   *
   * Uden abonnement peger QR-koden direkte på butikkens eget link og trykkes
   * fast — et skilt kan ikke kaldes tilbage. Denne mail er den sidste
   * lejlighed til at opdage en tastefejl, mens den stadig kan rettes, og den
   * er samtidig kundens dokumentation for, hvad de har bestilt.
   *
   * MED abonnement er beskeden en anden: adressen er vores, og butikken
   * bestemmer selv, hvor den fører hen. Så er der ingenting at skynde sig med.
   */
  if (d.qrAdresse) {
    linjer.push(
      "",
      d.qrFast ? "QR-koden fører til:" : "Din QR-adresse:",
      `  ${d.qrAdresse}`,
      "",
      d.qrFast
        ? "Linket trykkes fast på skiltet og kan ikke ændres bagefter. Er det forkert, så svar på denne mail med det samme — er skiltet ikke gået i trykken endnu, retter vi det."
        : "Skiltet peger på den adresse. Hvor den fører hen, bestemmer du selv i dit dashboard, og du kan skifte det senere uden nye skilte.",
    );
  }

  if (d.leveringslinjer.length > 0) {
    linjer.push(
      "",
      "Sendes til:",
      ...d.leveringslinjer.map((l) => `  ${l}`),
    );
  }

  /*
   * AKTIVERINGEN STÅR FØR ALT ANDET "hvad nu". Det er det eneste i mailen,
   * kunden SKAL gøre — resten sker af sig selv — og en handling begravet
   * under leveringstider bliver ikke set.
   */
  if (d.aktiveringUrl) {
    linjer.push(
      "",
      "Opret din adgang:",
      `  ${d.aktiveringUrl}`,
      "",
      "Vælg en adgangskode, så åbner dit dashboard. Har du allerede gjort det på kvitteringssiden, kan du se bort fra linket.",
    );
  }

  const naeste = hvadSkerDerNu(d);
  if (naeste.length > 1) linjer.push("", ...naeste);

  linjer.push(
    "",
    /*
      SVARLØFTET SKAL VÆRE DET SAMME I MAILEN SOM PÅ SIDEN. Kunden får at
      vide, at de bare kan svare — men ikke hvornår der så kommer et svar,
      og et løfte, der kun står på /kontakt, hjælper ikke den, der sidder i
      indbakken. `SVARTID` er ét sted (`lib/kontakt.ts`), så mailen og siden
      ikke kan komme til at sige hver sit; kontortiden BÆRER løftet og skal
      med, fordi "få minutter" er forkert klokken 22.
    */
    `Har du spørgsmål, så svar bare på denne mail eller skriv til ${COMPANY.email}. ${SVARTID}`,
    "",
    "Venlig hilsen",
    /*
      BRANDET UNDERSKRIVER, IKKE SELSKABET. Her stod COMPANY.legalName, så en
      kunde, der lige havde købt hos LoyalSum, fik en mail underskrevet "Nem
      Media ApS" — et navn, de aldrig har set. Selskabsnavnet hører hjemme
      dér, hvor det ER et krav: på fakturaen, i footeren, i
      databehandleraftalen og i privatlivspolitikken. Ikke i en hilsen.
    */
    BRAND_NAVN,
  );

  return {
    // Varen i emnet, så kunden kan finde mailen igen uden at åbne den.
    emne: `Tak for din bestilling — ${d.vare}`,
    tekst: linjer.join("\n"),
  };
}
