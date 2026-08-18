import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink } from "@/components/ui/button";

export const metadata = {
  title: "Tak for din bestilling",
  robots: { index: false, follow: false },
};

/**
 * Kvittering efter Stripe Checkout.
 *
 * Siden bekræfter IKKE selv betalingen. Den kommer fra Stripes redirect, som
 * en bruger i teorien kan kalde direkte — sandheden om, at pengene er hjemme,
 * kommer fra webhooken. Derfor er teksten holdt til "vi har modtaget din
 * bestilling" frem for at love, at der er trukket.
 */
export default function OrderThanksPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-20">
        <div className="box-shape border border-accent/30 bg-accent/5 p-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Tak for din bestilling
          </h1>
          <p className="mt-3 leading-relaxed text-muted">
            Vi har modtaget den. Du får en kvittering på mail, så snart
            betalingen er bekræftet — den kan bruges til bogføring.
          </p>
        </div>

        <div className="mt-8">
          <h2 className="font-bold tracking-tight">Hvad sker der nu?</h2>
          <ol className="mt-3 space-y-2 text-muted">
            <li>
              1. Vi sætter din stander op med dit logo og dine links og sender
              den afsted.
            </li>
            <li>
              2. Din adgang åbnes i dashboardet, så du kan gøre klar imens.
            </li>
            <li>
              3. Sæt standeren på disken, og du er i gang.
            </li>
          </ol>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/dashboard" size="lg">
            Gå til dashboardet
          </ButtonLink>
          <ButtonLink href="/dashboard/standere" variant="outline" size="lg">
            Sæt din stander op
          </ButtonLink>
        </div>

        <p className="mt-8 text-sm text-muted">
          Noget der ikke stemmer? Skriv til{" "}
          <Link
            href="mailto:kontakt@loyalsum.dk"
            className="font-medium text-accent"
          >
            kontakt@loyalsum.dk
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
