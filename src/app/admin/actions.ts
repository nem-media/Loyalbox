"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generateSlug } from "@/lib/utils";
import { KATALOG, planForProduct } from "@/lib/constants";
import { stripe } from "@/lib/stripe";
import { isStripeConfigured } from "@/lib/commerce";
import { noterAdminHandling } from "@/lib/admin-log";
import type { DestinationType, OrderStatus } from "@/lib/types/database";

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

/*
 * `setCompanyPlan` ER FJERNET MED VILJE.
 *
 * Planen sættes ikke længere i hånden: den følger varen gennem
 * `planForProduct()` i `setCompanyProduct()` nedenfor — den samme funktion,
 * webhooken bruger, så et manuelt salg giver nøjagtig samme adgang som et
 * betalt. To felter, der kunne sige hver sit om samme kunde, er ét felt for
 * lidt; se kommentaren i `setCompanyProduct`.
 */

/**
 * Admin sætter hvilket produkt virksomheden har købt.
 *
 * Det er IKKE det samme som planen: `plan` styrer review-funktionerne, mens
 * `product_slug` afgør, om stempelkortet er låst op — begge abonnementsvarer
 * er niveau `pro`, og det er produktet, der skiller dem. Sælges LoyalSum
 * Komplet manuelt, er det her, adgangen gives.
 *
 * Tom værdi rydder feltet (ingen registreret vare).
 */
export async function setCompanyProduct(formData: FormData): Promise<void> {
  const bruger = await requireAdmin();
  const id = String(formData.get("company_id") ?? "");
  const slug = String(formData.get("product_slug") ?? "");
  if (!id) return;
  // Tilkøb kan ikke sættes som virksomhedens vare: de låser intet op, og
  // et forsøg ville sænke niveauet til basic.
  if (slug && !KATALOG.some((p) => p.slug === slug)) return;

  /*
   * PLANEN SÆTTES MED. Det var den to felter, og de kunne komme i utakt:
   * Frisør Nielsine blev solgt LoyalSum Komplet manuelt og endte på
   * `premium`, fordi planvælgeren stod ved siden af og tilbød niveauet.
   * Resultatet var en betalende kunde uden feedback-indbakke, statistik og
   * dynamiske links — tre af de fire ting, produktet indeholder. Intet gik i
   * stykker, og derfor blev det ikke opdaget.
   *
   * `planForProduct()` er den samme funktion, webhooken bruger, så et
   * manuelt salg giver nu nøjagtig samme adgang som et betalt.
   */
  const supabase = await createClient();

  /*
   * DET GAMLE LÆSES FØRST. Uden det kan loggen kun sige "produkt skiftet", og
   * spørgsmålet, man stiller bagefter, er altid hvad der stod FØR — det er
   * dét, der forklarer, hvorfor kunden har den adgang, hun har.
   */
  const { data: foer } = await supabase
    .from("companies")
    .select("product_slug, plan")
    .eq("id", id)
    .maybeSingle();

  const efter = {
    product_slug: slug || null,
    plan: planForProduct(slug || null),
  };

  const { error } = await supabase.from("companies").update(efter).eq("id", id);
  if (error) return;

  await noterAdminHandling({
    actorId: bruger.id,
    actorEmail: bruger.email,
    companyId: id,
    handling: "produkt-skiftet",
    foer: foer ?? null,
    efter,
  });

  revalidatePath(`/admin/virksomheder/${id}`);
  revalidatePath("/admin/virksomheder");
  revalidatePath("/admin/abonnenter");
}

/**
 * Opsig abonnementet VED PERIODENS UDLØB — aldrig med det samme.
 *
 * Kunden har betalt for indeværende periode. En øjeblikkelig opsigelse ville
 * tage adgangen fra hende, mens pengene står på vores konto, og Stripe ville
 * skulle refundere en stump. `cancel_at_period_end` lader perioden løbe ud og
 * er DESUDEN fortrydelig — en øjeblikkelig opsigelse kan ikke gøres om, og et
 * fejlklik ville kræve et helt nyt abonnement.
 *
 * SUSPENSIONEN RØRES IKKE. En opsigelse er kundens beslutning; en suspension
 * er en manglende betaling. De to har hver sin vej tilbage, og at blande dem
 * er netop det, `abonnement.ts` er skrevet for at undgå.
 */
