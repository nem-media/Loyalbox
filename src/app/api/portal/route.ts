import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/site";

/**
 * Sender kunden til Stripes kundecenter.
 *
 * Derinde kan de selv skifte betalingskort, rette fakturamailen til
 * bogholderiet, hente kvitteringer og opsige. Det er alt sammen noget, vi
 * ellers skulle bygge og vedligeholde — og fakturaerne derfra er gyldige
 * bilag med moms, hvilket vores egne kvitteringer ikke ville være.
 */
export async function POST() {
  const user = await getCurrentUser();

  /**
   * EN UDLØBET SESSION ER IKKE "INGEN BETALING".
   *
   * Begge tilfælde faldt før i samme gren, og beskeden talte om "din
   * virksomhed" til en, der ikke var logget ind. Det er ikke et hul —
   * der sker ingenting — men det er den forkerte besked netop dér, hvor
   * den betyder mest: kunden har trykket "Administrer betaling", sessionen
   * er udløbet undervejs, og svaret siger, at hun ikke har betalt noget.
   * Så leder hun efter en fejl i abonnementet i stedet for at logge ind.
   * `/api/checkout` svarer allerede 401 her.
   */
  if (!user) {
    return NextResponse.json({ error: "Log ind først." }, { status: 401 });
  }

  const customerId = user.company?.stripe_customer_id;

  if (!customerId) {
    return NextResponse.json(
      { error: "Der er endnu ingen betaling knyttet til din virksomhed." },
      { status: 400 },
    );
  }

  const session = await stripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getSiteUrl()}/dashboard/abonnement`,
    locale: "da",
  });

  return NextResponse.json({ url: session.url });
}
