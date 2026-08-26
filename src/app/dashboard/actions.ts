"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSlug } from "@/lib/utils";
import { tierCan, TIER_ORDER, type Tier } from "@/lib/constants";
import { erGyldigtCvr, normaliserCvr, CVR_FEJL } from "@/lib/cvr";
import { harAbonnement } from "@/lib/abonnement";
import type { CompanyPlan, DestinationType } from "@/lib/types/database";

export interface FormResult {
  ok?: boolean;
  error?: string;
  /**
   * Kvittering ved succes. Nogle handlinger gør noget, brugeren ikke kan se
   * på skærmen — fx at der er sendt en mail — og så er "gemt" ikke nok.
   */
  message?: string;
  /**
   * Hvor brugeren skal hen bagefter.
   *
   * Bruges af `createStand`: den nye stander er ikke faerdig, naar den er
   * oprettet — den har hverken destinationslink eller et skilt endnu. Foer
   * landede kunden tilbage paa listen med et navn, der lignede noget faerdigt,
   * og kunne ikke se, at der manglede noget.
   */
  gaaTil?: string;
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

  /**
   * CVR er obligatorisk ved nye oprettelser, men feltet kan være tomt på de
   * konti, der blev oprettet før kravet. Her gælder derfor: er der skrevet
   * noget, skal det være rigtigt — men et tomt felt låser ikke nogen ude af
   * deres egen profil. Køb kræver til gengæld et gyldigt nummer, og det er
   * dér, spærren hører hjemme.
   */
  const cvrRaw = String(formData.get("cvr") ?? "").trim();
  if (cvrRaw && !erGyldigtCvr(cvrRaw)) return { error: CVR_FEJL };

  const plan = (user.company.plan ?? "basic") as Tier;
  const canBrand = tierCan(plan, "customBranding");

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name,
      cvr: cvrRaw ? normaliserCvr(cvrRaw) : null,
      contact_email: String(formData.get("contact_email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      // `stand_text` skrives IKKE længere. Feltet "Ønsket tekst på
      // standeren" var write-only: det blev gemt her og læst af ingenting.
      // Standerens udseende afgøres i designflowet (`designs`: farve, front,
      // logo), som ikke har et fritekstfelt — kolonnen er en rest fra før
      // det fandtes. Kolonnen bliver stående, fordi tre sletterutiner
      // (migration 0014, 0017 og 0018) nulstiller den ved navn.
      // Kun planer med customBranding må sætte/ændre logo; andre bevarer nuværende.
      ...(canBrand
        ? { logo_url: String(formData.get("logo_url") ?? "").trim() || null }
        : {}),
    })
    .eq("id", user.company.id);

  if (error) {
    return {
      error: /duplicate|unique/i.test(error.message)
        ? "Der findes allerede en konto med dette CVR-nummer. Skriv til os, hvis det er en fejl."
        : error.message,
    };
  }

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

  // Betaler virksomheden, ejes niveauet af Stripe-webhooken. Uden denne spærre
  // kunne en betalende kunde POSTe sig til Pro gratis — brugerfladen skjuler
  // skifteren, men det er ikke i sig selv en begrænsning.
  if (user.company.stripe_subscription_id) {
    return {
      error:
        "Dit niveau følger dit abonnement. Ret det i Betaling og kvitteringer.",
    };
  }

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

  /*
   * EN QR-ADRESSE FØLGER MED ET ABONNEMENT.
   *
   * Uden denne kunne en gratis konto oprette ubegrænset mange standere og
   * bruge anmeldelsesflowet i det uendelige uden at betale. Det var ikke et
   * hul i en betalingsmur, men i selve forretningsmodellen: design og
   * bestilling er en del af KØBET, og adressen er det, man får bagefter.
   *
   * Kontrollen ligger i handlingen og ikke kun i knappen: en skjult knap er
   * ikke adgangskontrol, når handlingen kan kaldes direkte.
   */
  if (!harAbonnement(user.company)) {
    return {
      error:
        "En QR-adresse følger med Reviewstander Pro eller LoyalSum Komplet. Se dit abonnement for at komme i gang.",
    };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Giv standeren et navn." };

  const supabase = await createClient();
  // `select().single()` fordi vi skal bruge id'et til at sende kunden VIDERE
  // til den nye stander. En insert uden select giver ingen raekke tilbage.
  const { data, error } = await supabase
    .from("stands")
    .insert({
      company_id: user.company.id,
      name,
      slug: generateSlug(),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/standere");
  return { ok: true, gaaTil: `/dashboard/standere/${data.id}` };
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
        facebook_url: String(formData.get("facebook_url") ?? "").trim() || null,
        custom_url: String(formData.get("custom_url") ?? "").trim() || null,
        custom_label: String(formData.get("custom_label") ?? "").trim() || null,
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
