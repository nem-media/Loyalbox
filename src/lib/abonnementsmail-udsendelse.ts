import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendKundeMail } from "@/lib/mail";
import { noterFejl } from "@/lib/drift";
import type Stripe from "stripe";
import { isTestBuyer } from "@/lib/commerce";
import { getProduct } from "@/lib/constants";
import { periodeSlut } from "@/lib/stripe-abonnement";
import {
  fortrudtMail,
  livshaendelse,
  opsagtMail,
  stoppetMail,
  type AbonnementsUddrag,
} from "@/lib/abonnementsmail";

/**
 * Send en abonnementsmail PRÆCIS ÉN GANG pr. nøgle.
 *
 * SPÆRREN KOMMER FØRST, MAILEN BAGEFTER. Rækken i `kundemail_spaerre` (0047)
 * indsættes, før der sendes; den, der får `23505`, ved at en anden leverance
 * af samme hændelse nåede det først. Et opslag efterfulgt af en skrivning
 * ville give to mails, når Stripe leverer to gange samtidig — målt på
 * alarmerne i 0039, hvor ti samtidige fejl gav ti mails.
 *
 * FINDES TABELLEN IKKE, SENDES DER ALLIGEVEL. Migrationer køres i hånden, og
 * koden skal kunne stå i drift før 0047. En sjælden dublet er bedre end en
 * opsigelse, kunden aldrig får bekræftet — det er det samme valg som
 * `maa_alarmere()`' tilbagefald.
 *
 * FEJLER MAILEN, FJERNES SPÆRREN IGEN, og fejlen noteres, så vi får en alarm.
 * Webhooken svarer stadig 200: at lade Stripe prøve hele hændelsen igen for
 * en mail ville også gentage alt det andet, hændelsen gjorde.
 *
 * TESTKONTI FÅR INGEN MAIL. Basen deles af udvikling og produktion, og
 * `@loyalbox.test` findes ikke — hver afvist mail ville larme i driftsloggen.
 * Samme definition som varslingslisten (`isTestBuyer`).
 */
export async function sendAbonnementsmail(opts: {
  noegle: string;
  til: string | null | undefined;
  mail: { emne: string; tekst: string };
}): Promise<"sendt" | "allerede-sendt" | "ingen-modtager" | "fejlede"> {
  const { noegle, til, mail } = opts;
  if (!til || isTestBuyer(til)) return "ingen-modtager";

  const admin = createAdminClient();
  const { error: spaerreFejl } = await admin
    .from("kundemail_spaerre")
    .insert({ noegle });

  if (spaerreFejl?.code === "23505") return "allerede-sendt";

  // Enhver anden fejl end "findes allerede" — typisk at 0047 ikke er kørt —
  // betyder, at vi ikke HAR en spærre. Så sendes der uden, og det noteres.
  const harSpaerre = !spaerreFejl;
  if (spaerreFejl) {
    console.error(
      "[abonnementsmail] spærren kunne ikke sættes, sender uden:",
      spaerreFejl.code,
      spaerreFejl.message,
    );
  }

  if (await sendKundeMail(til, mail.emne, mail.tekst)) return "sendt";

  if (harSpaerre) {
    await admin.from("kundemail_spaerre").delete().eq("noegle", noegle);
  }
  await noterFejl(
    "abonnementsmail",
    `Kunne ikke sende "${mail.emne}" (${noegle})`,
  );
  return "fejlede";
}

/**
 * Mail om det, der lige skete med abonnementet — eller ingenting.
 *
 * KALDES AF WEBHOOKEN for `customer.subscription.updated` og `.deleted`,
 * efter at virksomheden er fundet. `livshaendelse()` afgør, om der er noget
 * at sige; de fleste opdateringer (en ny faktura, en ny periode) giver null.
 *
 * KUN VIRKSOMHEDENS NUVÆRENDE ABONNEMENT. Et andet abonnement på samme
 * virksomhed — et gammelt efter en genoptagelse — må ikke sende "dit
 * abonnement er stoppet" til en kunde, hvis rigtige abonnement kører.
 *
 * NØGLEN: "stoppet" kan kun ske én gang for et abonnement og nøgles derfor på
 * abonnementet. "opsagt" og "fortrudt" kan ske flere gange (opsig, fortryd,
 * opsig igen) og nøgles på Stripes hændelses-id, som er det samme ved en
 * gentaget levering af samme hændelse.
 *
 * KASTER ALDRIG. En mail må ikke vælte den hændelse, den handlede om.
 */
export async function mailOmAbonnementet(opts: {
  event: Stripe.Event;
  sub: Stripe.Subscription;
  firmaId: string;
}): Promise<void> {
  const { event, sub, firmaId } = opts;
  try {
    const data = event.data as {
      object: Stripe.Subscription;
      previous_attributes?: Partial<Stripe.Subscription>;
    };
    const haendelse = livshaendelse({
      type: event.type,
      haendelse: data.object,
      foer: data.previous_attributes as Partial<AbonnementsUddrag> | undefined,
      nu: sub,
    });
    if (!haendelse) return;

    const { data: firma } = await createAdminClient()
      .from("companies")
      .select("name, contact_email, product_slug, stripe_subscription_id")
      .eq("id", firmaId)
      .maybeSingle();

    if (!firma || firma.stripe_subscription_id !== sub.id) return;

    const slug = firma.product_slug ?? sub.metadata?.product_slug;
    const produkt = slug ? getProduct(slug) : undefined;
    const vare = produkt?.name || "dit abonnement";
    const digital = Boolean(produkt?.kunDigital);
    const firmanavn = firma.name ?? null;

    let noegle: string;
    let mail: { emne: string; tekst: string };

    if (haendelse === "opsagt") {
      const stopper =
        typeof sub.cancel_at === "number"
          ? new Date(sub.cancel_at * 1000)
          : periodeSlut(sub);
      if (!stopper) {
        await noterFejl(
          "abonnementsmail",
          `Opsigelse af ${sub.id} uden en slutdato — ingen mail sendt.`,
        );
        return;
      }
      noegle = `opsagt:${event.id}`;
      mail = opsagtMail({ firmanavn, vare, stopper, digital });
    } else if (haendelse === "fortrudt") {
      noegle = `fortrudt:${event.id}`;
      mail = fortrudtMail({ firmanavn, vare, naesteBetaling: periodeSlut(sub) });
    } else {
      const aarsag = sub.cancellation_details?.reason;
      noegle = `stoppet:${sub.id}`;
      mail = stoppetMail({
        firmanavn,
        vare,
        stoppet: sub.ended_at ? new Date(sub.ended_at * 1000) : new Date(),
        betalingFejlede:
          aarsag === "payment_failed" || aarsag === "payment_disputed",
        digital,
      });
    }

    await sendAbonnementsmail({ noegle, til: firma.contact_email, mail });
  } catch (err) {
    await noterFejl(
      "abonnementsmail",
      `Fejl under mail for ${event.type} (${sub.id}): ${(err as Error).message}`,
    );
  }
}
