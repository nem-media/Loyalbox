"use server";

import { revalidatePath } from "next/cache";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { commerceIPlan } from "@/lib/loyalty/plan";
import { commerceDb } from "@/lib/commerce-api/db";
import { opretParringskode } from "@/lib/commerce-api/pairing";
import { kronerTilOere } from "@/lib/commerce-api/targets";

/**
 * Integrationer — webshoppens forbindelse og hvilke programmer og belønninger,
 * den må bruge.
 *
 * KUN EJEREN. En medarbejder kan stemple og indløse, men ikke forbinde en
 * fremmed server til butikkens kundedata eller afbryde den.
 *
 * AT SLÅ NOGET TIL KRÆVER KOMPLET (`commerceIPlan`); at slå det FRA og at
 * afbryde gør ikke. En spærring må aldrig fange nogen med en adgang, de ikke
 * kan komme af med — samme regel som medarbejderne.
 */

export interface IntegrationsSvar {
  ok?: boolean;
  error?: string;
  message?: string;
  /** Parringskoden — vises ÉN gang og gemmes aldrig i klartekst. */
  kode?: string;
  udloeber?: string;
}

const IKKE_I_PLANEN =
  "Webshopintegrationen følger med LoyalSum Komplet og LoyalSum Komplet Online. Se dit abonnement.";

async function ejer() {
  const access = await getCompanyAccess();
  if (!access || access.role !== "owner") return null;
  return access;
}

const PROVIDER = "woocommerce";

export async function opretKode(): Promise<IntegrationsSvar> {
  const access = await ejer();
  if (!access) return { error: "Kun ejeren kan forbinde en webshop." };
  const r = await opretParringskode(access.companyId, access.erSupport ? null : access.actorUserId, PROVIDER);
  if (!r.ok) return { error: r.fejl };
  revalidatePath("/dashboard/integrationer");
  return { ok: true, kode: r.kode, udloeber: r.udloeber };
}

export async function afbryd(
  _prev: IntegrationsSvar,
  formData: FormData,
): Promise<IntegrationsSvar> {
  const access = await ejer();
  if (!access) return { error: "Kun ejeren kan afbryde forbindelsen." };
  const id = String(formData.get("integration_id") ?? "");
  const { data, error } = await commerceDb().rpc("commerce_afbryd", {
    p_company: access.companyId,
    p_integration: id,
  });
  if (error || !(data as { ok?: boolean } | null)?.ok) {
    return { error: "Forbindelsen kunne ikke afbrydes. Prøv igen." };
  }
  revalidatePath("/dashboard/integrationer");
  return {
    ok: true,
    message:
      "Forbindelsen er afbrudt. Webshoppen kan ikke længere sende ordrer, og kundernes point og stempler er bevaret.",
  };
}

/** Et program slået til eller fra i webshoppen (og stempelkortets minimum). */
export async function gemProgramkanal(
  _prev: IntegrationsSvar,
  formData: FormData,
): Promise<IntegrationsSvar> {
  const access = await ejer();
  if (!access) return { error: "Kun ejeren kan ændre det." };
  const slags = formData.get("slags") === "stamps" ? "stamps" : "points";
  const programId = String(formData.get("program_id") ?? "");
  const til = formData.get("enabled") === "on";
  const minKr = String(formData.get("min_kr") ?? "").trim().replace(",", ".");

  if (til && !(await commerceIPlan(access.companyId))) return { error: IKKE_I_PLANEN };

  const db = commerceDb();
  // Programmet SKAL være virksomhedens eget — id'et kommer fra en formular.
  const tabel = slags === "points" ? "loyalty_point_programs" : "loyalty_programs";
  const { data: prog } = await db
    .from(tabel)
    .select("id")
    .eq("id", programId)
    .eq("company_id", access.companyId)
    .maybeSingle();
  if (!prog) return { error: "Programmet blev ikke fundet." };

  let minOere: number | null = null;
  if (slags === "stamps" && minKr) {
    if (!/^\d+(\.\d{1,2})?$/.test(minKr)) return { error: "Skriv minimumsbeløbet i hele kroner, fx 100." };
    minOere = kronerTilOere(minKr);
  }

  const kolonne = slags === "points" ? "point_program_id" : "stamp_program_id";
  const { data: findes } = await db
    .from("commerce_program_channels")
    .select("id")
    .eq("company_id", access.companyId)
    .eq("provider", PROVIDER)
    .eq(kolonne, programId)
    .maybeSingle();

  const felter = {
    enabled: til,
    ...(slags === "stamps" ? { min_order_minor: minOere } : {}),
    updated_at: new Date().toISOString(),
  };
  const { data: gemt, error } = findes
    ? await db.from("commerce_program_channels").update(felter).eq("id", findes.id).select("id")
    : await db
        .from("commerce_program_channels")
        .insert({ company_id: access.companyId, provider: PROVIDER, [kolonne]: programId, ...felter })
        .select("id");

  if (error?.code === "23505") {
    return { error: "Kun ét pointprogram kan bruges i webshoppen ad gangen. Slå det andet fra først." };
  }
  if (error || !gemt?.length) return { error: "Det kunne ikke gemmes. Prøv igen." };
  revalidatePath("/dashboard/integrationer");
  return { ok: true, message: til ? "Programmet bruges nu i webshoppen." : "Programmet bruges ikke længere i webshoppen." };
}

