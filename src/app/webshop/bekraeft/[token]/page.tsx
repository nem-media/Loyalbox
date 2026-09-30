import Link from "next/link";
import { Logo } from "@/components/brand";
import { PRIVAT_SIDE } from "@/lib/site";
import { forhaandsvisKobling } from "@/lib/commerce-api/kobling";
import { BekraeftForm } from "./bekraeft-form";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Bekræft din e-mail",
  ...PRIVAT_SIDE,
};

/**
 * KUNDEN BEKRÆFTER, AT WEBSHOPPENS E-MAIL ER HENDES.
 *
 * Linket kommer fra `POST /customers/link`: en webshop har bedt om at bruge
 * kundens LoyalSum-fordele. Først når hun har trykket her, må pointene
 * BRUGES i webshoppen — e-mailen på en ordre alene er aldrig nok.
 *
 * SIDEN BEKRÆFTER INTET VED AT BLIVE ÅBNET. Mailprogrammer og virusscannere
 * åbner links af sig selv; derfor kræver bekræftelsen et tryk (en POST), og
 * visningen her læser kun.
 *
 * Den må ikke indekseres (`PRIVAT_SIDE`): tokenet i adressen er nøglen.
 */
export default async function BekraeftSide({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const status = await forhaandsvisKobling(token);

  return (
    <main id="indhold" className="flex min-h-screen flex-col items-center justify-center bg-dark px-4 py-10">
      <div className="box-shape w-full max-w-md border border-border bg-card p-6 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)] sm:p-8">
        {status.gyldig ? (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-xl font-semibold tracking-tight">Bekræft din e-mail</h1>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Webshoppen hos {status.butik} vil gerne lade dig bruge dine point
                og stempler, når du handler online. Bekræft, at det er din e-mail.
              </p>
            </div>
            <BekraeftForm token={token} butik={status.butik} nyKunde={status.nyKunde} />
            <p className="mt-6 border-t border-border pt-5 text-center text-xs leading-relaxed text-muted">
              Du tilmeldes ikke nyhedsbreve eller markedsføring. Har du ikke bedt
              om det, kan du lukke siden — der sker ingenting.
            </p>
          </>
        ) : (
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight">Linket virker ikke</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Det er brugt, udløbet eller forkert. Bed om et nyt fra webshoppen.
            </p>
            <p className="mt-6 text-sm">
              <Link href="/kort/find" className="font-medium text-accent hover:underline">
                Find dit kort i stedet
              </Link>
            </p>
          </div>
        )}
      </div>
      <div className="mt-8">
        <Logo image="light" className="opacity-80" />
      </div>
    </main>
  );
}
