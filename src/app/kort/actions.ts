"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { giveStamp } from "@/lib/loyalty/service";

export interface EnrollState {
  error?: string;
}

export interface StampByTokenState {
  ok?: boolean;
  error?: string;
  have?: number;
  required?: number;
  rewardEarned?: boolean;
  rewardName?: string | null;
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

/**
 * Scan-til-stempel: personale scanner kundens QR (`/kort/[token]`) og giver et
 * stempel direkte fra kortet. Kundens `public_token` er offentligt, så denne
 * handling kræver ALTID et gyldigt personale-login med `canStamp` for netop
 * kortets virksomhed — ellers kunne kunden stemple sig selv. `giveStamp`
 * re-validerer desuden firma-tilhørsforholdet, så tjekket her er dybde-forsvar.
 */
export async function stampByToken(
  _prev: StampByTokenState,
  formData: FormData,
): Promise<StampByTokenState> {
  const access = await getCompanyAccess();
  if (!access || !access.permissions.canStamp) {
    return { error: "Kun personale kan give stempler." };
  }

  const token = str(formData.get("token"));
  const membershipId = str(formData.get("membership_id"));
  if (!token || !membershipId) return { error: "Ugyldigt kort." };

  const admin = createAdminClient();

  // Token → medlem. Kortet skal tilhøre personalets egen virksomhed.
  const { data: member } = await admin
    .from("loyalty_members")
    .select("id, company_id")
    .eq("public_token", token)
    .maybeSingle();
  if (!member || member.company_id !== access.companyId) {
    return { error: "Kortet blev ikke fundet." };
  }

  // Medlemskabet skal høre til netop dette medlem.
  const { data: membership } = await admin
    .from("loyalty_memberships")
    .select("id, member_id")
    .eq("id", membershipId)
    .maybeSingle();
  if (!membership || membership.member_id !== member.id) {
    return { error: "Stempelkortet passer ikke til denne kunde." };
  }

  const result = await giveStamp({
    access,
    membershipId,
    stamps: 1,
    type: "stamp_manual",
    source: "staff",
  });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/kort/${token}`);
  return {
    ok: true,
    have: result.progress.have,
    required: result.progress.required,
    rewardEarned: result.rewardEarned,
    rewardName: result.rewardName,
  };
}
