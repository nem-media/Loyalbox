import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { koebSpaerre } from "@/lib/commerce";
import { COMPANY, getProduct, VOLUME_DISCOUNTS } from "@/lib/constants";
import { designFrontfarve } from "@/lib/design";
import { DesignPreview } from "@/components/design-preview";
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
 *    design og skal bare have det trykt igen. SAMME QR-adresse: begge veje
 *    herfra bærer `?stand=`, så skiltet peger på den side, kunden står på.
 *    Betaler IKKE for frontfarven igen; det sidder på designet og ikke på
 *    ordren (se `frontfarve_betalt` i design.ts).
 *
 * ET SKILT MERE ER IKKE EN ADRESSE MERE. Statistikken deles pr. QR-adresse
 * (`stand_id`) og aldrig pr. skilt — tyve skilte på samme adresse tæller i
 * samme kasse, og det er meningen. Skal to steder tælles hver for sig, er
 * det en adresse mere, ikke et skilt mere; se `adresseSpaerre()`.
 *
 * SPÆRREN SKJULER IKKE LÆNGERE BOKSEN. Den returnerede `null` ved
 * `ikke-aabnet`, og så fordampede hele afsnittet: en kunde stod på sin egen
 * standerside uden nogen vej til et skilt og uden en forklaring. Det er stik
 * imod grunden til, at `koebSpaerre()` svarer med en GRUND frem for et
 * boolean — så siden kan skrive noget brugbart i stedet for bare at skjule
 * knappen.
 *
 * TO VIDT FORSKELLIGE ÅRSAGER GIVER SAMME SVAR, og beskeden skal passe på
 * begge: i dag kører produktionen med en TESTnøgle, så ingen uden for
 * `@loyalbox.test` kan købe; den dag live åbnes, er det tilkøbet selv, der
 * mangler sine live-id'er hos Stripe (se `canSell()`). Ordlyden nævner derfor
 * ikke ÅRSAGEN, kun at selvbetjeningen ikke er åben — og den henviser til en
 * mail, så et salg ikke går tabt imens.
 *
 * IKKE den gamle besked til BESØGENDE (slettet ved åbningen). Her står en betalende kunde, der allerede har produktet og bare
 * vil have et skilt mere — dem sætter vi ordren op for i hånden.
 *
 * `ingen-virksomhed` skjuler stadig boksen, og det er med vilje: det svar
 * kommer, når en ADMIN kigger på en kundes side, og admin skal ikke kunne
 * bestille på kundens vegne.
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

  if (spaerre === "ingen-virksomhed" || !vare) {
    return null;
  }

  const kanBestille = spaerre === null;

  // Designene hentes kun, når de kan bruges til noget. Er købet spærret, er
  // listen et katalog over knapper, der ikke virker.
  const { data: designs } =
    company && kanBestille
      ? await createAdminClient()
          .from("designs")
          .select(
            "id, navn, stander_farve, front_type, front_hex, accent_hex, logo_url, frontfarve_betalt",
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

      {kanBestille ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={grund}
            className="btn-shape bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
          >
            Design et nyt skilt
          </Link>
        </div>
      ) : (
        <div className="box-shape mt-4 border border-secondary/40 bg-secondary/10 p-4 text-sm">
          <p className="font-bold tracking-tight">
            Selvbetjent bestilling er ikke åbnet endnu
          </p>
          <p className="mt-1 text-muted">
            Skriv til{" "}
            <a
              href={`mailto:${COMPANY.email}?subject=Skilt til ${standNavn}`}
              className="font-medium text-accent"
            >
              {COMPANY.email}
            </a>
            , så sætter vi ordren op i hånden — skiltet trykkes stadig med denne
            standers QR-kode.
          </p>
        </div>
      )}

      {designs && designs.length ? (
        <div className="mt-6">
          <p className="etiket">Eller genbrug et design, du har</p>
          {/*
            "NY QR-KODE" VAR FORKERT — OG FORKERT PÅ DEN DYRE MÅDE.
            Begge veje herfra bærer samme `?stand=`, så skiltet trykkes med
            DENNE standers kode og peger på den side, kunden allerede har sat
            op. Teksten lovede det modsatte, og den, der ville have to steder
            talt hver for sig, kunne tro, at et genbestilt skilt gav dem en ny
            adresse. Det gør det ikke: statistikken deles pr. QR-adresse
            (`stand_id`), ikke pr. skilt — se `grupperPrAdresse()`.
          */}
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Samme udseende og <strong>samme QR-kode</strong> som ovenfor, så
            skiltet fører hen til den side, du allerede har sat op. Har du
            betalt for en egen frontfarve på designet, betaler du ikke for den
            igen.
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
                    {/* Skiltet selv, så designet kan GENKENDES uden at blive
                        åbnet. Farveprøven her var 44 × 36 px og viste kun
                        fronten og logoet — to designs i samme farve så
                        fuldstændig ens ud. Bredden er prøvet af: ved 36 px er
                        skiltet et udtværet frimærke, ved 56 er logoet skarpt. */}
                    <DesignPreview design={d} className="w-14 shrink-0" />
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
