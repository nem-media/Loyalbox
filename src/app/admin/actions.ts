"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generateSlug } from "@/lib/utils";
import { TIER_ORDER, type Tier } from "@/lib/constants";
import type {
  CompanyPlan,
  DestinationType,
  OrderStatus,
} from "@/lib/types/database";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Ikke autoriseret.");
  return user;
}

export interface FormResult {
  ok?: boolean;
  error?: string;
}

export async function createCompany(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Firmanavn er påkrævet." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .insert({
      name,
      contact_email: String(formData.get("contact_email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/virksomheder");
  redirect(`/admin/virksomheder/${data.id}`);
}

export async function updateCompanyAdmin(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const id = String(formData.get("company_id") ?? "");
  if (!id) return { error: "Ugyldig virksomhed." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      contact_email: String(formData.get("contact_email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath(`/admin/virksomheder/${id}`);
  return { ok: true };
}

export async function createStandAdmin(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const companyId = String(formData.get("company_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!companyId || !name) return { error: "Udfyld navn." };

  const supabase = await createClient();
  const { error } = await supabase.from("stands").insert({
    company_id: companyId,
    name,
    slug: generateSlug(),
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/virksomheder/${companyId}`);
  return { ok: true };
}

/** Admin can change a customer's stand links / destination. */
export async function updateStandLinks(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const standId = String(formData.get("stand_id") ?? "");
  const companyId = String(formData.get("company_id") ?? "");
  if (!standId) return { error: "Ugyldig stander." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("stands")
    .update({
      destination_type: String(
        formData.get("destination_type") ?? "google",
      ) as DestinationType,
      google_review_url:
        String(formData.get("google_review_url") ?? "").trim() || null,
      trustpilot_url:
        String(formData.get("trustpilot_url") ?? "").trim() || null,
      facebook_url: String(formData.get("facebook_url") ?? "").trim() || null,
      custom_url: String(formData.get("custom_url") ?? "").trim() || null,
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", standId);

  if (error) return { error: error.message };
  revalidatePath(`/admin/virksomheder/${companyId}`);
  return { ok: true };
}

/** Admin op- eller nedgraderer en virksomheds plan. */
export async function setCompanyPlan(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("company_id") ?? "");
  const plan = String(formData.get("plan") ?? "") as CompanyPlan;
  if (!id || !TIER_ORDER.includes(plan as Tier)) return;

  const supabase = await createClient();
  await supabase.from("companies").update({ plan }).eq("id", id);
  revalidatePath(`/admin/virksomheder/${id}`);
  revalidatePath("/admin/virksomheder");
}

export async function setOrderStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("order_id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("orders").update({ status }).eq("id", id);
  revalidatePath("/admin/ordrer");
  revalidatePath("/admin");
}
