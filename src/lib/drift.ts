import { createAdminClient } from "@/lib/supabase/admin";
import { sendAlarm } from "@/lib/mail";

/**
 * Driftslog.
 *
 * Baggrundsopgaver kører uden nogen, der kigger med. Her skrives, hvornår de
 * kørte, og om det gik godt — se migration 0013 for hvorfor det også er
 * dokumentation og ikke kun drift.
 *
 * INTET HERINDE MÅ KASTE. Bliver kaldene lagt ind i en webhook eller en
 * betalingsrute, må en fejl i LOGNINGEN ikke være det, der vælter selve
 * arbejdet. Alt er pakket ind, og det værste udfald er en manglende linje.
 */

export interface DriftRaekke {
  opgave: string;
  ok: boolean;
  resultat: unknown;
  besked: string | null;
  created_at: string;
}

/** Hvor længe en gentagen fejl holder alarmen tilbage. */
const DAEMPNING_MINUTTER = 60;

/** Noter at en opgave gik godt. `resultat` er tal og status — aldrig persondata. */
export async function noterKoersel(
  opgave: string,
  resultat: unknown,
): Promise<void> {
  try {
    await createAdminClient()
      .from("drift_log")
      .insert({ opgave, ok: true, resultat: resultat as never });
  } catch (err) {
    console.error("[drift] kunne ikke notere kørsel:", (err as Error).message);
  }
}

/**
 * Må der alarmeres for `opgave` lige nu?
 *
 * DÆMPNINGEN AFGØRES AF DATABASEN — og det skal tages bogstaveligt. Det stod
 * her i forvejen som en begrundelse, men var lavet som et OPSLAG efterfulgt af
 * en indsættelse, og dét er ikke det samme: alle eksemplarer læser "ingen
 * alarm sendt endnu", før nogen af dem har skrevet sin linje. **Målt: ti
 * samtidige fejl gav ti mails** — præcis det tal, designet lovede at
 * forhindre. Sekventielt virkede den upåklageligt, og det er derfor fejlen
 * kunne stå: den almindelige dag så rigtig ud.
 *
 * `maa_alarmere()` (0039) er én sætning i basen og svarer sandt til præcis ét
 * kald inden for vinduet — samme greb som `juster_lager()`.
 *
 * FALDER TILBAGE PÅ DEN GAMLE TÆLLING, hvis funktionen ikke findes. Det er
 * ikke pænhed: migrationer køres i hånden, så koden skal kunne stå i drift,
 * FØR 0039 er kørt. Tællingen dæmper korrekt i det sekventielle tilfælde, som
 * er det almindelige — den er svagere, ikke forkert.
 */
async function maaAlarmere(
  db: ReturnType<typeof createAdminClient>,
  opgave: string,
): Promise<boolean> {
  const { data, error } = await db.rpc("maa_alarmere", {
    p_opgave: opgave,
    p_minutter: DAEMPNING_MINUTTER,
  });
  if (!error) return data === true;

  const siden = new Date(Date.now() - DAEMPNING_MINUTTER * 60_000).toISOString();
  const { count } = await db
    .from("drift_log")
    .select("id", { count: "exact", head: true })
    .eq("opgave", opgave)
    .eq("ok", false)
    .eq("alarmeret", true)
    .gte("created_at", siden);
  return (count ?? 0) === 0;
}

/**
 * Noter at en opgave fejlede — og send en alarm, hvis der ikke lige er sendt en.
 *
 * Fejlen skrives ALTID. Det er kun mailen, der holdes tilbage.
 */
export async function noterFejl(opgave: string, besked: string): Promise<void> {
  try {
    const db = createAdminClient();

    const skalAlarmere = await maaAlarmere(db, opgave);
    const sendt = skalAlarmere
      ? await sendAlarm(
          `${opgave} fejlede`,
          `${besked}\n\nTidspunkt: ${new Date().toISOString()}\n\n` +
            `Yderligere fejl i ${opgave} inden for den næste time sendes ikke, ` +
            `men skrives i driftsloggen.`,
        )
      : false;

    await db
      .from("drift_log")
      .insert({ opgave, ok: false, besked, alarmeret: sendt });
  } catch (err) {
    console.error("[drift] kunne ikke notere fejl:", (err as Error).message);
  }
}

/** Seneste linje for en opgave — uanset om den gik godt. */
export async function senesteKoersel(
  opgave: string,
): Promise<DriftRaekke | null> {
  try {
    const { data } = await createAdminClient()
      .from("drift_log")
      .select("opgave, ok, resultat, besked, created_at")
      .eq("opgave", opgave)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as DriftRaekke | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * Er der gået for lang tid?
 *
 * En opgave, der skulle køre i nat, og som sidst kørte for tre dage siden, er
 * lige så gal som en, der fejler — men den siger ikke selv fra. Det er præcis
 * dét, der gør en stoppet cron farlig: stilhed ligner succes.
 */
export function erForaeldet(
  raekke: DriftRaekke | null,
  graenseTimer: number,
): boolean {
  if (!raekke) return true;
  const alder = Date.now() - new Date(raekke.created_at).getTime();
  return alder > graenseTimer * 3_600_000;
}
