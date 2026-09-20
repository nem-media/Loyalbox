import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Pricing } from "@/components/pricing";
import { QuantityOrder } from "@/components/quantity-order";
import {
  PRODUCTS,
  getProduct,
  LEVERINGSLAND_NAVN,
  harFysiskSkilt,
} from "@/lib/constants";
import { StanderDesigner } from "@/components/stander-designer";
import {
  GenbestilDesign,
  type GemtDesign,
} from "@/components/genbestil-design";
import { createAdminClient } from "@/lib/supabase/admin";
import { kraeverDestination, kanBestillesUdenKonto } from "@/lib/commerce";
import { enesteAdresse } from "@/lib/abonnement";
import { valgtDestination } from "@/lib/stands";
import type { DestinationType } from "@/lib/types/database";
import { designFrontfarve } from "@/lib/design";
import { Badge } from "@/components/ui/badge";
import { KanIkkeBestilles } from "@/components/kan-ikke-bestilles";
import { SkiftAbonnement } from "@/components/skift-abonnement";
import { ButtonLink } from "@/components/ui/button";
import { CheckoutButton } from "@/components/checkout-button";
import { getCurrentUser } from "@/lib/auth";
import { koebSpaerre } from "@/lib/commerce";
import { requiresDpa } from "@/lib/dpa";

/*
  TITLEN SKAL DÆKKE ALLE FIRE VARER. Der stod "Bestil din stander", og siden
  viser nu også LoyalSum Komplet Online, som ikke har en. Søgeresultatet er
  det første, kunden ser, og et løfte om en stander dér er forkert for en
  fjerdedel af det, siden sælger.
*/
export const metadata = {
  title: "Bestil LoyalSum",
  description:
    "Vælg mellem tre reviewstandere med mængderabat og LoyalSum Komplet Online uden fysisk stander. Digitalt stempelkort og pointprogram på de to største.",
  alternates: { canonical: "/bestil" },
};

/**
 * Butikkens ene adresse — eller null, hvis der ikke er præcis én.
 *
 * Reglen selv ligger i `enesteAdresse()`, så den kan prøves uden database.
 * Her er kun opslaget. `limit(2)` fordi vi ikke skal bruge flere end det:
 * svaret er alligevel null, så snart der er to.
 */
async function enesteAdresseFor(
  companyId: string | undefined,
): Promise<string | undefined> {
  if (!companyId) return undefined;
  const { data } = await createAdminClient()
    .from("stands")
    .select("id")
    .eq("company_id", companyId)
    .limit(2);
  return enesteAdresse((data ?? []).map((s) => s.id)) ?? undefined;
}

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
      "id, navn, stander_farve, front_type, front_hex, accent_hex, logo_url, frontfarve_betalt",
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
    front_type: data.front_type,
    accent_hex: data.accent_hex,
    logo_url: data.logo_url,
    frontfarve_betalt: data.frontfarve_betalt,
    egen_frontfarve: front.egen,
  };
}

/**
 * Standerens nuværende destination, hvis den har en.
 *
 * Ejerskabet ligger i forespørgslen: et stand-id fra en anden butik giver
 * ingen række og dermed ingen forudfyldning.
 */
