import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Pricing } from "@/components/pricing";
import { QuantityOrder } from "@/components/quantity-order";
import { PRODUCTS, LEVERINGSLAND_NAVN, harFysiskSkilt } from "@/lib/constants";
import { StanderDesigner } from "@/components/stander-designer";
import { GenbestilDesign, type GemtDesign } from "@/components/genbestil-design";
import { createAdminClient } from "@/lib/supabase/admin";
import { designFrontfarve } from "@/lib/design";
import { Badge } from "@/components/ui/badge";
import { PurchaseNotice } from "@/components/purchase-notice";
import { CheckoutButton } from "@/components/checkout-button";
import { getCurrentUser } from "@/lib/auth";
import { koebSpaerre } from "@/lib/commerce";
import { requiresDpa } from "@/lib/dpa";

export const metadata = {
  title: "Bestil din stander",
  description:
    "Bestil din LoyalSum-stander med mængderabat. Reviewstander, Reviewstander Pro eller LoyalSum Komplet med digitalt stempelkort.",
  alternates: { canonical: "/bestil" },
};

/**
 * Henter et gemt design, hvis det tilhører butikken.
 *
 * Ejerskabet er en del af forespørgslen og ikke et tjek bagefter: så kan en
 * fremtidig ændring ikke komme til at læse først og spørge senere.
 */
async function hentDesign(
  id: string,
  companyId: string,
): Promise<GemtDesign | null> {
  const { data } = await createAdminClient()
    .from("designs")
    .select(
      "id, navn, stander_farve, front_type, front_hex, logo_url, frontfarve_betalt",
    )
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!data) return null;

  const front = designFrontfarve(data);
  return {
    id: data.id,
    navn: data.navn,
    stander_farve: data.stander_farve,
    front_hex: front.hex,
    front_beskrivelse: front.beskrivelse,
    logo_url: data.logo_url,
    frontfarve_betalt: data.frontfarve_betalt,
    egen_frontfarve: front.egen,
  };
}

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ produkt?: string; antal?: string; design?: string }>;
}) {
  const { produkt, antal, design: designId } = await searchParams;
  const selected = PRODUCTS.find((p) => p.slug === produkt);
  const initialQty = Number(antal) || 1;

  // Betalingsknappen vises kun, når den rent faktisk virker for den besøgende.
  // Samme regel som /api/checkout håndhæver — ét sted, så de ikke kan komme i
  // utakt: knappen må aldrig vises til nogen, ruten vil afvise.
  //
  // koebSpaerre() giver en GRUND og ikke bare et ja/nej, så beskeden kan blive
  // brugbar. En knap, der forsvinder, forklarer ingenting — og "du mangler et
  // CVR-nummer" er en helt anden besked end "vi har ikke åbnet for salg".
  const user = await getCurrentUser();
  const spaerre = koebSpaerre(user, selected);

  /**
   * Genbestilling af et gemt design.
   *
   * Designet hentes med ejerskabet som en del af forespørgslen — et design,
   * der tilhører en anden butik, må ikke engang læses. Findes det ikke, falder
   * siden tilbage til den almindelige bestilling frem for at vise en fejl: en
   * gammel bogmærket adresse skal ikke være en blindgyde.
   */
  const gemt =
    designId && user?.company && spaerre === null
      ? await hentDesign(designId, user.company.id)
      : null;

  /** Har bestillingen sin egen antalsvælger og pris? Så skal der ikke være to. */
  const viserDesigner = Boolean(
    selected && spaerre === null && harFysiskSkilt(selected) && user?.company,
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        {selected ? (
          <div className="mx-auto max-w-lg space-y-5">
            <div>
              <Badge tone="accent">Valgt produkt</Badge>
              <h1 className="mt-3 text-2xl font-bold tracking-tight">
                {selected.name}
              </h1>
              <p className="mt-1 text-muted">{selected.tagline}</p>
            </div>

            <ul className="space-y-1 text-sm text-muted">
              {selected.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>

            {gemt ? (
              <GenbestilDesign
                product={selected}
                design={gemt}
                kraeverDpa={requiresDpa(selected)}
              />
            ) : spaerre === null && harFysiskSkilt(selected) && user?.company ? (
              <StanderDesigner
                product={selected}
                companyId={user.company.id}
                initialQty={initialQty}
                kraeverDpa={requiresDpa(selected)}
              />
            ) : spaerre === null ? (
              <div className="box-shape border border-accent/30 bg-accent/5 p-4">
                <p className="text-sm font-medium">Klar til betaling</p>
                <p className="mt-1 mb-3 text-sm text-muted">
                  Du betaler standeren nu. Abonnementet trækkes den 20. hver
                  måned for den kommende måned.
                </p>
                <CheckoutButton
                  slug={selected.slug}
                  qty={initialQty}
                  kraeverDpa={requiresDpa(selected)}
                />
                {requiresDpa(selected) ? (
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    Databehandleraftalen er lovpligtig, fordi vi behandler
                    oplysninger om dine kunder på dine vegne.
                  </p>
                ) : null}
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Vi sælger kun til virksomheder og leverer i{" "}
                  {LEVERINGSLAND_NAVN}. Priserne er uden moms, og der er ikke
                  fortrydelsesret ved erhvervskøb.
                </p>
              </div>
            ) : spaerre === "ingen-virksomhed" && !selected.monthlyPrice ? (
              <div className="box-shape border border-accent/30 bg-accent/5 p-5">
                <p className="font-semibold tracking-tight">
                  Du behøver ikke en konto
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  Denne stander kører uden abonnement. Vælg farve, upload dit
                  logo og sæt linket — så sender vi skiltet. Der oprettes
                  hverken login eller dashboard.
                </p>
                <Link
                  href={`/bestil/uden-konto?produkt=${selected.slug}`}
                  className="mt-3 inline-block font-medium text-accent hover:underline"
                >
                  Bestil uden konto →
                </Link>
              </div>
            ) : spaerre === "cvr-mangler" ? (
              <div className="box-shape border border-secondary/50 bg-secondary/10 p-4 text-sm">
                <p className="font-bold tracking-tight">
                  Vi mangler dit CVR-nummer
                </p>
                <p className="mt-1 text-muted">
                  LoyalSum sælges kun til virksomheder — priserne er uden moms,
                  og der er ikke fortrydelsesret. Skriv nummeret under
                  Virksomhedsprofil, så er du klar til at bestille.
                </p>
                <Link
                  href="/dashboard/profil"
                  className="mt-3 inline-block font-medium text-accent hover:underline"
                >
                  Udfyld CVR-nummer →
                </Link>
              </div>
            ) : (
              <PurchaseNotice />
            )}

            {/* Antalsvælgeren er en PRISVISNING her, ikke en bestilling.
                Bestillingen har sin egen — og stod den her også, ville siden
                have to antalsfelter og to knapper, hvor den nederste sagde
                "Opret konto" til en, der var logget ind.

                Vises slet ikke, når designeren eller genbestillingen er på
                skærmen: de ejer både antallet og prisen. */}
            {gemt || viserDesigner ? null : (
              <QuantityOrder
                product={selected}
                initialQty={initialQty}
                mode={user ? "kun-pris" : "checkout"}
              />
            )}

            <Link href="/bestil" className="inline-block text-sm font-medium text-accent">
              ← Se alle produkter
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-10 text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                Bestil din stander
              </h1>
              <p className="mt-2 text-muted">
                Vælg det produkt der passer til din forretning — og hvor mange
                du skal bruge. Jo flere standere, jo lavere pris pr. stk.
              </p>
            </div>
            <Pricing />
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
