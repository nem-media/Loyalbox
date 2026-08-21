import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { koebSpaerre } from "@/lib/commerce";
import { getProduct, VOLUME_DISCOUNTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

/** Varen, der bestilles. Ét sted, så listen og detaljesiden ikke kan gå i utakt. */
export const EKSTRA_STANDER_SLUG = "ekstra-stander";

/**
 * "Bestil et fysisk skilt".
 *
 * HVORFOR DEN FINDES: det, man opretter under Standere, er en QR-adresse og en
 * side — ikke et skilt. Der var ingen vej fra en ny QR-adresse til at få det
 * fysiske skilt, der skal stå på disken, og kunden stod derfor med et link
 * uden noget at sætte det på.
 *
 * KØBET ÆNDRER IKKE ABONNEMENTET. Et skilt er et tilkøb, og varen er markeret
 * `addon` netop derfor — se webhooken, hvor et engangskøb ikke længere kan
 * røre et bestående kundeforhold. Før ville en Pro-kunde, der bestilte et
 * skilt mere, blive sat ned til Basic.
 *
 * Spærren er den samme som overalt ellers: `koebSpaerre()` afgør både om
 * knappen vises, og hvad der står i stedet. Vises der intet, er salget ikke
 * åbnet i dette miljø, og det er ikke noget, kunden skal læse om.
 */
export async function BestilStander({
  overskrift = "Mangler du et skilt?",
  className,
}: {
  overskrift?: string;
  className?: string;
}) {
  const user = await getCurrentUser();
  const vare = getProduct(EKSTRA_STANDER_SLUG);
  const spaerre = koebSpaerre(user, vare);

  if (spaerre === "ikke-aabnet" || spaerre === "ingen-virksomhed" || !vare) {
    return null;
  }

  const stoersteRabat = Math.max(...VOLUME_DISCOUNTS.map((d) => d.discountPct));

  return (
    <div
      className={`box-shape border border-border bg-card p-5 ${className ?? ""}`}
    >
      <p className="font-semibold tracking-tight">{overskrift}</p>

      {spaerre === "cvr-mangler" ? (
        <>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Vi mangler dit CVR-nummer, før du kan bestille. Det tager et
            øjeblik at skrive ind.
          </p>
          <Link
            href="/dashboard/profil"
            className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
          >
            Udfyld CVR-nummer →
          </Link>
        </>
      ) : (
        <>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            En QR-adresse er ikke et skilt. Bestil et fysisk skilt med dit logo
            til {formatCurrency(vare.price)} pr. stk. — køber du flere, falder
            prisen med op til {stoersteRabat} %. Det ændrer ikke dit
            abonnement.
          </p>
          <Link
            href={`/bestil?produkt=${EKSTRA_STANDER_SLUG}`}
            className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
          >
            Bestil skilt →
          </Link>
        </>
      )}
    </div>
  );
}
