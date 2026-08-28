import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BestilUdenKontoForm } from "./bestil-form";
import { PurchaseNotice } from "@/components/purchase-notice";
import { getProduct } from "@/lib/constants";
import { canSell, kanBestillesUdenKonto } from "@/lib/commerce";

export const metadata = {
  title: "Bestil uden konto",
  description:
    "Bestil din reviewstander med logo og eget link. Ingen konto, intet abonnement — skiltet sendes til dig.",
  alternates: { canonical: "/bestil/uden-konto" },
};

/**
 * Bestilling uden konto.
 *
 * HVORFOR SIDEN FINDES: en Basic-kunde køber ét skilt og skal ikke
 * administrere noget bagefter. De fik alligevel en konto, et dashboard uden
 * indhold og en LoyalSum-side, der indsamlede feedback, de aldrig kunne læse.
 * Nu er Basic et trykt skilt — ikke et system.
 *
 * SIDEN KRÆVER IKKE LOGIN, og det er hele pointen. Derfor sker al kontrol på
 * serveren i `bestilUdenKonto()`: der er ingen konto at falde tilbage på for
 * hverken CVR, mail eller firmanavn.
 */
export default async function UdenKontoPage({
  searchParams,
}: {
  searchParams: Promise<{ produkt?: string; antal?: string }>;
}) {
  const { produkt, antal } = await searchParams;

  // Reglen for, hvad der overhovedet må bestilles uden konto, ligger ÉT sted
  // — samme funktion, som `/bestil` sender kunden herhen efter. Falder ingen
  // slug med, er det Reviewstander.
  const product = getProduct(produkt ?? "reviewstander");
  if (!kanBestillesUdenKonto(product)) notFound();

  return (
    <>
      <SiteHeader />
      {/* Bredden følger indholdet: bestillingen er to spalter fra `lg`, og
          `max-w-lg` gjorde den til én bane på en halv skærm. Overskriften er
          venstrestillet over gitteret frem for centreret — den hører til
          venstre spalte, hvor man begynder. */}
      <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight">
          Bestil din {product.name.toLowerCase()}
        </h1>
        <p className="mt-2 max-w-xl leading-relaxed text-muted">
          Ingen konto, intet abonnement. Vælg farve, upload dit logo, og sæt
          linket QR-koden skal føre til — så sender vi skiltet.
        </p>

        <div className="mt-8">
          {canSell(product) ? (
            <BestilUdenKontoForm
              product={product}
              initialQty={Number(antal) || 1}
            />
          ) : (
            <PurchaseNotice />
          )}
        </div>

        <p className="mt-10 max-w-xl text-sm text-muted">
          Skal du bruge statistik, feedback-indbakke eller digitale
          stempelkort?{" "}
          <Link href="/produkter" className="font-medium text-accent hover:underline">
            Se de øvrige produkter
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
