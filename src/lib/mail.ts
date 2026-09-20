import { COMPANY, SITE_NAME } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site";
import { mailHtml } from "@/lib/mail-skabelon";

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
  /**
   * Hvem et SVAR skal gå til, hvis det ikke er afsenderen.
   *
   * Kontaktformularen sender fra vores eget domæne (det er dét, der er
   * verificeret hos Resend — sender vi som den besøgende, ryger mailen i
   * spamfilteret på SPF/DKIM). Uden `reply_to` ville et svar derfor gå til os
   * selv, og beskeden ville se besvaret ud, uden at nogen havde fået noget.
   */
  svarTil?: string,
  /**
   * Skal mailen også sendes som HTML?
   *
   * KUN KUNDEMAILS. En alarm og et ordrevarsel læses i en travl indbakke og
   * ofte på en telefon, og dér er ren tekst bedre end pæn: man kan søge i
   * den, citere den og se hele beskeden i ét blik uden at rulle forbi en
   * bjælke. En designet alarm er en alarm, der tager længere tid at forstå.
   *
   * `text` sendes ALTID med ved siden af. Det er ikke høflighed: en mail med
   * kun HTML scorer dårligere hos spamfiltre, og en klient, der er sat til
   * ren tekst, ville ellers vise ingenting. Begge udgaver kommer ud af den
   * SAMME tekst, så de aldrig kan sige hver sit.
   */
  somHtml = false,
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
      body: JSON.stringify({
        from: fra,
        to: til,
        subject: emne,
        text: tekst,
        ...(somHtml ? { html: mailHtml(tekst, getSiteUrl()) } : {}),
        ...(svarTil ? { reply_to: svarTil } : {}),
      }),
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

/**
 * Besked til os selv om noget, der er sket — ikke en fejl.
 *
 * Adskilt fra sendAlarm, fordi de to læses forskelligt: en alarm betyder "noget
 * er i stykker", og et ordrevarsel betyder "der skal pakkes noget". Havde de
 * samme emnepræfiks, ville en travl indbakke behandle dem ens.
 */
export function sendIntern(
  emne: string,
  tekst: string,
  svarTil?: string,
): Promise<boolean> {
  return send(AFSENDER_DRIFT, [COMPANY.email], emne, tekst, svarTil);
}

/** Mail til en kunde. Afsenderen er den, de kan svare på. */
export function sendKundeMail(
  til: string,
  emne: string,
  tekst: string,
): Promise<boolean> {
  return send(AFSENDER_KUNDE, [til], emne, tekst, undefined, true);
}
