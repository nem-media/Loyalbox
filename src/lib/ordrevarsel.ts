/**
 * Varsel til os selv, når nogen køber noget.
 *
 * HVORFOR DET SKAL FINDES: en betaling er den ene hændelse i systemet, der
 * kræver at et menneske gør noget bagefter — en stander skal produceres og
 * sendes. Uden en mail ville den viden kun ligge i admin-panelet, som ingen
 * har åbent, og i Stripes egne kvitteringer, som ikke ved noget om ordren.
 *
 * DEN INDEHOLDER PERSONOPLYSNINGER (kundens navn, mail og leveringsadresse) og
 * hører derfor hjemme i en mail til os — ALDRIG i driftsloggen, som kun må
 * indeholde opgavenavn, status og antal.
 *
 * Teksten bygges her som en ren funktion, så den kan testes uden at sende
 * noget. At sende er webhookens opgave.
 */

export type Koebstype = "nyt-abonnement" | "opgradering" | "engangskoeb" | "tilkoeb";

export interface Ordredetaljer {
  type: Koebstype;
  /** Varens navn, som det står på fakturaen. */
  vare: string;
  antal: number;
  /** Beløb ex. moms i kroner. */
  beloeb: number;
  /** Månedsbeløb ex. moms, hvis der er et abonnement med. */
  maanedligt?: number | null;
  firmanavn: string | null;
  cvr: string | null;
  email: string | null;
  /** Leveringsadresse i linjer, som Stripe gav dem. Tom = ingen fysisk vare. */
  leveringslinjer: string[];
  /** Til opslag i Stripe. */
  sessionId: string | null;

  /**
   * Adressen, QR-koden og NFC-taggen skal indeholde.
   *
   * DEN STÅR I BEGGE MAILS, og af hver sin grund. Til os er det dét, der
   * skal trykkes og skrives på taggen. Til kunden er det den sidste chance
   * for at opdage en tastefejl: uden abonnement trykkes linket fast, og et
   * skilt kan ikke kaldes tilbage.
   *
   * `null` betyder, at standeren ikke har nogen destination endnu — så er
   * der intet at love, og linjen udelades.
   */
  qrAdresse?: string | null;

  /**
   * Er linket trykt fast?
   *
   * Uden abonnement peger koden direkte på butikkens eget link og kan aldrig
   * ændres. Med abonnement peger den på vores egen adresse, og butikken
   * bestemmer selv i dashboardet, hvor den fører hen. To vidt forskellige
   * beskeder — se `qrAdresseFor()` i qr-adresse.ts.
   */
  qrFast?: boolean;
}

const OVERSKRIFT: Record<Koebstype, string> = {
  "nyt-abonnement": "Nyt abonnement",
  opgradering: "Opgradering",
  engangskoeb: "Nyt køb",
  tilkoeb: "Tilkøb",
};

/**
 * Hvad der skal ske nu. Står ØVERST, fordi det er derfor mailen sendes —
 * beløbet kan man slå op, men "der skal pakkes noget" kan man ikke gætte.
 */
function naesteSkridt(d: Ordredetaljer): string {
  if (d.leveringslinjer.length > 0) {
    return `SKAL PRODUCERES OG SENDES: ${d.antal} stk. ${d.vare}.`;
  }
  if (d.type === "opgradering" || d.type === "nyt-abonnement") {
    return "Ingen forsendelse — adgangen er åbnet automatisk.";
  }
  return "Ingen forsendelse.";
}

function kroner(n: number): string {
  return `${n.toLocaleString("da-DK")} kr. ex. moms`;
}

export function ordrevarsel(d: Ordredetaljer): { emne: string; tekst: string } {
  const linjer: string[] = [
    naesteSkridt(d),
    "",
    `Vare:      ${d.vare}${d.antal > 1 ? ` × ${d.antal}` : ""}`,
    `Betalt nu: ${kroner(d.beloeb)}`,
  ];

  if (d.maanedligt) {
    linjer.push(`Løbende:   ${kroner(d.maanedligt)} pr. måned`);
  }

  linjer.push(
    "",
    `Kunde:     ${d.firmanavn ?? "(intet firmanavn)"}`,
    `CVR:       ${d.cvr ?? "(ikke oplyst)"}`,
    `E-mail:    ${d.email ?? "(ikke oplyst)"}`,
  );

  if (d.leveringslinjer.length > 0) {
    linjer.push("", "Leveringsadresse:", ...d.leveringslinjer.map((l) => `  ${l}`));
  } else {
    linjer.push("", "Leveringsadresse: ingen (der sendes ikke noget)");
  }

  if (d.qrAdresse) {
    // Dét, der skal trykkes OG skrives på NFC-taggen. Står det ikke her,
    // skal den, der pakker, slå det op i admin.
    linjer.push(
      "",
      `QR og NFC: ${d.qrAdresse}`,
      d.qrFast
        ? "  (trykkes fast — butikken har intet abonnement)"
        : "  (vores egen adresse — butikken styrer selv destinationen)",
    );
  }

  if (d.sessionId) {
    linjer.push("", `Stripe: ${d.sessionId}`);
  }

  return {
    // Beløbet og firmaet i emnet, så en indbakke kan skimmes uden at åbne.
    emne: `${OVERSKRIFT[d.type]}: ${d.firmanavn ?? "ukendt kunde"} — ${kroner(d.beloeb)}`,
    tekst: linjer.join("\n"),
  };
}
