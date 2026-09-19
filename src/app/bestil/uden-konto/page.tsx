import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BestilUdenKontoForm } from "./bestil-form";
import { KanIkkeBestilles } from "@/components/kan-ikke-bestilles";
import { getProduct } from "@/lib/constants";
import { koebSpaerreUdenKonto, kanBestillesUdenKonto } from "@/lib/commerce";
import { createAdminClient } from "@/lib/supabase/admin";
import { laesGendanNoegle } from "@/lib/gendan-noegle";
import { valgtDestination } from "@/lib/stands";
import { erStanderFarve, STANDARD_STANDERFARVE } from "@/lib/stander-tilvalg";
import type { FortrudtBestilling } from "@/lib/bestilling-uden-konto";

export const metadata = {
  title: "Bestil uden konto",
  description:
    "Bestil din reviewstander med logo og eget link. Ingen konto, intet abonnement — skiltet sendes til dig.",
  alternates: { canonical: "/bestil/uden-konto" },
};

/**
 * HENTER DET, KUNDEN HAVDE LAVET, DA DE FORTRØD HOS STRIPE.
 *
 * Bestillingen uden konto opretter virksomhed, design, stander og ordre FØR
 * betalingen — prisen afhænger af valgene. Fortrød kunden, landede de før på
 * en TOM formular og skulle taste det hele forfra, mens det lå i basen hele
 * tiden. Nu bærer fortryd-adressen en nøgle, og den åbner netop dét.
 *
 * ALLE FIRE OPSLAG HAR EJERSKABET MED I FORESPØRGSLEN og ikke som et tjek
 * bagefter: nøglen siger både hvilket design og hvilken virksomhed, og de skal
 * passe sammen. En nøgle til et design, der siden er ryddet, giver null — og
 * så er siden bare den almindelige, tomme bestilling. En gammel adresse skal
 * ikke være en blindgyde.
 */
async function hentFortrudt(
  noegle: string | undefined,
): Promise<FortrudtBestilling | null> {
  if (!noegle) return null;
  const laest = laesGendanNoegle(noegle);
  if (!laest) return null;

  const admin = createAdminClient();

  const { data: design } = await admin
    .from("designs")
    .select(
      "id, stander_farve, front_type, front_hex, accent_hex, logo_url, logo_filnavn",
    )
    .eq("id", laest.designId)
    .eq("company_id", laest.companyId)
    .maybeSingle();

  if (!design) return null;

  const { data: firma } = await admin
    .from("companies")
    .select("name, cvr, contact_email")
    .eq("id", laest.companyId)
    .maybeSingle();

  if (!firma) return null;

  /*
   * LINKET, QR-KODEN SKAL PEGE PÅ, står på STANDEREN og ikke på designet — og
   * vejen derhen går gennem ordren, som er det eneste sted, de to er bundet
   * sammen. Det er også det felt, der er dyrest at taste igen: en Google-URL
   * er lang, og den skal være rigtig, for den trykkes.
   */
  const { data: ordre } = await admin
    .from("orders")
    .select("stand_id")
    .eq("design_id", design.id)
    .eq("company_id", laest.companyId)
    .maybeSingle();

  const { data: stand } = ordre?.stand_id
    ? await admin
        .from("stands")
        .select(
          "destination_type, google_review_url, trustpilot_url, facebook_url, custom_url",
        )
        .eq("id", ordre.stand_id)
        .eq("company_id", laest.companyId)
        .maybeSingle()
    : { data: null };

  return {
    noegle,
    firmanavn: firma.name ?? "",
    cvr: firma.cvr ?? "",
    email: firma.contact_email ?? "",
    // Farven kom fra basen og ikke fra vores egen liste, så den PRØVES.
    // Er den ukendt, er hvid det sikreste sted at lande — samme valg som
    // `laesValg()` træffer for de øvrige felter.
    standerFarve: erStanderFarve(design.stander_farve)
      ? design.stander_farve
      : STANDARD_STANDERFARVE,
    egenFrontfarve: design.front_type === "egen",
    frontHex: design.front_hex,
    accentHex: design.accent_hex,
    logoUrl: design.logo_url,
    logoNavn: design.logo_filnavn,
    destination: stand ? valgtDestination(stand) : undefined,
  };
}

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
  searchParams: Promise<{
    produkt?: string;
    antal?: string;
    /**
     * Nøglen fra Stripes fortryd-adresse. Se `cancel_url` i `actions.ts` og
     * begrundelsen for signaturen i `gendan-noegle.ts`.
     */
    gendan?: string;
  }>;
}) {
  const { produkt, antal, gendan } = await searchParams;

  // Reglen for, hvad der overhovedet må bestilles uden konto, ligger ÉT sted
  // — samme funktion, som `/bestil` sender kunden herhen efter. Falder ingen
  // slug med, er det Reviewstander.
  const product = getProduct(produkt ?? "reviewstander");
  if (!kanBestillesUdenKonto(product)) notFound();

  const fortrudt = await hentFortrudt(gendan);

  return (
    <>
      <SiteHeader />
      {/* Bredden følger indholdet: bestillingen er to spalter fra `lg`, og
          `max-w-lg` gjorde den til én bane på en halv skærm. Overskriften er
          venstrestillet over gitteret frem for centreret — den hører til
          venstre spalte, hvor man begynder. */}
      <main id="indhold" className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight">
          Bestil din {product.name.toLowerCase()}
        </h1>
        <p className="mt-2 max-w-xl leading-relaxed text-muted">
          {fortrudt
            ? "Betalingen blev ikke gennemført, men alt, du havde valgt, er her stadig. Ret det, du vil, og fortsæt til betalingen."
            : "Ingen konto, intet abonnement. Vælg farve, upload dit logo, og sæt linket QR-koden skal føre til — så sender vi skiltet."}
        </p>

        {/*
          BESKEDEN STÅR OVER FORMULAREN, ikke i stedet for den — præcis som på
          produktsiden og /bestil. Før valgte siden mellem de to på `canSell()`,
          som siger ja i testtilstand, og så var det ENESTE sted på sitet, hvor
          en besøgende fik at vide, at de godt kunne købe. Betalingsknappen
          førte til en sandbox, der afviste deres rigtige kort uden forklaring.

          Formularen bliver stående, så flowet kan afprøves fra en testkonto:
          handlingen spørger den samme regel igen med den INDTASTEDE e-mail.
        */}
        <div className="mt-8">
          {koebSpaerreUdenKonto(product) ? (
            <KanIkkeBestilles className="mb-6" />
          ) : null}
          <BestilUdenKontoForm
            product={product}
            initialQty={Number(antal) || 1}
            fortrudt={fortrudt}
          />
        </div>

        <p className="mt-10 max-w-xl text-sm text-muted">
          Skal du bruge statistik, feedback-indbakke, digitalt stempelkort
          eller pointprogram?{" "}
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
