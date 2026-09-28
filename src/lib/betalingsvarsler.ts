import "server-only";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendKundeMail } from "@/lib/mail";
import { noterFejl } from "@/lib/drift";
import { isTestBuyer, produktForPriser } from "@/lib/commerce";
import { getProduct, planForProduct } from "@/lib/constants";
import {
  betalingLukker,
  betalingssagIDag,
  erBetalende,
  erBetalingssag,
} from "@/lib/abonnement";
import { betalingsvarselMail } from "@/lib/abonnementsmail";

/**
 * BETALINGSSAGEN — TRE VARSLER, SÅ LUKKER ADGANGEN.
 *
 * Reglerne og datoerne står i `abonnement.ts` (`BETALINGSVARSEL_DAGE`,
 * `BETALING_LUKKER_EFTER_DAGE`). Her er det, der rører Stripe, basen og
 * mailen.
 *
 * DER SENDES KUN, HVIS DER IKKE ER BETALT (ejerens krav 28. sep. 2026).
 * Fakturaen slås op FRISKT hos Stripe lige før hver mail, og mailen går kun,
 * når den stadig står åben med et fejlet forsøg og et beløb tilbage. Er der
 * betalt i mellemtiden — også hvis webhooken om det er gået tabt — nulstilles
 * sagen, og kunden hører intet. Et varsel om en betaling, man lige har
 * gennemført, er den mail, der får folk til at ringe.
 *
 * ÉT VARSEL AD GANGEN, AFGJORT I BASEN. Tælleren løftes med en BETINGET
 * opdatering fra n-1 til n, og kun den, der får rækken tilbage, sender. To
 * samtidige kørsler (webhook og nat, eller to leverancer) kan derfor ikke
 * sende samme varsel. Fejler mailen, sættes tælleren tilbage, så næste nat
 * prøver igen.
 */

type Firma = {
  id: string;
  name: string | null;
  contact_email: string | null;
  product_slug: string | null;
  stripe_subscription_id: string | null;
  stripe_status: string | null;
  betaling_fejlet_siden: string | null;
  betalingsvarsler_sendt: number;
  suspenderet_siden: string | null;
};

const FELTER =
  "id, name, contact_email, product_slug, stripe_subscription_id, stripe_status, betaling_fejlet_siden, betalingsvarsler_sendt, suspenderet_siden";

/**
 * Står den seneste faktura åben efter et fejlet forsøg? Friskt hos Stripe.
 * Eksporteret, så netop dét spørgsmål kan prøves mod Stripe test.
 */
export async function udestaaende(sub: Stripe.Subscription): Promise<{
  aaben: boolean;
  oere: number | null;
  url: string | null;
  id?: string;
}> {
  const id =
    typeof sub.latest_invoice === "string"
      ? sub.latest_invoice
      : sub.latest_invoice?.id;
  if (!id) return { aaben: false, oere: null, url: null };
  const faktura = await stripe().invoices.retrieve(id);
  const aaben =
    faktura.status === "open" &&
    faktura.attempted === true &&
    (faktura.amount_remaining ?? 0) > 0;
  return {
    aaben,
    oere: faktura.amount_remaining ?? null,
    url: faktura.hosted_invoice_url ?? null,
    id,
  };
}

function idAf(v: string | { id: string } | null | undefined): string | null {
  if (!v) return null;
  return typeof v === "string" ? v : v.id;
}

/**
 * ET NYT KORT SKAL BRUGES — OGSÅ NÅR STRIPE IKKE GØR DET SELV.
 *
 * Checkout sætter kortet på ABONNEMENTET (`default_payment_method`), og det
 * vinder over kundens standardkort. Lægger kunden et nyt kort ind — på
 * Stripes side for udløbende kort eller i kundecentret — bliver det kundens
 * standard, men abonnementet bliver stående på det gamle. MÅLT mod Stripe
 * test 28. sep. 2026: efter et nyt standardkort stod abonnementet stadig
 * `past_due` på det afviste kort, og fakturaen var åben. Hvert nyt forsøg
 * ville have ramt det gamle kort, og kunden ville have fået varsler og en
 * lukket adgang for at have gjort det rigtige.
 *
 * REGLEN: er kundens standardkort NYERE end abonnementets, flyttes
 * abonnementet over på det. Kun nyere — et ældre standardkort er ikke et, der
 * er valgt til erstatning. Har abonnementet intet kort, bruger Stripe allerede
 * kundens, og der er intet at gøre. Svarer med det nye korts id, når der blev
 * skiftet, ellers null.
 */
