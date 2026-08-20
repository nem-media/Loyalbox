import { COMPANY, SITE_NAME } from "@/lib/constants";

/**
 * Alarm på mail.
 *
 * Fejl i baggrundsopgaver rammer ingen skærm. Webhooken, oprydningen og
 * samtykkeloggen kører alle uden en bruger, der kan se, at det gik galt — så
 * beskeden skal ud af systemet af sig selv.
 *
 * SENDER GENNEM RESEND over HTTP og ikke over SMTP: SMTP kræver en åben
 * forbindelse og en klient, og en serverfunktion, der lever i sekunder, skal
 * ikke bruge sin levetid på et håndtryk. Domænet er allerede verificeret hos
 * Resend til Supabases mails.
 *
 * ER `RESEND_API_KEY` IKKE SAT, SENDES INGENTING — og det er ikke en fejl.
 * Alarmen er en tilføjelse; driftsloggen virker uden. Funktionen siger med sin
 * returværdi, om der rent faktisk gik en mail ud, så kalderen kan skrive det
 * rigtige i loggen frem for at antage det.
 */

const AFSENDER = `${SITE_NAME} drift <drift@loyalsum.dk>`;

export async function sendAlarm(emne: string, tekst: string): Promise<boolean> {
  const noegle = process.env.RESEND_API_KEY;
  if (!noegle) return false;

  try {
    const svar = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${noegle}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: AFSENDER,
        to: [COMPANY.email],
        subject: `[${SITE_NAME}] ${emne}`,
        text: tekst,
      }),
    });

    if (!svar.ok) {
      console.error("[alarm] Resend afviste:", svar.status, await svar.text());
      return false;
    }
    return true;
  } catch (err) {
    // En alarm, der fejler, må ALDRIG vælte det, den skulle advare om. Sker
    // det, står fejlen stadig i driftsloggen — den blev bare ikke sendt ud.
    console.error("[alarm] kunne ikke sendes:", (err as Error).message);
    return false;
  }
}
