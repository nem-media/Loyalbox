import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * Det interne standerlager.
 *
 * KUN INTERNT. Ingen kundevendt kode læser herfra, og et køb spærres aldrig
 * af beholdningen — `koebSpaerre()` rører det ikke. Antallet MÅ gå i minus:
 * en tom hylde er en restordre, ikke en lukket butik.
 *
 * Al ændring går gennem `juster_lager`-funktionen i basen (migration 0033),
 * som lægger til/trækker fra i ét atomisk udtryk — så to samtidige køb ikke
 * overskriver hinandens træk.
 */

type Admin = ReturnType<typeof createAdminClient>;

export const LAGER_FARVER = ["sort", "hvid"] as const;
export type LagerFarve = (typeof LAGER_FARVER)[number];

export type Lager = Record<LagerFarve, number>;

export function erLagerFarve(v: unknown): v is LagerFarve {
  return v === "sort" || v === "hvid";
}

/** Begge farvers beholdning. Mangler en række, vises 0 — aldrig et brud. */
export async function hentLager(admin: Admin): Promise<Lager> {
  const { data } = await admin.from("stand_lager").select("farve, antal");
  const ud: Lager = { sort: 0, hvid: 0 };
  for (const r of data ?? []) {
    if (erLagerFarve(r.farve)) ud[r.farve] = r.antal as number;
  }
  return ud;
}

/** Lægger `delta` til (negativt trækker fra). Returnerer den nye beholdning. */
export async function justerLager(
  admin: Admin,
  farve: LagerFarve,
  delta: number,
): Promise<number> {
  const { data, error } = await admin.rpc("juster_lager", {
    p_farve: farve,
    p_delta: delta,
  });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

/** Sætter beholdningen til et bestemt tal (manuel rettelse). */
export async function saetLager(
  admin: Admin,
  farve: LagerFarve,
  antal: number,
): Promise<void> {
  const { error } = await admin
    .from("stand_lager")
    .update({ antal, updated_at: new Date().toISOString() })
    .eq("farve", farve);
  if (error) throw new Error(error.message);
}

/**
 * Trækker en ORDRES standere fra lageret.
 *
 * Farven kommer fra DESIGNET (ordren peger på det), antallet fra ordren.
 * Kastes der — fx en ordre uden design, eller en ukendt farve — er det en
 * anomali, kalderen skal notere; vi gætter ikke en farve, for så ville det
 * forkerte lager blive trukket.
 */
export async function traekLagerForOrdre(
  admin: Admin,
  ordre: { design_id: string | null; quantity: number | null },
): Promise<void> {
  const antal = ordre.quantity ?? 1;
  if (antal < 1) return;
  if (!ordre.design_id) {
    throw new Error("ordre uden design_id — kan ikke afgøre standerfarve");
  }
  const { data: design } = await admin
    .from("designs")
    .select("stander_farve")
    .eq("id", ordre.design_id)
    .maybeSingle();
  const farve = design?.stander_farve;
  if (!erLagerFarve(farve)) {
    throw new Error(`ukendt standerfarve på design ${ordre.design_id}`);
  }
  await justerLager(admin, farve, -antal);
}