export async function brugNyesteKort(
  sub: Stripe.Subscription,
): Promise<string | null> {
  const subKort = idAf(sub.default_payment_method as string | { id: string } | null);
  if (!subKort) return null;
  const kunde = await stripe().customers.retrieve(
    idAf(sub.customer as string | { id: string })!,
  );
  if (kunde.deleted) return null;
  const kundensKort = idAf(
    kunde.invoice_settings?.default_payment_method as string | { id: string } | null,
  );
  if (!kundensKort || kundensKort === subKort) return null;

  const [nyt, gammelt] = await Promise.all([
    stripe().paymentMethods.retrieve(kundensKort),
    stripe().paymentMethods.retrieve(subKort),
  ]);
  if (nyt.created <= gammelt.created) return null;

  await stripe().subscriptions.update(sub.id, {
    default_payment_method: kundensKort,
  });
  return kundensKort;
}

/**
 * Prøv den åbne faktura med kundens nyeste kort. Svarer med abonnementet,
 * som det står bagefter — betaler det, er sagen slut.
 */
export async function betalMedNytKort(
  sub: Stripe.Subscription,
): Promise<Stripe.Subscription> {
  const kort = await brugNyesteKort(sub);
  if (!kort) return sub;
  const faktura = await udestaaende(sub);
  if (faktura.aaben && faktura.id) {
    // Et afvist forsøg her er bare ét forsøg mere — sagen kører videre.
    await stripe()
      .invoices.pay(faktura.id, { payment_method: kort })
      .catch(() => {});
  }
  return stripe().subscriptions.retrieve(sub.id);
}

/**
 * Betalingen er gået igennem: sagen slut og adgangen GENÅBNET.
 *
 * Gøres HER og ikke kun af webhooken: en tabt hændelse må ikke efterlade en
 * betalende kunde med en lukket adgang. Webhooken gør det samme bagefter, og
 * de to skrivninger er ens, så rækkefølgen er ligegyldig. Varen læses af
 * PRISEN, samme regel som webhooken.
 */
async function genaabn(firmaId: string, sub: Stripe.Subscription) {
  const slug = produktForPriser(sub.items.data.map((i) => i.price?.id))?.slug;
  await createAdminClient()
    .from("companies")
    .update({
      stripe_status: sub.status,
      ...(slug ? { product_slug: slug, plan: planForProduct(slug) } : {}),
      suspenderet_siden: null,
      ophoert_den: null,
      betaling_fejlet_siden: null,
      betalingsvarsler_sendt: 0,
    })
    .eq("id", firmaId);
}

/**
 * Stripe har opgivet og lukket abonnementet: annullér dets åbne fakturaer.
 *
 * Ellers kunne kunden betale den via linket i vores varsel og stå med PENGE
 * UD OG INGEN ADGANG — et lukket abonnement kan ikke vækkes af en betaling.
 * Vejen tilbage er "Genoptag abonnementet", der tegner et nyt og genåbner
 * alt af sig selv.
 */
export async function annullerAabneFakturaer(
  sub: Stripe.Subscription,
): Promise<number> {
  const aabne = await stripe().invoices.list({
    subscription: sub.id,
    status: "open",
    limit: 10,
  });
  for (const f of aabne.data) {
    if (f.id) await stripe().invoices.voidInvoice(f.id);
  }
  return aabne.data.length;
}


/**
 * Send varsel nummer `nummer`, hvis — og kun hvis — der stadig mangler en
 * betaling. Svarer, hvad der skete, så kalderen kan tælle.
 */
