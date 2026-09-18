import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

/**
 * NÅDEPERIODEN FØR EN KLADDE RYDDES — OG HVORFOR DEN HAR EN UNDERGRÆNSE.
 *
 * Designet oprettes FØR betalingen, fordi prisen afhænger af valgene. Går
 * kunden fra, bliver kladden liggende med en logofil, og `ryd_forladte_designs`
 * rydder den. Spørgsmålet er kun, hvor længe der ventes.
 *
 * DET GIK GALT ÉN GANG, OG DET KAN MÅLES. Ordre `bd2e2e24…` blev oprettet
 * 31. august kl. 16:03; natten til 2. september noterede driftsloggen
 * `forladte_designs=1, slettede_logoer=1`. Ordren står i dag som betalt, med
 * `design_id: null` og et `logo_url`, der svarer 400. Kunden havde betalt, og
 * vi slettede deres logo.
 *
 * ÅRSAGEN VAR EN RIGTIG BEGRUNDELSE OM DET FORKERTE TAL. Nådeperioden var sat
 * til et døgn, fordi en checkout-session udløber efter et døgn — altså hvor
 * længe der kan STARTES en betaling. Men faren er, hvor længe der kan gå, før
 * en betaling, der ALLEREDE er sket, er skrevet i vores base, og dét er
 * Stripes forsøgsvindue for webhooks: op til tre døgn. I det vindue betyder
 * status `new` ikke "aldrig betalt", men "betalt, ikke registreret endnu".
 *
 * Prøven er en KILDEPRØVE, fordi tallet står i en migration, der køres i
 * hånden — der er ingen funktion at kalde. Den holder fast i undergrænsen og
 * ikke i et bestemt tal: perioden må gerne blive længere (en kladde, der
 * ligger for længe, koster ingenting), men aldrig kortere end det, den skal
 * dække.
 */

const MAPPE = "supabase/migrations";

/** Stripe prøver en webhook igen i op til tre døgn. Det er gulvet. */
const STRIPE_FORSOEGSVINDUE_TIMER = 72;

/**
 * Den SIDSTE definition af funktionen vinder — præcis som i databasen, hvor
 * `create or replace` overskriver den forrige. En prøve, der læste den første,
 * ville blive ved at godkende 0021 for evigt.
 */
function senesteDefinition(): string {
  const filer = readdirSync(MAPPE)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let fundet = "";
  for (const fil of filer) {
    const sql = readFileSync(`${MAPPE}/${fil}`, "utf8");
    /*
     * DER SØGES PÅ SELVE DEFINITIONEN OG IKKE PÅ NAVNET.
     *
     * Prøven læste før "function public.ryd_forladte_designs" — og dét
     * matcher også `revoke all on function public.ryd_forladte_designs`.
     * Da 0043 gav funktionen sine rettigheder, blev revoke-linjen dermed
     * "den seneste definition", og tre prøver faldt på en fil, der ikke
     * indeholder en eneste linje af funktionens krop.
     */
    const i = sql.indexOf("create or replace function public.ryd_forladte_designs");
    if (i !== -1) fundet = sql.slice(i);
  }
  return fundet;
}

/** `'7 days'` → 168. Kun de to enheder, der bruges; alt andet skal fejle. */
function iTimer(interval: string): number {
  const m = /^(\d+)\s*(hours?|days?)$/.exec(interval.trim());
  if (!m) throw new Error(`ukendt interval: ${interval}`);
  return Number(m[1]) * (m[2].startsWith("day") ? 24 : 1);
}

describe("forladte designs ryddes ikke, før en betaling kan nå at blive registreret", () => {
  const sql = senesteDefinition();

  it("funktionen findes i en migration", () => {
    expect(sql.length).toBeGreaterThan(200);
  });

  it("venter længere end Stripes forsøgsvindue på tre døgn", () => {
    const m = /naadeperiode\s+constant\s+interval\s*:=\s*'([^']+)'/.exec(sql);
    expect(m, "nådeperioden kunne ikke findes").not.toBeNull();

    const timer = iTimer(m![1]);
    expect(
      timer,
      `nådeperioden er ${m![1]} — en betaling kan nå at blive registreret senere end det`,
    ).toBeGreaterThan(STRIPE_FORSOEGSVINDUE_TIMER);
  });

  /**
   * ANDET SPOR AF EN BETALING. Statussen kan sættes i hånden i admin, og en
   * ordre, der sættes tilbage til `new`, ville ellers blive forladt igen.
   * Betalingens id skrives af webhooken i SAMME opdatering som statussen.
   */
  it("regner en ordre med et betalings-id som betalt, uanset status", () => {
    expect(sql).toMatch(/o\.stripe_payment_intent\s+is\s+not\s+null/);
  });

  /** Ordren bevares — den er det eneste spor af, at nogen begyndte. */
  it("sletter kun designs og aldrig ordrer", () => {
    const sletninger = [...sql.matchAll(/delete\s+from\s+public\.(\w+)/gi)].map(
      (m) => m[1],
    );
    expect(sletninger).toEqual(["designs"]);
  });
});
