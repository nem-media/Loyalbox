import Link from "next/link";
import { Logo } from "@/components/brand";
import { PRIVAT_SIDE } from "@/lib/site";
import { FindKortForm } from "./find-form";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Find mit stempelkort",
  ...PRIVAT_SIDE,
};

/**
 * VEJEN TILBAGE TIL SIT EGET KORT — HJEMMEFRA.
 *
 * `selfEnroll()` genbruger et medlem på e-mail eller telefon, så et mistet
 * kort kan hentes tilbage med alle sine stempler. Men det kunne KUN ske fra
 * butikkens egen tilmeldingsside: en kunde uden linket, der sad i sin sofa,
 * havde ingen vej ind. Det var dét, der gjorde "uden app · uden konto" til et
 * halvt løfte — kortet var ikke væk, men hun kunne ikke nå det.
 *
 * SIDEN ER BEVIDST UDEN BUTIK I ADRESSEN. Kunden husker sjældent hvilken
 * stander eller hvilket slug; hun husker sin e-mail. Så søges der på tværs af
 * butikker, og mailen samler alle hendes kort — hvilket samtidig er svaret
 * for den, der har kort flere steder.
 *
 * SIDEN MÅ IKKE INDEKSERES (`PRIVAT_SIDE`) og siger ALDRIG, hvad den fandt.
 * Hele sikkerheden ligger i, at svaret er det samme hver gang, og at linket
 * kun går til indbakken. Se `findMitKort()`.
 */
export default function FindKortPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-dark px-4 py-10">
      <div className="box-shape w-full max-w-md border border-border bg-card p-6 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)] sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            Find dit stempelkort
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Har du mistet linket til dit kort? Dine stempler er der stadig —
            skriv den e-mail, du brugte, så sender vi linket igen.
          </p>
        </div>

        <FindKortForm />

        <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">
          Har du en konto?{" "}
          <Link
            href="/login?next=/mine-kort"
            className="font-medium text-accent hover:underline"
          >
            Log ind og se alle dine kort
          </Link>
        </p>
      </div>
      <div className="mt-8">
        <Logo image="light" className="opacity-80" />
      </div>
    </div>
  );
}