/** En pointbelønning som webshoprabat: fast beløb eller procent. */
export async function gemBeloenningskanal(
  _prev: IntegrationsSvar,
  formData: FormData,
): Promise<IntegrationsSvar> {
  const access = await ejer();
  if (!access) return { error: "Kun ejeren kan ændre det." };
  const rewardId = String(formData.get("reward_id") ?? "");
  const til = formData.get("enabled") === "on";
  const type = formData.get("discount_type") === "percentage" ? "percentage" : "fixed_amount";
  const beloeb = String(formData.get("amount_kr") ?? "").trim().replace(",", ".");
  const procent = String(formData.get("percent") ?? "").trim().replace(",", ".");

  if (til && !(await commerceIPlan(access.companyId))) return { error: IKKE_I_PLANEN };

  const db = commerceDb();
  const { data: bel } = await db
    .from("loyalty_point_rewards")
    .select("id")
    .eq("id", rewardId)
    .eq("company_id", access.companyId)
    .maybeSingle();
  if (!bel) return { error: "Belønningen blev ikke fundet." };

  let vaerdi: Record<string, unknown>;
  if (type === "fixed_amount") {
    if (!/^\d+(\.\d{1,2})?$/.test(beloeb) || kronerTilOere(beloeb) <= 0) {
      return { error: "Skriv rabatten i kroner inkl. moms, fx 50." };
    }
    vaerdi = { discount_type: type, amount_minor: kronerTilOere(beloeb), currency: "DKK", percentage_bp: null };
  } else {
    if (!/^\d+(\.\d{1,2})?$/.test(procent)) return { error: "Skriv rabatten i procent, fx 10." };
    const bp = Math.round(Number(procent) * 100);
    if (bp < 1 || bp > 10000) return { error: "Procenten skal være mellem 0,01 og 100." };
    vaerdi = { discount_type: type, percentage_bp: bp, amount_minor: null, currency: null };
  }

  const { data: findes } = await db
    .from("commerce_reward_channels")
    .select("id")
    .eq("provider", PROVIDER)
    .eq("point_reward_id", rewardId)
    .maybeSingle();
  const felter = { enabled: til, ...vaerdi, updated_at: new Date().toISOString() };
  const { data: gemt, error } = findes
    ? await db.from("commerce_reward_channels").update(felter).eq("id", findes.id).select("id")
    : await db
        .from("commerce_reward_channels")
        .insert({ company_id: access.companyId, provider: PROVIDER, point_reward_id: rewardId, ...felter })
        .select("id");
  if (error || !gemt?.length) return { error: "Det kunne ikke gemmes. Prøv igen." };
  revalidatePath("/dashboard/integrationer");
  return { ok: true, message: til ? "Belønningen kan nu bruges i webshoppen." : "Belønningen kan ikke længere bruges i webshoppen." };
}