async function sendVarsel(
  firma: Firma,
  nummer: 1 | 2 | 3,
  sub: Stripe.Subscription,
): Promise<"sendt" | "betalt" | "venter" | "allerede" | "ingen-modtager" | "fejlede"> {
  const faktura = await udestaaende(sub);
  if (!faktura.aaben) {
    // Intet udestående: enten betalt, eller Stripe har ikke prøvet endnu.
    // Betaler abonnementet, er sagen slut; ellers venter vi på næste forsøg.
    if (erBetalende(sub.status)) {
      await genaabn(firma.id, sub);
      return "betalt";
    }
    return "venter";
  }

  const til = firma.contact_email;
  if (!til || isTestBuyer(til)) return "ingen-modtager";

  const admin = createAdminClient();
  const { data: vandt } = await admin
    .from("companies")
    .update({ betalingsvarsler_sendt: nummer })
    .eq("id", firma.id)
    .eq("betalingsvarsler_sendt", nummer - 1)
    .select("id");
  if (!vandt?.length) return "allerede";

  const produkt =
    produktForPriser(sub.items.data.map((i) => i.price?.id)) ??
    getProduct(firma.product_slug ?? "");
  const fejletSiden = new Date(firma.betaling_fejlet_siden ?? Date.now());
  const mail = betalingsvarselMail({
    firmanavn: firma.name,
    vare: produkt?.name ?? "dit abonnement",
    nummer,
    lukker: betalingLukker(fejletSiden),
    udestaaendeOere: faktura.oere,
    fakturaUrl: faktura.url,
    digital: Boolean(produkt?.kunDigital),
  });

  if (await sendKundeMail(til, mail.emne, mail.tekst)) return "sendt";

  await admin
    .from("companies")
    .update({ betalingsvarsler_sendt: nummer - 1 })
    .eq("id", firma.id)
    .eq("betalingsvarsler_sendt", nummer);
  await noterFejl(
    "betalingsvarsel",
    `Varsel ${nummer} til virksomhed ${firma.id} kunne ikke sendes — prøves igen i nat.`,
  );
  return "fejlede";
}

/**
 * Webhooken: abonnementet er gået i `past_due`/`unpaid`.
 *
 * Adgangen røres IKKE. Sagen startes (datoen sættes kun, hvis den er tom), og
 * første varsel sendes med det samme — hvis fakturaen står åben.
 *
 * Svarer false, hvis kolonnerne fra 0048 ikke findes. Så falder webhooken
 * tilbage på den gamle suspension, frem for at en betalingssag forsvinder
 * uden hverken varsel eller lukning.
 */
export async function startBetalingssag(
  firmaId: string,
  sub: Stripe.Subscription,
): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("companies")
    .update({ stripe_status: sub.status })
    .eq("id", firmaId);
  if (error) throw new Error(`stripe_status: ${error.message}`);

  const { error: startFejl } = await admin
    .from("companies")
    .update({ betaling_fejlet_siden: new Date().toISOString() })
    .eq("id", firmaId)
    .is("betaling_fejlet_siden", null);
  if (startFejl) {
    await noterFejl(
      "betalingsvarsel",
      `Betalingssagen kunne ikke startes for ${firmaId} (er 0048 kørt?): ${startFejl.message}`,
    );
    return false;
  }

  const { data: firma } = await admin
    .from("companies")
    .select(FELTER)
    .eq("id", firmaId)
    .maybeSingle();
  if (!firma || firma.suspenderet_siden) return true;
  if (firma.stripe_subscription_id !== sub.id) return true;

  if (firma.betalingsvarsler_sendt === 0) {
    try {
      // Har kunden allerede lagt et nyere kort ind, bruges det nu — så får
      // hun ingen mail om en betaling, hun har sørget for.
      const efter = await betalMedNytKort(sub);
      if (erBetalende(efter.status)) {
        await genaabn(firmaId, efter);
        return true;
      }
      await sendVarsel(firma as Firma, 1, efter);
    } catch (err) {
      await noterFejl(
        "betalingsvarsel",
        `Første varsel for ${firmaId}: ${(err as Error).message}`,
      );
    }
  }
  return true;
}

/**
 * Natkørslen: nyt kort, varsel 2 og 3, lukningen — og genåbningen.
 *
 * ALLE ÅBNE SAGER, OGSÅ DE LUKKEDE. En konto, der er lukket efter elleve
 * dage, er stadig en sag, så længe Stripe prøver (til dag 14): lægger kunden
 * et nyt kort ind, skal det bruges, og betales der, genåbnes kontoen her.
 *
 * Hvert abonnement hentes FRISKT: betaler det, genåbnes alt (også når
 * webhooken om betalingen er gået tabt); er det ikke længere en betalingssag
 * (Stripe har lukket det), tager webhooken sig af resten.
 */
