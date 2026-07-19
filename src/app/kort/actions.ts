"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export interface EnrollState {
  error?: string;
}

const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const bool = (v: FormDataEntryValue | null) => v === "on" || v === "true";

/**
 * Offentlig selvtilmelding fra en stander. Kunden opretter (eller genåbner) sit
 * eget stempelkort. Der gives ALDRIG stempler her — kun medlemskabet oprettes,
 * så en kunde ikke kan give sig selv stempler ved at genindlæse siden.
 */
export async function selfEnroll(
  _prev: EnrollState,
  formData: FormData,
): Promise<EnrollState> {
  const slug = str(formData.get("slug"));
  const name = str(formData.get("name"));
  const email = str(formData.get("email"));
  const phone = str(formData.get("phone"));

  if (!slug) return { error: "Ugyldig stander." };
  if (!name && !email && !phone) {
    return { error: "Udfyld mindst dit navn, din e-mail eller dit telefonnummer." };
  }
  if (!bool(formData.get("consent_terms"))) {
    return { error: "Du skal acceptere vilkårene for at oprette et stempelkort." };
  }

  const admin = createAdminClient();

  // Stander → virksomhed
  const { data: stand } = await admin
    .from("stands")
    .select("company_id, is_active")
    .eq("slug", slug)
    .maybeSingle();
  if (!stand || !stand.is_active) return { error: "Standeren blev ikke fundet." };

  // Aktivt stempelkort for virksomheden
  const { data: program } = await admin
    .from("loyalty_programs")
    .select("id")
    .eq("company_id", stand.company_id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!program) {
    return { error: "Der er endnu ikke noget aktivt stempelkort her." };
  }

  // Genbrug eksisterende medlem (åbn kort) hvis e-mail/telefon matcher.
  let memberId: string | null = null;
  let token: string | null = null;
  if (email || phone) {
    const { data: existing } = await admin
      .from("loyalty_members")
      .select("id, public_token")
      .eq("company_id", stand.company_id)
      .or([email ? `email.eq.${email}` : "", phone ? `phone.eq.${phone}` : ""]
        .filter(Boolean)
        .join(","))
      .limit(1)
      .maybeSingle();
    if (existing) {
      memberId = existing.id;
      token = existing.public_token;
    }
  }

  if (!memberId) {
    const { data: member, error } = await admin
      .from("loyalty_members")
      .insert({
        company_id: stand.company_id,
        name: name || null,
        email: email || null,
        phone: phone || null,
      })
      .select("id, public_token")
      .single();
    if (error || !member) {
      return { error: "Kunne ikke oprette kortet. Prøv igen." };
    }
    memberId = member.id;
    token = member.public_token;
  }

  // Sikr medlemskab til programmet (idempotent).
  const { data: membership } = await admin
    .from("loyalty_memberships")
    .select("id")
    .eq("program_id", program.id)
    .eq("member_id", memberId)
    .maybeSingle();
  if (!membership) {
    await admin.from("loyalty_memberships").insert({
      company_id: stand.company_id,
      program_id: program.id,
      member_id: memberId,
    });
  }

  // Samtykke
  const ip = (await headers()).get("x-forwarded-for");
  await admin.from("consent_records").insert({
    company_id: stand.company_id,
    member_id: memberId,
    type: "terms",
    granted: true,
    channel: "self_enroll",
    source: `stand:${slug}`,
    ip,
  });
  if (bool(formData.get("consent_marketing"))) {
    await admin.from("consent_records").insert({
      company_id: stand.company_id,
      member_id: memberId,
      type: "marketing",
      granted: true,
      channel: "self_enroll",
      source: `stand:${slug}`,
      ip,
    });
  }

  redirect(`/kort/${token}`);
}
