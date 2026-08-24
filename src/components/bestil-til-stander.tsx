import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { koebSpaerre } from "@/lib/commerce";
import { getProduct, VOLUME_DISCOUNTS } from "@/lib/constants";
import { designFrontfarve } from "@/lib/design";
import { formatCurrency } from "@/lib/utils";
import { EKSTRA_STANDER_SLUG } from "@/components/bestil-stander";

/**
 * Bestil et fysisk skilt til NETOP DENNE QR-adresse.
 *
 * FORSKELLEN FRA `BestilStander`: den generelle boks sender kunden til
 * bestillingen uden at sige, hvilken QR-kode skiltet skal trykkes med. Har
 * butikken to standere — "Disken" og "Bordene" — vidste hverken kunden eller
 * vi, hvilken af dem ordren gjaldt. Herfra følger standeren med hele vejen
 * til ordren (`orders.stand_id`, migration 0022).
 *
 * TO VEJE, fordi de svarer til to forskellige situationer:
 *
 *  - **Nyt design** — kunden har ikke bestilt før, eller vil have noget andet.
 *    Går til designeren, hvor farve, front og logo vælges.
 *  - **Genbrug et design** — kunden har allerede betalt for opsætningen af et
 *    design og skal bare have det trykt igen, nu med en anden QR-adresse.
 *    Betaler IKKE for frontfarven igen; det sidder på designet og ikke på
 *    ordren (se `frontfarve_betalt` i design.ts).
 *
 * Spærren er den samme som overalt ellers: `koebSpaerre()` afgør både om der
 * vises noget, og hvad der står i stedet.
 */
export async function BestilTilStander({
  standId,
  standNavn,
  className,
}: {
  standId: string;
  standNavn: string;
  className?: string;
}) {
  const user = await getCurrentUser();
  const vare = getProduct(EKSTRA_STANDER_SLUG);
  const spaerre = koebSpaerre(user, vare);
  const company = user?.company;

  if (spaerre === "ikke-aabnet" || spaerre === "ingen-virksomhed" || !vare) {
    return null;
  }

  if (spaerre === "cvr-mangler") {
    return (
      <div
        className={`box-shape border border-border bg-card p-5 ${className ?? ""}`}
      >
        <p className="font-semibold tracking-tight">
          Bestil skilt til {standNavn}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Vi mangler dit CVR-nummer, før du kan bestille. Det tager et øjeblik
          at skrive ind.
        </p>
        <Link
          href="/dashboard/profil"
          className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
        >
          Udfyld CVR-nummer →
        </Link>
      </div>
    );
  }

  const { data: designs } = company
    ? await createAdminClient()
        .from("designs")
        .select(
          "id, navn, stander_farve, front_type, front_hex, logo_url, frontfarve_betalt",
        )
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(6)
    : { data: null };

  const stoersteRabat = Math.max(...VOLUME_DISCOUNTS.map((d) => d.discountPct));
  const grund = `/bestil?produkt=${EKSTRA_STANDER_SLUG}&stand=${standId}`;

  return (
    <div
      className={`box-shape border border-border bg-card p-5 ${className ?? ""}`}
    >
      <p className="font-semibold tracking-tight">
        Bestil skilt til {standNavn}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Skiltet trykkes med <strong>denne standers QR-kode</strong>, så det
        peger på den side, du har sat op ovenfor. {formatCurrency(vare.price)}{" "}
        pr. stk., og køber du flere, falder prisen med op til {stoersteRabat} %.
        Det ændrer ikke dit abonnement.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={grund}
          className="btn-shape bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        >
          Design et nyt skilt
        </Link>
      </div>

      {designs && designs.length ? (
        <div className="mt-6">
          <p className="etiket">Eller genbrug et design, du har</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Samme udseende, ny QR-kode. Har du betalt for en egen frontfarve på
            designet, betaler du ikke for den igen.
          </p>

          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {designs.map((d) => {
              const front = designFrontfarve(d);
              return (
                <li key={d.id}>
                  <Link
                    href={`${grund}&design=${d.id}`}
                    className="box-shape flex items-center gap-3 border border-border p-3 transition-colors hover:border-accent/50 hover:bg-accent/5"
                  >
                    {/* Farveprøven vises som den trykkes — også en hvid front,
                        så kunden genkender designet uden at åbne det. */}
                    <span
                      aria-hidden="true"
                      className="box-shape grid h-11 w-9 shrink-0 place-items-center overflow-hidden border border-border"
                      style={{ background: front.hex }}
                    >
                      {d.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={d.logo_url}
                          alt=""
                          className="max-h-full max-w-full object-contain p-0.5"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {d.navn}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {front.beskrivelse}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
