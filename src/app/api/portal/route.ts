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
  const customerId = user?.company?.stripe_customer_id;

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
