import { COMPANY } from "./constants";
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
    linjer.push(
      `Vi går i gang med at producere dit skilt og sender det inden for ${COMPANY.deliveryDays}.`,
      "Du hører fra os, når det er afsendt.",
    );
  }

  if (d.maanedligt) {
    linjer.push(
      "Du kan logge ind med det samme og sætte din QR-adresse op — du behøver ikke vente på skiltet.",
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

  const naeste = hvadSkerDerNu(d);
  if (naeste.length > 1) linjer.push("", ...naeste);

  linjer.push(
    "",
    `Har du spørgsmål, så svar bare på denne mail eller skriv til ${COMPANY.email}.`,
    "",
    "Venlig hilsen",
    COMPANY.legalName,
  );

  return {
    // Varen i emnet, så kunden kan finde mailen igen uden at åbne den.
    emne: `Tak for din bestilling — ${d.vare}`,
    tekst: linjer.join("\n"),
  };
}