async function hentStandDestination(
  standId: string,
  companyId: string,
): Promise<{ type: DestinationType; url: string } | undefined> {
  const { data } = await createAdminClient()
    .from("stands")
    .select(
      "destination_type, google_review_url, trustpilot_url, facebook_url, custom_url",
    )
    .eq("id", standId)
    .eq("company_id", companyId)
    .maybeSingle();

  // Kolonnevalget ligger i `valgtDestination` — ét sted for begge de to
  // bestillingsveje. Her stod den samme ternær i sin egen udgave.
  return data ? valgtDestination(data) : undefined;
}

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{
    produkt?: string;
    antal?: string;
    design?: string;
    /** Sat af Stripes fortryd-adresse. Se `cancel_url` i /api/checkout. */
    fortrudt?: string;
    /**
     * Standeren, skiltet skal trykkes med (0022).
     *
     * Foelger med fra `/dashboard/standere/<id>`. Vaerdien sendes videre til
     * `/api/checkout`, der KONTROLLERER ejerskabet — her bruges den kun til
     * at faa den med igennem, saa siden ikke behoever at slaa noget op.
     */
    stand?: string;
  }>;
}) {
  const {
    produkt,
    antal,
    design: designId,
    fortrudt,
    stand: standId,
  } = await searchParams;
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

  /**
   * Skal kunden oplyse, hvad skiltet peger på?
   *
   * Reglen ligger i `kraeverDestination()` — samme funktion, som
   * `/api/checkout` håndhæver. Vises feltet uden at være krævet (eller
   * omvendt), opdager kunden det først ved betalingen.
   */
  const skalHaveDestination = kraeverDestination(selected, user?.company);

  /**
   * Har standeren allerede en destination, forudfyldes den.
   *
   * Kunden har måske sat linket på standersiden før bestillingen, og at
   * bede om det igen ville se ud, som om vi ikke havde gemt det.
   */
  const standDest =
    skalHaveDestination && standId && user?.company
      ? await hentStandDestination(standId, user.company.id)
      : undefined;

  /*
   * HVILKEN ADRESSE SKAL SKILTET PEGE PÅ?
   *
   * Kommer kunden fra standerens egen side, står den i adressen. Kommer
   * de fra 'Mangler du et skilt?', gør den ikke — og så fik ordren
   * ingen stander, og produktionen måtte spørge kunden, hvad der skulle
   * trykkes. Med én adresse pr. abonnement er der præcis ét svar.
   */
  const standTilTryk = standId ?? (await enesteAdresseFor(user?.company?.id));

  const spaerre = koebSpaerre(user, selected);

  /*
   * EN VARE UDEN ABONNEMENT HAR INTET AT HENTE PÅ DENNE SIDE.
   *
   * Her stod før et kort med overskriften "Du behøver ikke en konto" og et
   * link videre. Det var et klik, der ikke oplyste noget: kunden havde lige
   * set prisen og trykket "Tilpas og bestil", og næste side siger det samme
   * med sin egen overskrift. Nu sendes de direkte derhen.
   *
   * BETINGELSEN ER PRÆCIS DEN GAMLE GREN, så ingen andre flyttes: kun en
   * besøgende UDEN virksomhed, og kun for en vare uden abonnement. En
   * indlogget butik falder aldrig herned — de skal have designeren, og
   * bestillingen uden konto ville oprette en virksomhed ved siden af deres
   * egen og blive afvist på CVR'et.
   */
  if (
    selected &&
    spaerre === "ingen-virksomhed" &&
    kanBestillesUdenKonto(selected)
  ) {
    // Antallet følger med. Uden det ville kunden vælge 3 på produktsiden og
    // møde en formular, der stod på 1.
    redirect(`/bestil/uden-konto?produkt=${selected.slug}&antal=${initialQty}`);
  }

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

  /**
   * Er det den brede designer, der kommer på skærmen?
   *
   * `viserDesigner` er også sand ved en GENBESTILLING, hvor `GenbestilDesign`
   * vises i stedet — og den er en smal blok. Brugt til bredden ville siden
   * blive fem gange bredere end sit indhold.
   */
  const brugBredSide = viserDesigner && !gemt;

  return (
    <>
      <SiteHeader />
      <main id="indhold" className="mx-auto max-w-side px-4 py-16">
        {selected ? (
          /*
           * BREDDEN FØLGER INDHOLDET. Designeren er to spalter fra `lg`, og
           * `max-w-lg` ville presse den ned i én bane igen. De øvrige grene —
           * "Klar til betaling", ventelisten, prisvisningen — er smalle
           * tekstblokke, der ser forkerte ud i fuld bredde, så de beholder
           * deres mål.
           */
          <div
            className={`mx-auto space-y-5 ${
              brugBredSide ? "max-w-5xl" : "max-w-lg"
            }`}
          >
            <div className="max-w-xl">
              <Badge tone="accent">Valgt produkt</Badge>
              <h1 className="mt-3 text-2xl font-bold tracking-tight">
                {selected.name}
              </h1>
              <p className="mt-1 text-muted">{selected.tagline}</p>
            </div>

            <ul className="max-w-xl space-y-1 text-sm text-muted">
              {selected.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>

            {gemt ? (
              <GenbestilDesign
                product={selected}
                design={gemt}
                fortrudt={fortrudt === "1"}
                kraeverDpa={requiresDpa(selected)}
                standId={standTilTryk}
                kraeverDestination={skalHaveDestination}
                destinationStart={standDest}
              />
            ) : spaerre === null &&
              harFysiskSkilt(selected) &&
              user?.company ? (
              <StanderDesigner
                product={selected}
                companyId={user.company.id}
                initialQty={initialQty}
                kraeverDpa={requiresDpa(selected)}
                standId={standTilTryk}
                kraeverDestination={skalHaveDestination}
                destinationStart={standDest}
              />
            ) : spaerre === null ? (
              <div className="box-shape border border-accent/30 bg-accent/5 p-4">
                <p className="text-sm font-medium">Klar til betaling</p>
                {/*
                  TEKSTEN SKAL PASSE PÅ DEN VARE, DER ER VALGT. En digital vare
                  har ingen stander at betale for, og sætningen "du betaler
                  standeren nu" ville være det første, kunden læste — lige før
                  de betalte for noget andet.
                */}
                <p className="mt-1 mb-3 text-sm text-muted">
                  {harFysiskSkilt(selected)
                    ? "Du betaler standeren og den første måned nu. Derefter trækkes abonnementet automatisk samme dato hver måned."
                    : "Der er ingen stander og ingen engangspris. Du betaler den første måned nu, og derefter trækkes abonnementet automatisk samme dato hver måned."}
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
                  {harFysiskSkilt(selected)
                    ? `Vi leverer i ${LEVERINGSLAND_NAVN}. `
                    : ""}
                  Priserne er ex moms, og der er ikke fortrydelsesret ved
                  erhvervskøb.
                </p>
              </div>
            ) : spaerre === "nedgradering" || spaerre === "har-den-allerede" ? (
              /*
                ET SKIFTE, KUNDEN IKKE MÅ TAGE SELV. Beskeden hører til
                her og ikke i en skjult knap: kunden har netop klikket
                sig hertil og skal kunne læse hvorfor — og hvad de så
                gør i stedet.
              */
              <SkiftAbonnement
                grund={spaerre}
                vare={selected.name}
                nuvaerende={
                  getProduct(user?.company?.product_slug ?? "")?.name ??
                  "dit nuværende abonnement"
                }
              />
            ) : spaerre === "ikke-aabnet" ? (
              <KanIkkeBestilles />
            ) : selected.addon ? (
              /*
                EN GREN FOR HVER GRUND. Grunden til at spærren svarer nej
                er ikke den samme, og beskeden må ikke være det heller.
              */
              <div className="box-shape border border-border bg-card p-4">
                <p className="text-sm font-medium">
                  Log ind for at bestille denne vare
                </p>
                <p className="mt-1 text-sm text-muted">
                  Tilkøb hører til en butik, der allerede er kunde, og bestilles
                  fra dit dashboard.
                </p>
                <ButtonLink href="/login" size="sm" className="mt-3">
                  Log ind
                </ButtonLink>
              </div>
            ) : (
              /*
                EN VARE, DER KRÆVER EN KONTO — MEN IKKE ER ET TILKØB.
                Her stod tilkøbets besked for ALLE, og den var sand, så længe
                kataloget havde tre varer: hertil kom man kun med
                "ingen-virksomhed" på noget, der ikke kan købes uden konto, og
                dét var kun "Ekstra stander". LoyalSum Komplet Online brød
                antagelsen — den er en helt almindelig vare for en helt ny
                kunde, og den kan ikke købes gennem skiltflowet, fordi der
                ikke er noget at trykke og sende.

                MÅLT som udlogget gæst: siden sagde "Tilkøb hører til en
                butik, der allerede er kunde" til netop den kunde, varen er
                lavet til — en, der endnu ikke HAR en butik hos os. Beskeden
                sendte dem til login, som de ikke kan bruge.

                Grenen spørger `addon` og ikke varens navn, så den næste
                digitale vare ikke arver fejlen.
              */
              <div className="box-shape border border-border bg-card p-4">
                <p className="text-sm font-medium">Opret din butik først</p>
                <p className="mt-1 text-sm text-muted">
                  Der er ingen stander at sende — hele varen er din egen side
                  hos os, og den skal findes, før abonnementet kan sættes i
                  gang. Opret butikken nedenfor, eller log ind, hvis du
                  allerede har en.
                </p>
                <ButtonLink href="/login" size="sm" className="mt-3">
                  Log ind
                </ButtonLink>
              </div>
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

            <Link
              href="/bestil"
              className="inline-block text-sm font-medium text-accent"
            >
              ← Se alle produkter
            </Link>
          </div>
        ) : (
          <>
            {/*
              OVERSKRIFTEN SKAL DÆKKE ALLE FIRE KORT. Der stod "Bestil din
              stander", og det var sandt, så længe sektionen kun viste de tre
              med et skilt. Nu står LoyalSum Komplet Online der også, og en
              overskrift, der lover en stander over et kort, der siger "uden
              fysisk stander", er det første, kunden læser.
            */}
            <div className="mb-10 text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                Vælg det, der passer til din forretning
              </h1>
              <p className="mt-2 text-muted">
                Tre standere til disken og hele platformen uden skilt. Skal du
                bruge flere standere, falder prisen pr. stk.
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
