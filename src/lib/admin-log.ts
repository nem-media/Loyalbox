import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Log over det, admin ændrer i hånden.
 *
 * HVORFOR: de manuelle ændringer afgør kundens adgang og er de eneste, der
 * ikke efterlod et spor. Produktvælgeren låser stempelkortet op eller i; en
 * opsigelse stopper pengene; en genoptagelse standser en sletning. Se
 * migration 0025 for hele begrundelsen — og for den rigtige sag, hvor en
 * betalende kunde stod på det forkerte niveau i ukendt tid.
 *
 * INTET HERINDE MÅ KASTE. Samme regel som driftsloggen: en fejl i LOGNINGEN
 * må aldrig være det, der vælter selve handlingen. Det værste udfald er en
 * manglende linje — ikke en opsigelse, der halvvejs gik igennem.
 *
 * DER SKRIVES MED SERVICE-ROLE. Tabellen har kun en læse-policy, så en
 * fremtidig fejl i en policy ikke kan gøre loggen tavs uden at nogen ser det;
 * skrivningen går uden om RLS, præcis som `drift_log`.
 */

/**
 * Handlingerne. Faste strenge og ikke fri tekst: de skal kunne slås op og
 * tælles, og en håndskrevet besked pr. kaldested bliver til fem stavemåder af
 * samme hændelse.
 */
export type AdminHandling =
  | "produkt-skiftet"
  | "abonnement-opsagt"
  | "opsigelse-fortrudt"
  | "kundeforhold-genoptaget";

/** Det, hver handling hedder på skærmen. */
export const HANDLING_TEKST: Record<AdminHandling, string> = {
  "produkt-skiftet": "Skiftede produkt",
  "abonnement-opsagt": "Opsagde abonnementet ved periodens udløb",
  "opsigelse-fortrudt": "Fortrød opsigelsen",
  "kundeforhold-genoptaget": "Genoptog kundeforholdet",
};

export interface AdminLogRaekke {
  id: string;
  actor_email: string;
  handling: string;
  foer: Record<string, unknown> | null;
  efter: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Noter en ændring.
 *
 * `foer` og `efter` må KUN indeholde de felter, handlingen rørte — produkt,
 * niveau, abonnementstilstand. Aldrig kundens navn, mail eller telefon: loggen
 * skal kunne besvare "hvem gjorde hvad", ikke være endnu en kopi af kunden,
 * der skal huskes ved en sletning.
 */
export async function noterAdminHandling(opts: {
  actorId: string | null;
  actorEmail: string;
  companyId: string;
  handling: AdminHandling;
  foer?: Record<string, unknown> | null;
  efter?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await createAdminClient()
      .from("admin_log")
      .insert({
        actor_id: opts.actorId,
        actor_email: opts.actorEmail,
        company_id: opts.companyId,
        handling: opts.handling,
        foer: opts.foer ?? null,
        efter: opts.efter ?? null,
      });
  } catch (err) {
    console.error("[admin-log] kunne ikke notere handling:", (err as Error).message);
  }
}

/** De seneste ændringer for én virksomhed. Tom liste, hvis noget går galt. */
export async function hentAdminLog(
  companyId: string,
  graense = 10,
): Promise<AdminLogRaekke[]> {
  try {
    const { data } = await createAdminClient()
      .from("admin_log")
      .select("id, actor_email, handling, foer, efter, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(graense);
    return (data ?? []) as AdminLogRaekke[];
  } catch (err) {
    console.error("[admin-log] kunne ikke læse loggen:", (err as Error).message);
    return [];
  }
}

/**
 * Ændringen som én linje: "produkt: reviewstander-pro → loyalsum-komplet".
 *
 * BEGGE SIDER MED. "Skiftede produkt" alene siger ikke, hvad der blev skiftet
 * FRA, og det er netop dét, man skal bruge, når man prøver at forstå, hvorfor
 * en kunde har den adgang, hun har.
 */
export function beskrivAendring(raekke: AdminLogRaekke): string | null {
  const foer = raekke.foer ?? {};
  const efter = raekke.efter ?? {};
  const felter = new Set([...Object.keys(foer), ...Object.keys(efter)]);

  const dele = [...felter]
    .map((felt) => {
      const a = foer[felt];
      const b = efter[felt];
      if (a === b) return null;
      return `${felt}: ${vis(a)} → ${vis(b)}`;
    })
    .filter((d): d is string => d !== null);

  return dele.length ? dele.join(" · ") : null;
}

/** Tomme værdier skrives ud som "ingen" — "null" på en skærm er vores fejl, ikke en oplysning. */
function vis(v: unknown): string {
  if (v === null || v === undefined || v === "") return "ingen";
  return String(v);
}
