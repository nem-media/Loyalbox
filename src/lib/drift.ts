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
 * Noter at en opgave fejlede — og send en alarm, hvis der ikke lige er sendt en.
 *
 * DÆMPNINGEN LIGGER I DATABASEN og ikke i en variabel i processen. En
 * serverfunktion kan køre i mange eksemplarer samtidig, og hver af dem ville
 * have sin egen tæller: en fejl, der rammer hundrede gange på et minut, ville
 * blive til hundrede mails. Her deles hukommelsen af dem alle.
 *
 * Fejlen skrives ALTID. Det er kun mailen, der holdes tilbage.
 */
export async function noterFejl(opgave: string, besked: string): Promise<void> {
  try {
    const db = createAdminClient();
    const siden = new Date(
      Date.now() - DAEMPNING_MINUTTER * 60_000,
    ).toISOString();

    const { count } = await db
      .from("drift_log")
      .select("id", { count: "exact", head: true })
      .eq("opgave", opgave)
      .eq("ok", false)
      .eq("alarmeret", true)
      .gte("created_at", siden);

    const skalAlarmere = (count ?? 0) === 0;
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
