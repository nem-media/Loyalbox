"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generateSlug } from "@/lib/utils";
import { KATALOG, planForProduct, ORDER_STATUSSER } from "@/lib/constants";
import { stripe } from "@/lib/stripe";
import { erGyldigtPostnummer, POSTNUMMER_FEJL } from "@/lib/adresse";
import { isStripeConfigured } from "@/lib/commerce";
import { noterAdminHandling } from "@/lib/admin-log";
import { tilfoejAdresseAdmin } from "@/lib/ekstra-adresse";
import { adresserTilladt } from "@/lib/abonnement";
import { createAdminClient } from "@/lib/supabase/admin";
import { justerLager, saetLager, erLagerFarve } from "@/lib/lager";
import { SUPPORT_COOKIE } from "@/lib/support-adgang";
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

/* ------------------------------------------------------- supportadgang --- */

/**
 * Åbn en kundes dashboard som ADMIN.
 *
 * Der skiftes ikke identitet: cookien siger kun HVILKEN virksomhed der ses på,
 * og `requireAdmin()` afgør hver gang, om man må. En cookie sat i hånden af en
 * almindelig bruger giver derfor ingenting. Se `src/lib/support-adgang.ts`.
 *
 * ADGANGEN NOTERES, og det er ikke en formalitet: det er svaret på det
 * spørgsmål, en kunde stiller — "har I været inde i min konto?". Uden linjen
 * ville supporttilstanden være den eneste vej ind, der ikke efterlod et spor,
 * og det var netop dét, `admin_log` blev bygget for at rette.
 */