export async function opsigAbonnement(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  return await saetOpsigelse(formData, true);
}

/** Fortryd en opsigelse, så abonnementet fornys igen. */
export async function fortrydOpsigelse(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  return await saetOpsigelse(formData, false);
}

async function saetOpsigelse(
  formData: FormData,
  opsig: boolean,
): Promise<FormResult> {
  const bruger = await requireAdmin();
  const id = String(formData.get("company_id") ?? "");
  const abonnement = String(formData.get("subscription_id") ?? "");
  if (!id || !abonnement) return { error: "Ugyldig virksomhed." };
  if (!isStripeConfigured())
    return { error: "Stripe er ikke konfigureret i dette miljø." };

  try {
    await stripe().subscriptions.update(abonnement, {
      cancel_at_period_end: opsig,
    });
  } catch (err) {
    // Fejlen VISES. En opsigelse, der ser ud til at lykkes og ikke gjorde
    // det, er værre end en, der siger fra: pengene bliver ved med at komme.
    return { error: `Stripe afviste ændringen: ${(err as Error).message}` };
  }

  await noterAdminHandling({
    actorId: bruger.id,
    actorEmail: bruger.email,
    companyId: id,
    handling: opsig ? "abonnement-opsagt" : "opsigelse-fortrudt",
    foer: { opsagt_ved_periodeslut: !opsig },
    efter: { opsagt_ved_periodeslut: opsig },
  });

  revalidatePath(`/admin/virksomheder/${id}`);
  revalidatePath("/admin/abonnenter");
  return { ok: true };
}

/**
 * Genoptag kundeforholdet: aftalen er i kraft igen, og uret stopper.
 *
 * HVORFOR DEN HANDLING OG IKKE "UDSÆT SLETNINGEN". En sletning udsættes ikke
 * lovligt: databehandleraftalens § 13 lover, at data er væk 30 dage efter
 * AFTALENS ophør, og en knap, der skubber den dato, ville være en knap, der
 * bryder løftet. Det, der lovligt standser uret, er, at aftalen ikke er
 * ophørt længere — og det er netop det, der er sket, når en kunde betaler
 * igen, også uden om Stripe. Derfor ryddes suspensionen og ophøret, og
 * sletningsdatoen følger med af sig selv, fordi den UDLEDES af dem.
 *
 * KUNDENS EGEN SLETNINGSBESTILLING RØRES IKKE. Har hun selv bedt om at blive
 * slettet, er det hendes beslutning med sin egen angrefrist, og den skal ikke
 * kunne annulleres fra vores side ved et uheld.
 *
 * NIVEAUET GENDANNES fra varen. Webhooken sætter `plan` til basic, når et
 * abonnement lukkes; uden det her skridt ville kunden være "aktiv" og stadig
 * mangle sine funktioner.
 */
export async function genoptagKundeforhold(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const bruger = await requireAdmin();
  const id = String(formData.get("company_id") ?? "");
  if (!id) return { error: "Ugyldig virksomhed." };

  const supabase = await createClient();
  const { data: foer } = await supabase
    .from("companies")
    .select("product_slug, plan, suspenderet_siden, ophoert_den")
    .eq("id", id)
    .maybeSingle();
  if (!foer) return { error: "Virksomheden findes ikke." };

  const efter = {
    suspenderet_siden: null,
    ophoert_den: null,
    plan: planForProduct(foer.product_slug ?? null),
  };

  const { error } = await supabase.from("companies").update(efter).eq("id", id);
  if (error) return { error: error.message };

  await noterAdminHandling({
    actorId: bruger.id,
    actorEmail: bruger.email,
    companyId: id,
    handling: "kundeforhold-genoptaget",
    foer: {
      suspenderet_siden: foer.suspenderet_siden,
      ophoert_den: foer.ophoert_den,
      plan: foer.plan,
    },
    efter,
  });

  revalidatePath(`/admin/virksomheder/${id}`);
  revalidatePath("/admin/abonnenter");
  return { ok: true };
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