export async function koerBetalingsvarsler(toerloeb: boolean): Promise<{
  sager: number;
  varsler: number;
  lukket: number;
  betalt: number;
  kortSkiftet: number;
}> {
  const admin = createAdminClient();
  const ud = { sager: 0, varsler: 0, lukket: 0, betalt: 0, kortSkiftet: 0 };

  // FØREBYGGENDE: et nyt kort på et abonnement, der betaler. Uden det ville
  // kunden, der fulgte Stripes mail om et udløbende kort, først få en fejlet
  // betaling og en varselsmail — for at have gjort det rigtige.
  if (!toerloeb) {
    const { data: aktive } = await admin
      .from("companies")
      .select("id, stripe_subscription_id")
      .not("stripe_subscription_id", "is", null)
      .in("stripe_status", ["active", "trialing"]);
    for (const firma of aktive ?? []) {
      try {
        const sub = await stripe().subscriptions.retrieve(
          firma.stripe_subscription_id!,
        );
        if (erBetalende(sub.status) && (await brugNyesteKort(sub))) {
          ud.kortSkiftet++;
        }
      } catch (err) {
        await noterFejl(
          "betalingsvarsel",
          `Kortsynk for ${firma.id}: ${(err as Error).message}`,
        );
      }
    }
  }

  const { data, error } = await admin
    .from("companies")
    .select(FELTER)
    .not("betaling_fejlet_siden", "is", null)
    .in("stripe_status", ["past_due", "unpaid"]);

  if (error) {
    // 42703: kolonnen findes ikke — 0048 er ikke kørt. Ikke noget at alarmere
    // om hver nat; se samme hensyn i oprydningsruten.
    if (error.code !== "42703") {
      await noterFejl("betalingsvarsel", `Kunne ikke hente sager: ${error.message}`);
    }
    return ud;
  }

  for (const firma of (data ?? []) as Firma[]) {
    ud.sager++;
    if (!firma.stripe_subscription_id || !firma.betaling_fejlet_siden) continue;

    try {
      let sub: Stripe.Subscription = await stripe().subscriptions.retrieve(
        firma.stripe_subscription_id,
      );
      if (!toerloeb && erBetalingssag(sub.status)) {
        const foer = sub.default_payment_method;
        sub = await betalMedNytKort(sub);
        if (sub.default_payment_method !== foer) ud.kortSkiftet++;
      }
      if (erBetalende(sub.status)) {
        if (!toerloeb) await genaabn(firma.id, sub);
        ud.betalt++;
        continue;
      }
      if (!erBetalingssag(sub.status)) continue;

      // Allerede lukket: der ventes kun på betalingen — ingen flere varsler.
      if (firma.suspenderet_siden) continue;

      const sag = betalingssagIDag(
        new Date(firma.betaling_fejlet_siden),
        firma.betalingsvarsler_sendt,
      );
      if (!sag || toerloeb) continue;

      if ("varsel" in sag) {
        const svar = await sendVarsel(firma, sag.varsel, sub);
        if (svar === "sendt") ud.varsler++;
        if (svar === "betalt") ud.betalt++;
        continue;
      }

      // LUK — kun hvis fakturaen STADIG står åben. Samme forsigtighed som
      // ved varslerne: en betaling, der netop er gået igennem, må ikke give
      // en lukket adgang, fordi webhooken endnu ikke er nået frem.
      const faktura = await udestaaende(sub);
      if (!faktura.aaben) continue;
      const { data: lukket } = await admin
        .from("companies")
        .update({
          plan: "basic" as const,
          suspenderet_siden: new Date().toISOString(),
        })
        .eq("id", firma.id)
        .is("suspenderet_siden", null)
        .select("id");
      if (lukket?.length) ud.lukket++;
    } catch (err) {
      await noterFejl(
        "betalingsvarsel",
        `Sag for ${firma.id}: ${(err as Error).message}`,
      );
    }
  }

  return ud;
}