export async function aabnSupportAdgang(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const companyId = String(formData.get("companyId") ?? "");
  if (!companyId) return;

  const c = await cookies();
  c.set(SUPPORT_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  await noterAdminHandling({
    actorId: admin.id,
    actorEmail: admin.email,
    companyId,
    handling: "support-adgang-aabnet",
  });

  redirect("/dashboard");
}

/** Forlad supporttilstanden og vend tilbage til admin. */
export async function lukSupportAdgang(): Promise<void> {
  const admin = await requireAdmin();
  const c = await cookies();
  const companyId = c.get(SUPPORT_COOKIE)?.value ?? "";
  c.delete(SUPPORT_COOKIE);

  if (companyId) {
    await noterAdminHandling({
      actorId: admin.id,
      actorEmail: admin.email,
      companyId,
      handling: "support-adgang-lukket",
    });
  }

  redirect(companyId ? `/admin/virksomheder/${companyId}` : "/admin");
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
  const bruger = await requireAdmin();
  const id = String(formData.get("company_id") ?? "");
  if (!id) return { error: "Ugyldig virksomhed." };

  // Samme regel som i kundens egen profil: tomt er tilladt, forkert er ikke.
  const postnummerRaw = String(formData.get("postnummer") ?? "").trim();
  if (postnummerRaw && !erGyldigtPostnummer(postnummerRaw)) {
    return { error: POSTNUMMER_FEJL };
  }

  const supabase = await createClient();

  const felter = {
    name: String(formData.get("name") ?? "").trim(),
    contact_email: String(formData.get("contact_email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    postnummer: postnummerRaw || null,
    by: String(formData.get("by") ?? "").trim() || null,
    kontaktperson: String(formData.get("kontaktperson") ?? "").trim() || null,
  };

  // Hentes FØR, men kun for at se HVILKE felter der faktisk ændrer sig —
  // værdierne bliver aldrig skrevet nogen steder, se begrundelsen nedenfor.
  const { data: foer } = await supabase
    .from("companies")
    .select("name, contact_email, phone, address, postnummer, by, kontaktperson")
    .eq("id", id)
    .maybeSingle();

  const { data: ramt, error } = await supabase
    .from("companies")
    .update(felter)
    .eq("id", id)
    .select("id");

  if (error) return { error: error.message };
  if (!ramt?.length) return { error: "Virksomheden blev ikke opdateret." };

  /*
   * KUNDENS EGNE STAMDATA ÆNDRET I HÅND — OG DET BLEV IKKE NOTERET.
   *
   * Navn, kontaktmail, telefon og leveringsadresse er dét, en pakke sendes
   * efter, og dét en faktura bærer. Ændres de her, kunne ingen bagefter se
   * hvem der gjorde det eller hvad der stod før. Kun de felter, der FAKTISK
   * blev ændret, skrives — en log fuld af uændrede felter er ulæselig.
   */
  const aendret = Object.keys(felter).filter(
    (k) =>
      (foer as Record<string, unknown> | null)?.[k] !==
      (felter as Record<string, unknown>)[k],
  );
  if (aendret.length > 0) {
    /*
     * KUN FELTNAVNENE — ALDRIG VÆRDIERNE.
     *
     * Det er fristende at skrive "før: peter@…, efter: pia@…", for det er
     * netop dét, man vil vide. Men `admin-log.ts` har en regel, og den er
     * ældre og bedre end mit ønske: loggen må ikke blive endnu en kopi af
     * kunden. Navn, mail, telefon og adresse er personoplysninger, og en
     * revisionslog, der bærer dem, er et sted mere, der skal huskes ved en
     * sletning og ved et dataudtræk.
     *
     * "Hvem rørte hvad hvornår" kan besvares uden værdierne. Det er også
     * dét, en log er til for — ikke at kunne rulle tilbage.
     */
    await noterAdminHandling({
      actorId: bruger.id,
      actorEmail: bruger.email,
      companyId: id,
      handling: "virksomhed-rettet",
      efter: { aendrede_felter: aendret },
    });
  }

  revalidatePath(`/admin/virksomheder/${id}`);
  return { ok: true };
}

export async function createStandAdmin(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const admin = await requireAdmin();
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

  /*
   * DEN HER KNAP GIVER EN ADRESSE VÆK, og indtil nu efterlod den ikke et
   * spor. Abonnementet røres ikke — kunden får en side mere uden at betale
   * for den — og resultatet er, at virksomheden står med flere adresser end
   * linjer. Det er en legitim ting at gøre (en konto sat op i hånden, en
   * fejl vi retter), men det er også præcis dét, der gør, at kunden bagefter
   * møder "skriv til os" i stedet for en købsknap.
   *
   * Uden linjen i loggen kan spørgsmålet "hvorfor har den her kunde tre
   * adresser og betaler for én?" ikke besvares af nogen. Se admin-log.ts.
   */
  await noterAdminHandling({
    actorId: admin.id,
    actorEmail: admin.email,
    companyId,
    handling: "adresse-givet",
    efter: { adresse: name },
  });

  revalidatePath(`/admin/virksomheder/${companyId}`);
  return { ok: true };
}

/**
 * SÆLG EN BUTIK MERE TIL EN KUNDE, DER HAR KONTAKTET OS.
 *
 * HVORFOR DEN SKAL FINDES: `adresseSpaerre()` sender en kæde over
 * selvbetjeningsloftet — og enhver, der har flere adresser end de har betalt
 * for — hen til "skriv til os". Uden en knap i den anden ende var dét løfte
 * tomt: admin skulle hæve antallet i Stripes dashboard OG rette kolonnen i
 * Supabase i hånden, og glemmes den ene, driver de to tal fra hinanden. Hele
 * mekanikken hviler på, at de er ens.
 *
 * ÉN KNAP RØRER BEGGE. Stripe hæves først, og kolonnen skrives af STRIPES
 * EGET SVAR — ikke af vores egen optælling. Går Stripe galt, er der ikke
 * skrevet noget, og kunden har hverken fået en regning eller en adresse.
 *
 * ADRESSEN OPRETTES MED, fordi det er dét, kunden ringede om. Fejler den
 * oprettelse, er linjen stadig hævet — og så viser kundens eget dashboard
 * den almindelige "Opret QR-adresse", præcis som i selvbetjeningen.
 */
export async function saelgAdresseAdmin(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const admin = await requireAdmin();
  const companyId = String(formData.get("company_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!companyId || !name) return { error: "Giv butikken et navn." };

  const service = createAdminClient();
  const { data: company } = await service
    .from("companies")
    .select(
      "id, product_slug, stripe_status, stripe_subscription_id, stripe_customer_id, adresser_tilladt",
    )
    .eq("id", companyId)
    .maybeSingle();

  if (!company) return { error: "Virksomheden blev ikke fundet." };

  const foer = adresserTilladt(company);
  const svar = await tilfoejAdresseAdmin(company);

  if (!svar.ok) {
    return {
      error:
        svar.fejl === "ikke-betalende"
          ? "Abonnementet betaler ikke lige nu. Få betalingen på plads først — ellers lægges prorataen oven i en ubetalt regning."
          : svar.fejl === "intet-hos-stripe" || svar.fejl === "intet-abonnement"
            ? "Virksomheden har ikke et abonnement hos Stripe at lægge linjen på. Sælg et abonnement først, eller opret adressen gratis med knappen ovenfor."
            : svar.fejl === "linjen-mangler"
              ? "Abonnementet hos Stripe har ikke en månedslinje for kundens vare. Se det efter i Stripe."
              : `Stripe afviste: ${svar.besked ?? "ukendt fejl"}`,
    };
  }

  // STRIPES SVAR OG IKKE `foer + 1`. Kolonnen skal blive ved at svare til
  // abonnementet, og det gør den kun, hvis den skrives af det, Stripe
  // faktisk står med bagefter.
  await service
    .from("companies")
    .update({ adresser_tilladt: svar.adresserTilladt })
    .eq("id", companyId);

  const { error: standFejl } = await service.from("stands").insert({
    company_id: companyId,
    name,
    slug: generateSlug(),
  });

  await noterAdminHandling({
    actorId: admin.id,
    actorEmail: admin.email,
    companyId,
    handling: "adresse-solgt",
    foer: { adresser_tilladt: foer },
    efter: { adresser_tilladt: svar.adresserTilladt, adresse: name },
  });

  revalidatePath(`/admin/virksomheder/${companyId}`);

  if (standFejl) {
    return {
      error: `Abonnementet er hævet til ${svar.adresserTilladt} adresser, men selve adressen kunne ikke oprettes: ${standFejl.message}. Kunden kan oprette den selv i sit dashboard.`,
    };
  }

  return { ok: true };
}

/** Admin can change a customer's stand links / destination. */
export async function updateStandLinks(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const bruger = await requireAdmin();
  const standId = String(formData.get("stand_id") ?? "");
  const companyId = String(formData.get("company_id") ?? "");
  if (!standId) return { error: "Ugyldig stander." };

  const supabase = await createClient();

  const felter = {
    destination_type: String(
      formData.get("destination_type") ?? "google",
    ) as DestinationType,
    google_review_url:
      String(formData.get("google_review_url") ?? "").trim() || null,
    trustpilot_url: String(formData.get("trustpilot_url") ?? "").trim() || null,
    facebook_url: String(formData.get("facebook_url") ?? "").trim() || null,
    custom_url: String(formData.get("custom_url") ?? "").trim() || null,
    is_active: formData.get("is_active") === "on",
  };

  const { data: foer } = await supabase
    .from("stands")
    .select(
      "name, destination_type, google_review_url, trustpilot_url, facebook_url, custom_url, is_active",
    )
    .eq("id", standId)
    .maybeSingle();

  const { data: ramt, error } = await supabase
    .from("stands")
    .update(felter)
    .eq("id", standId)
    .select("id");

  if (error) return { error: error.message };
  if (!ramt?.length) return { error: "Standeren blev ikke opdateret." };

  /*
   * HER ÆNDRES NOGET, DER STÅR UDE I EN BUTIK.
   *
   * QR-koden er trykt og kan ikke kaldes tilbage; det eneste, der kan
   * ændres, er hvor den peger hen — og det er præcis dét, denne knap gør.
   * Sættes `is_active` fra, holder kundens skilt op med at virke. Ingen af
   * delene efterlod et spor.
   *
   * VÆRDIERNE MÅ GERNE MED HER, i modsætning til virksomhedens stamdata: en
   * anmeldelsesadresse er en offentlig forretningsoplysning og ikke en
   * personoplysning. Og det er netop det gamle link, man har brug for, hvis
   * en ændring skal gøres om.
   */
  const aendret = Object.keys(felter).filter(
    (k) =>
      (foer as Record<string, unknown> | null)?.[k] !==
      (felter as Record<string, unknown>)[k],
  );
  if (aendret.length > 0) {
    const udsnit = (kilde: Record<string, unknown> | null) =>
      Object.fromEntries(aendret.map((k) => [k, kilde?.[k] ?? null]));
    await noterAdminHandling({
      actorId: bruger.id,
      actorEmail: bruger.email,
      companyId,
      handling: "qr-maal-rettet",
      foer: { stander: foer?.name ?? null, ...udsnit(foer as Record<string, unknown> | null) },
      efter: udsnit(felter as unknown as Record<string, unknown>),
    });
  }

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
  if (!id) return { error: "Ugyldig virksomhed." };
  if (!isStripeConfigured())
    return { error: "Stripe er ikke konfigureret i dette miljø." };

  /*
   * ABONNEMENTET SLÅS OP PÅ VIRKSOMHEDEN — DET KOMMER IKKE FRA FORMULAREN.
   *
   * Id'et blev før taget direkte fra et skjult felt og sendt til Stripe uden
   * at nogen havde set efter, at det hørte til netop denne kunde. Admin er
   * betroet, så det er ikke et angreb, der bekymrer — det er en FORÆLDET
   * SIDE: står fanen åben, mens kundens abonnement skiftes (et køb, en
   * genoptagelse, en opgradering), opsiger knappen et abonnement, der ikke
   * findes længere, eller et andet end det, siden viser. Og linjen i
   * `admin_log` ville stå på den rigtige virksomhed med den forkerte
   * handling.
   *
   * Samme regel som alle andre steder i systemet: slå op frem for at stole
   * på det, der kommer ind.
   */
  const supabase = await createClient();
  const { data: firma } = await supabase
    .from("companies")
    .select("stripe_subscription_id")
    .eq("id", id)
    .maybeSingle();

  const abonnement = firma?.stripe_subscription_id;
  if (!abonnement) {
    return { error: "Virksomheden har ikke et abonnement hos Stripe." };
  }

  /*
   * HVAD STOD DER FØR? SPØRG, I STEDET FOR AT ANTAGE DET MODSATTE.
   *
   * Loggen skrev `foer: { opsagt_ved_periodeslut: !opsig }`, altså en
   * udledning af, hvad der BLEV trykket — ikke hvad der faktisk stod. Trykkes
   * "opsig" på et abonnement, der allerede var opsagt, påstod loggen et
   * skifte fra false til true, som aldrig fandt sted. En revisionslog, der
   * gætter sin egen "før"-værdi, er ikke en revisionslog.
   */
  let foer: boolean | null = null;
  try {
    const nu = await stripe().subscriptions.retrieve(abonnement);
    foer = nu.cancel_at_period_end;
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
    foer: { opsagt_ved_periodeslut: foer },
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

/**
 * Skift en ordres status i hånden.
 *
 * DEN FEJLEDE I TAVSHED. Statussen blev taget fra formularen og kastet til
 * `OrderStatus` uden at blive prøvet, opdateringens svar blev ikke set på, og
 * funktionen gav intet tilbage. En værdi uden for enum'en afviser databasen
 * med 400 — målt — men admin så kun siden genindlæse, mens dropdown'en blev
 * stående på det, der IKKE blev gemt: komponenten sætter værdien lokalt med
 * det samme, og et `router.refresh()` nulstiller ikke en `useState`. Samme
 * klasse som logo-previewet, der viste en fil, formularen ikke havde.
 *
 * OG DEN BLEV IKKE NOTERET. `admin_log` skal bære hver manuel ændring, og
 * netop denne afgør, om noget bliver trykt og sendt — det er den, man vil
 * kunne slå op, når en kunde spørger, hvorfor deres skilt aldrig kom.
 */
export async function setOrderStatus(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const bruger = await requireAdmin();
  const id = String(formData.get("order_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id) return { error: "Ugyldig ordre." };

  // Prøvet mod den liste, brugerfladen selv viser. `as OrderStatus` var en
  // påstand om noget, der kom udefra.
  if (!(ORDER_STATUSSER as readonly string[]).includes(status)) {
    return { error: "Ukendt ordrestatus." };
  }

  const supabase = await createClient();

  // Hentes FØR, så loggen kan sige hvad der stod — og så et forkert id kan
  // skelnes fra en fejlet skrivning.
  const { data: foer } = await supabase
    .from("orders")
    .select("status, company_id")
    .eq("id", id)
    .maybeSingle();
  if (!foer) return { error: "Ordren findes ikke." };

  const { data: ramt, error } = await supabase
    .from("orders")
    .update({ status: status as OrderStatus })
    .eq("id", id)
    .select("id");

  if (error) return { error: error.message };
  // En `update` mod PostgREST svarer glad, når den rammer nul rækker.
  if (!ramt?.length) return { error: "Ordren blev ikke opdateret." };

  await noterAdminHandling({
    actorId: bruger.id,
    actorEmail: bruger.email,
    companyId: foer.company_id,
    handling: "ordrestatus-skiftet",
    foer: { status: foer.status },
    efter: { status },
  });

  revalidatePath("/admin/ordrer");
  revalidatePath("/admin");
  return { ok: true };
}

/* --------------------------------------------------------------- lager --- */

/**
 * Manuel justering af standerlageret (kun admin).
 *
 * Både "tilføj" og "fjern" går herigennem med `delta` (positiv/negativ).
 * Service-role EFTER requireAdmin, som resten af lager-adgangen. Beholdningen
 * må gå i minus — det er en restordre, ikke en fejl.
 */
export async function justerStanderLager(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const farve = String(formData.get("farve") ?? "");
  const delta = parseInt(String(formData.get("delta") ?? ""), 10);
  if (!erLagerFarve(farve)) return { error: "Ukendt farve." };
  if (!Number.isFinite(delta) || delta === 0) return { error: "Angiv et antal." };

  try {
    await justerLager(createAdminClient(), farve, delta);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/lager");
  return { ok: true };
}

/** Sætter en farves beholdning til et bestemt tal (manuel rettelse). */
export async function saetStanderLager(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  await requireAdmin();
  const farve = String(formData.get("farve") ?? "");
  const antal = parseInt(String(formData.get("antal") ?? ""), 10);
  if (!erLagerFarve(farve)) return { error: "Ukendt farve." };
  if (!Number.isFinite(antal)) return { error: "Angiv et tal." };

  try {
    await saetLager(createAdminClient(), farve, antal);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/lager");
  return { ok: true };
}
