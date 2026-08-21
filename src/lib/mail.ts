import { COMPANY, SITE_NAME } from "@/lib/constants";

/**
 * Udgående mail.
 *
 * SENDER GENNEM RESEND over HTTP og ikke over SMTP: SMTP kræver en åben
 * forbindelse og en klient, og en serverfunktion, der lever i sekunder, skal
 * ikke bruge sin levetid på et håndtryk. Domænet er allerede verificeret hos
 * Resend til Supabases mails.
 *
 * ER `RESEND_API_KEY` IKKE SAT, SENDES INGENTING. For alarmer er det ikke en
 * fejl — driftsloggen virker uden. For en mail til en KUNDE er det derimod
 * afgørende, at kalderen kan se det: bekræftelsen på en sletning, der aldrig
 * gik ud, må ikke se ud som om den gjorde. Derfor svarer begge funktioner med,
 * om der rent faktisk gik en mail af sted.
 */

const AFSENDER_DRIFT = `${SITE_NAME} drift <drift@loyalsum.dk>`;
const AFSENDER_KUNDE = `${SITE_NAME} <kontakt@loyalsum.dk>`;

async function send(
  fra: string,
  til: string[],
  emne: string,
  tekst: string,
): Promise<boolean> {
  const noegle = process.env.RESEND_API_KEY;
  if (!noegle) {
    console.error("[mail] RESEND_API_KEY mangler —", emne, "blev ikke sendt");
    return false;
  }

  try {
    const svar = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${noegle}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fra, to: til, subject: emne, text: tekst }),
    });

    if (!svar.ok) {
      console.error("[mail] Resend afviste:", svar.status, await svar.text());
      return false;
    }
    return true;
  } catch (err) {
    // En mail, der fejler, må ALDRIG vælte det, den handlede om. Kalderen får
    // false og kan skrive det rigtige i loggen frem for at antage.
    console.error("[mail] kunne ikke sendes:", (err as Error).message);
    return false;
  }
}

/**
 * Alarm til os selv.
 *
 * Fejl i baggrundsopgaver rammer ingen skærm. Webhooken, oprydningen og
 * samtykkeloggen kører alle uden en bruger, der kan se, at det gik galt — så
 * beskeden skal ud af systemet af sig selv.
 */
export function sendAlarm(emne: string, tekst: string): Promise<boolean> {
  return send(
    AFSENDER_DRIFT,
    [COMPANY.email],
    `[${SITE_NAME}] ${emne}`,
    tekst,
  );
}

/** Mail til en kunde. Afsenderen er den, de kan svare på. */
export function sendKundeMail(
  til: string,
  emne: string,
  tekst: string,
): Promise<boolean> {
  return send(AFSENDER_KUNDE, [til], emne, tekst);
}
