"use server";

import { revalidatePath } from "next/cache";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { stempelkortIPlan } from "@/lib/loyalty/plan";
import type { ProgramStatus } from "@/lib/loyalty/constants";

/**
 * Medarbejderens egne stempelkort-handlinger.
 *
 * HVORFOR EN EGEN FIL og ikke dashboardets `createProgram`: den skriver med
 * brugerens EGEN klient (RLS), og RLS på `loyalty_programs` er ejer-only
 * (`company_id in (select id from companies where user_id = auth.uid())`). En
 * medarbejder har ingen virksomhedsrække, så et RLS-write ville blive afvist —
 * uden en tydelig fejl. Derfor valideres adgangen mod `getCompanyAccess()` og
 * skrives med SERVICE-ROLE bagefter, præcis som stempling og medarbejder-
 * administration. Samme regel som resten af loyalitetsmodulet.
 *
 * `canManage` er den ene rettighed, det hele hænger på — den dækker at
 * oprette OG at tænde/slukke, fordi de følger ad (se PERMISSION_FIELDS).
 */

export interface StempelkortResultat {
  ok?: boolean;
  error?: string;
}

const tekst = (v: FormDataEntryValue | null) => String(v ?? "").trim();
function heltal(v: FormDataEntryValue | null, fald: number): number {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fald;
}

/** De lovlige statusser en medarbejder må sætte — aldrig `archived`. */
const MEDARBEJDER_STATUS: ProgramStatus[] = ["active", "paused", "draft"];

export async function opretStempelkort(
  _prev: StempelkortResultat,
  formData: FormData,
): Promise<StempelkortResultat> {
  const access = await getCompanyAccess();
  if (!access || !access.permissions.canManage) {
    return { error: "Du har ikke adgang til at oprette stempelkort." };
  }
  if (!(await stempelkortIPlan(access.companyId))) {
    return { error: "Stempelkort er ikke med i abonnementet lige nu." };
  }

  const navn = tekst(formData.get("name"));
  if (!navn) return { error: "Giv stempelkortet et navn." };

  const kraevet = heltal(formData.get("required_stamps"), 10);
  if (kraevet < 1) {
    return { error: "Antal stempler til belønning skal være mindst 1." };
  }

  // Kun de tre statusser en medarbejder må vælge. Alt andet bliver til kladde,
  // så et forkert felt aldrig kan udgive et kort, ingen mente at udgive.
  const oensket = tekst(formData.get("status")) as ProgramStatus;
  const status: ProgramStatus = MEDARBEJDER_STATUS.includes(oensket)
    ? oensket
    : "draft";

  const admin = createAdminClient();
  const { data: program, error } = await admin
    .from("loyalty_programs")
    .insert({
      company_id: access.companyId,
      name: navn,
      internal_name: tekst(formData.get("internal_name")) || null,
      description: tekst(formData.get("description")) || null,
      status,
      earn_model: "per_purchase",
      stamps_per_earn: 1,
      reset_on_redeem: true,
      keep_overflow: false,
      color: "#1b916a",
      icon: "star",
      max_stamps_per_txn: 1,
      min_minutes_between: 0,
      require_staff_confirm: true,
      stamps_expire: false,
    })
    .select("id")
    .single();

  if (error || !program) {
    return { error: error?.message ?? "Kunne ikke oprette stempelkortet." };
  }

  // En primær belønning, så kortet kan bruges med det samme. Navnet er
  // valgfrit — står det tomt, får kunden en neutral "Belønning".
  const beloenning = tekst(formData.get("reward_name")) || "Belønning";
  const { error: belErr } = await admin.from("loyalty_rewards").insert({
    company_id: access.companyId,
    program_id: program.id,
    name: beloenning,
    type: "custom",
    required_stamps: kraevet,
    is_primary: true,
    status: "active",
  });
  if (belErr) return { error: belErr.message };

  revalidatePath("/personale/stempelkort");
  return { ok: true };
}

export async function saetStempelkortStatus(
  _prev: StempelkortResultat,
  formData: FormData,
): Promise<StempelkortResultat> {
  const access = await getCompanyAccess();
  if (!access || !access.permissions.canManage) {
    return { error: "Du har ikke adgang til at ændre stempelkort." };
  }
  if (!(await stempelkortIPlan(access.companyId))) {
    return { error: "Stempelkort er ikke med i abonnementet lige nu." };
  }

  const id = tekst(formData.get("program_id"));
  const oensket = tekst(formData.get("status")) as ProgramStatus;
  if (!id) return { error: "Ukendt stempelkort." };
  if (!MEDARBEJDER_STATUS.includes(oensket)) {
    return { error: "Ugyldig status." };
  }

  // Org-isolering: kortet SKAL høre til medarbejderens egen virksomhed. Uden
  // `.eq("company_id", …)` kunne et gættet id ramme en anden butiks kort.
  const { data: raekker, error } = await createAdminClient()
    .from("loyalty_programs")
    .update({ status: oensket, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", access.companyId)
    .select("id");

  if (error) return { error: error.message };
  if (!raekker?.length) return { error: "Stempelkortet blev ikke fundet." };

  revalidatePath("/personale/stempelkort");
  return { ok: true };
}
