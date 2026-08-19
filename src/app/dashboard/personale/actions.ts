"use server";

import { revalidatePath } from "next/cache";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site";
import { normalizeEmail, isEmail, readPermissions } from "@/lib/employees";
import type { FormResult } from "../actions";

/**
 * Personale — oprettelse og styring af medarbejdere.
 *
 * KUN EJEREN må røre ved dette. En medarbejder har rettigheder til at stemple
 * og indløse, men ikke til at give andre adgang til virksomheden; ellers kunne
 * enhver medarbejder invitere sig selv en kollega ind.
 *
 * Skrivninger sker med service-role EFTER validering mod getCompanyAccess(),
 * jf. konventionen for loyalitetsmodulet. Læsninger af employees ligger bag
 * RLS pr. virksomhed, og ejeren har allerede adgang der.
 */

async function requireOwner() {
  const access = await getCompanyAccess();
  if (!access || access.role !== "owner") return null;
  return access;
}

/**
 * Finder en eksisterende bruger på e-mailen.
 *
 * Slår op i public.users og ikke gennem auth-API'et, fordi rækken oprettes af
 * en trigger ved signup og derfor altid findes for en rigtig bruger — og fordi
 * et opslag på e-mail her er billigere end at bladre gennem alle auth-brugere.
 */
async function findUserByEmail(email: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  return data?.id ?? null;
}

export async function addEmployee(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await requireOwner();
  if (!access) return { error: "Kun ejeren kan tilføje medarbejdere." };

  const name = String(formData.get("name") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));

  if (!name) return { error: "Skriv medarbejderens navn." };
  if (!isEmail(email)) return { error: "Skriv en rigtig e-mailadresse." };

  const admin = createAdminClient();

  // Ejeren skal ikke oprettes som sin egen medarbejder — de har allerede
  // fulde rettigheder, og rækken ville bare forvirre listen.
  const { data: company } = await admin
    .from("companies")
    .select("contact_email, user_id")
    .eq("id", access.companyId)
    .maybeSingle();
  if (company?.user_id === access.actorUserId) {
    const { data: owner } = await admin
      .from("users")
      .select("email")
      .eq("id", access.actorUserId)
      .maybeSingle();
    if (owner?.email && normalizeEmail(owner.email) === email) {
      return {
        error:
          "Det er din egen adresse. Som ejer har du allerede alle rettigheder.",
      };
    }
  }

  let userId = await findUserByEmail(email);
  let invited = false;

  if (!userId) {
    // Ingen konto endnu: invitér. Invitationen oprettes af Supabase, som
    // sender en mail med et engangslink — dermed er tilknytningen bundet til
    // bruger-id'et fra starten, og vi behøver aldrig matche på e-mail senere.
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${getSiteUrl()}/auth/confirm`,
      data: { role: "customer" },
    });
    if (error || !data.user) {
      return {
        error:
          "Invitationen kunne ikke sendes. Tjek adressen, og prøv igen — eller skriv til os.",
      };
    }
    userId = data.user.id;
    invited = true;
  }

  const { data: eksisterende } = await admin
    .from("employees")
    .select("id, is_active")
    .eq("company_id", access.companyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (eksisterende) {
    return {
      error: eksisterende.is_active
        ? "Den medarbejder er allerede tilføjet."
        : "Medarbejderen findes allerede, men er sat inaktiv. Sæt dem aktive i stedet.",
    };
  }

  const { error } = await admin.from("employees").insert({
    company_id: access.companyId,
    user_id: userId,
    name,
    email,
    is_active: true,
    ...readPermissions(formData),
    // Medarbejdere må ikke administrere andre medarbejdere.
    can_manage: false,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/personale");
  return {
    ok: true,
    message: invited
      ? `${name} er inviteret. De får en mail med et link til at vælge adgangskode.`
      : `${name} havde allerede en konto og kan logge ind med den med det samme.`,
  };
}

/** Ændrer rettigheder for én medarbejder. */
export async function updateEmployee(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await requireOwner();
  if (!access) return { error: "Kun ejeren kan ændre medarbejdere." };

  const id = String(formData.get("id") ?? "");
  const admin = createAdminClient();

  // Org-isolering: rækken skal tilhøre ejerens egen virksomhed.
  const { error } = await admin
    .from("employees")
    .update(readPermissions(formData))
    .eq("id", id)
    .eq("company_id", access.companyId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/personale");
  return { ok: true, message: "Rettighederne er gemt." };
}

/** Slår adgangen til og fra uden at slette medarbejderen. */
export async function setEmployeeActive(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await requireOwner();
  if (!access) return { error: "Kun ejeren kan ændre medarbejdere." };

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";

  const { error } = await createAdminClient()
    .from("employees")
    .update({ is_active: active })
    .eq("id", id)
    .eq("company_id", access.companyId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/personale");
  return {
    ok: true,
    message: active
      ? "Medarbejderen har adgang igen."
      : "Adgangen er lukket. Medarbejderen kan ikke længere stemple.",
  };
}

/**
 * Fjerner medarbejderen helt.
 *
 * Selve brugerkontoen slettes IKKE — den kan være knyttet til stempelkort
 * eller til en anden butik. Kun tilknytningen til denne virksomhed fjernes.
 */
export async function removeEmployee(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await requireOwner();
  if (!access) return { error: "Kun ejeren kan fjerne medarbejdere." };

  const id = String(formData.get("id") ?? "");

  const { error } = await createAdminClient()
    .from("employees")
    .delete()
    .eq("id", id)
    .eq("company_id", access.companyId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/personale");
  return { ok: true, message: "Medarbejderen er fjernet." };
}

/**
 * Sender et nyt login-link.
 *
 * Bruger den almindelige glemt-adgangskode-mail, fordi den også virker for en
 * inviteret bruger, der aldrig nåede at vælge en kode — og fordi det er det
 * flow, vi allerede har afprøvet hele vejen igennem.
 */
export async function resendEmployeeInvite(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await requireOwner();
  if (!access) return { error: "Kun ejeren kan sende login-links." };

  const id = String(formData.get("id") ?? "");

  const { data: employee } = await createAdminClient()
    .from("employees")
    .select("email")
    .eq("id", id)
    .eq("company_id", access.companyId)
    .maybeSingle();

  if (!employee?.email) {
    return { error: "Medarbejderen har ingen e-mail at sende til." };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(employee.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/nulstil-adgangskode`,
  });

  return {
    ok: true,
    message: `Der er sendt et nyt link til ${employee.email}.`,
  };
}
