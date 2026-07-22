"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSlug } from "@/lib/utils";
import { tierCan, TIER_ORDER, type Tier } from "@/lib/constants";
import type { CompanyPlan, DestinationType } from "@/lib/types/database";

export interface FormResult {
  ok?: boolean;
  error?: string;
}

/** Update the current customer's company profile. */
export async function updateCompany(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await getCurrentUser();
  if (!user?.company) return { error: "Ingen virksomhed fundet." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Firmanavn er påkrævet." };

  const plan = (user.company.plan ?? "basic") as Tier;
  const canBrand = tierCan(plan, "customBranding");

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name,
      contact_email: String(formData.get("contact_email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      stand_text: String(formData.get("stand_text") ?? "").trim() || null,
      // Kun planer med customBranding må sætte/ændre logo; andre bevarer nuværende.
      ...(canBrand
        ? { logo_url: String(formData.get("logo_url") ?? "").trim() || null }
        : {}),
    })
    .eq("id", user.company.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/profil");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Kunden skifter selv plan. Guard-triggeren blokerer normale kunde-updates af
 * plan-kolonnen, så vi bruger service-role klienten (server-only) efter at have
 * bekræftet, at brugeren ejer virksomheden. Betaling via Stripe kommer senere —
 * indtil da tager ændringen effekt med det samme.
 */
export async function changePlan(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await getCurrentUser();
  if (!user?.company) return { error: "Ingen virksomhed fundet." };

  const plan = String(formData.get("plan") ?? "") as CompanyPlan;
  if (!TIER_ORDER.includes(plan as Tier)) return { error: "Ugyldig plan." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("companies")
    .update({ plan })
    .eq("id", user.company.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/abonnement");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Create a new stand for the current company. */
export async function createStand(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await getCurrentUser();
  if (!user?.company) return { error: "Ingen virksomhed fundet." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Giv standeren et navn." };

  const supabase = await createClient();
  const { error } = await supabase.from("stands").insert({
    company_id: user.company.id,
    name,
    slug: generateSlug(),
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/standere");
  return { ok: true };
}

/** Update a stand's destination links and settings. */
export async function updateStand(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await getCurrentUser();
  if (!user?.company) return { error: "Ingen virksomhed fundet." };

  const standId = String(formData.get("stand_id") ?? "");
  if (!standId) return { error: "Ugyldig stander." };

  const plan = (user.company.plan ?? "basic") as Tier;
  const canDynamicLinks = tierCan(plan, "dynamicLinks");

  // Uden dynamicLinks er destinationen låst til Google og de øvrige
  // linktyper kan ikke sættes fra klienten.
  const dynamicFields = canDynamicLinks
    ? {
        destination_type: String(
          formData.get("destination_type") ?? "google",
        ) as DestinationType,
        trustpilot_url:
          String(formData.get("trustpilot_url") ?? "").trim() || null,
        facebook_url:
          String(formData.get("facebook_url") ?? "").trim() || null,
        custom_url: String(formData.get("custom_url") ?? "").trim() || null,
        custom_label:
          String(formData.get("custom_label") ?? "").trim() || null,
      }
    : { destination_type: "google" as DestinationType };

  const supabase = await createClient();
  const { error } = await supabase
    .from("stands")
    .update({
      name: String(formData.get("name") ?? "").trim() || "Stander",
      google_review_url:
        String(formData.get("google_review_url") ?? "").trim() || null,
      is_active: formData.get("is_active") === "on",
      ...dynamicFields,
    })
    .eq("id", standId)
    .eq("company_id", user.company.id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/standere/${standId}`);
  revalidatePath("/dashboard/standere");
  return { ok: true };
}
