import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { IkonChip } from "@/components/ui/ikon-chip";
import {
  WebshopDuo,
  PointDuo,
  StempelDuo,
  BeloenningDuo,
  KundeDuo,
  SkjoldDuo,
} from "@/components/duotone-ikoner";
import { getProduct } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site";

/**
 * SEO-landingsside: LoyalSum til WooCommerce.
 *
 * HER ER WOOCOMMERCE HELE EMNET — og kun her og på Komplet Online. Resten af
 * sitet nævner integrationen dér, hvor den hjælper en køber, uden at gøre
 * LoyalSum til et WooCommerce-produkt.
 *
 * DER MÅ KUN STÅ DET, DER FINDES. Alt herunder er efterprøvet mod Commerce
 * API'et (`src/lib/commerce-api/*`, migration 0049) og pluginet
 * (`nem-media/loyalsum-integrations`, LoyalSum for WooCommerce 1.0.0):
 *   - point efter programmets egen regel (kroner pr. point eller point pr.
 *     køb); manuelle programmer optjener ikke i webshoppen (`targets.ts`)
 *   - ét stempel pr. betalt ordre, med et valgfrit minimum (`stempelTarget`)
 *   - grundlaget er varerne inkl. moms efter rabat; fragt og gebyrer tæller
 *     ikke, og refunderede varer trækkes fra (`beregnEligibleSpend`)
 *   - e-mail er nok til at OPTJENE, men at BRUGE kræver en bekræftet kobling;
 *     ventende optjening gemmes i 90 dage (`commerce_goer_krav`, FRISTER)
 *   - kun POINTbelønninger kan bruges i webshoppen (fast beløb eller procent),
 *     én pr. ordre, og som standard kun med online betaling (pluginets
 *     PaymentPolicy) — stempelkortets belønninger er ikke med i denne version
 *   - kun DKK, og belønninger kræver priser inkl. moms (pluginets readme)
 *   - pluginet hentes i dashboardet og er inkluderet i Komplet og Komplet
 *     Online (`kanHenteWooCommercePlugin` = `commerceIPlan`)
 * Skriv aldrig, at point "gives automatisk" uden betingelserne, at Shopify
 * eller andre systemer er understøttet, eller at pluginet kan hentes frit.
 */

const title = "Loyalitetsprogram til WooCommerce med point";
const description =
  "Giv dine WooCommerce-kunder point og stempler, når de handler, og lad dem bruge belønninger i kurven. Inkluderet i LoyalSum Komplet og Komplet Online.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "WooCommerce loyalitetsprogram",
    "loyalitetsprogram WooCommerce",
    "WooCommerce pointprogram",
    "WooCommerce loyalitetsplugin",
    "kundeklub WooCommerce",
    "belønningsprogram WooCommerce",
  ],
  alternates: { canonical: "/woocommerce-loyalitetsprogram" },
  openGraph: {
    type: "website",
    title: "Loyalitetsprogram til WooCommerce — LoyalSum",
    description,
    url: "/woocommerce-loyalitetsprogram",
  },
};

/* ------------------------------------------------------------------ data */

const TRIN = [
  {
    Icon: WebshopDuo,
    title: "Du forbinder webshoppen",
    body: "Du installerer pluginet LoyalSum for WooCommerce og forbinder det med en parringskode fra dit LoyalSum-dashboard. Det tager få minutter og kræver ingen udvikler.",
  },
  {
    Icon: PointDuo,
    title: "Du vælger, hvad der gælder online",
    body: "Du slår de programmer og belønninger til, der skal gælde i webshoppen. Et eksisterende program bliver aldrig af sig selv et webshopprogram.",
  },
  {
    Icon: StempelDuo,
    title: "Kunderne optjener, når de handler",
    body: "Betalte ordrer sendes til LoyalSum i baggrunden, og kunden får point eller stempler efter programmets egne regler — de samme som i butikken.",
  },
  {
    Icon: BeloenningDuo,
    title: "Kunderne bruger deres point i kurven",
    body: "En kunde, der har bekræftet sin e-mail, kan vælge en af dine pointbelønninger i kurven og få rabatten trukket direkte fra ordren.",
  },
];

const FAQ = [
  {
    q: "Hvad koster LoyalSum til WooCommerce?",
    a: "Pluginet koster ikke noget ekstra. Det er inkluderet i LoyalSum Komplet Online og LoyalSum Komplet, som er faste månedlige abonnementer uden binding. Du betaler altså for LoyalSum — ikke for selve WooCommerce-pluginet.",
  },
  {
    q: "Hvilke pakker indeholder WooCommerce-integrationen?",
    a: "LoyalSum Komplet Online og LoyalSum Komplet. Reviewstander og Reviewstander Pro har ikke integrationen, fordi de ikke har stempelkort og pointprogram.",
  },
  {
    q: "Hvor henter jeg pluginet?",
    a: "I dit LoyalSum-dashboard under Integrationer. Pluginet kan ikke hentes offentligt — det kræver et aktivt abonnement på LoyalSum Komplet eller Komplet Online, og det er ejeren af kontoen, der henter det og forbinder webshoppen.",
  },
  {
    q: "Optjener kunderne point for alle ordrer?",
    a: "For betalte ordrer, efter reglen i det program, du har slået til i webshoppen. Point regnes af varernes pris inkl. moms efter rabat — fragt og gebyrer tæller ikke med — og refunderede varer trækkes fra igen. Et program med manuel tildeling giver ikke point fra webshoppen.",
  },
  {
    q: "Kan kunderne også samle stempler fra webshopkøb?",
    a: "Ja. Slår du et stempelkort til i webshoppen, giver hver betalt ordre ét stempel. Du kan sætte et mindste ordrebeløb, så en meget lille ordre ikke tæller som et helt køb. Stempelkortets belønninger bruges dog ikke i webshoppen i denne version — dér er det pointbelønninger.",
  },
  {
    q: "Skal kunden oprette en konto i LoyalSum?",
    a: "Nej. Kunden optjener på sin e-mailadresse. For at bruge sine point i webshoppen klikker kunden på \"Brug mine LoyalSum-fordele\" under Min konto og bekræfter sin e-mail. Handler kunden, før hun har bekræftet, gemmes optjeningen i op til 90 dage og lægges på kortet, når hun bekræfter.",
  },
  {
    q: "Kan kunderne bruge point og belønninger fra butikken i webshoppen?",
    a: "Ja, når det er det samme program. Kunden har ét kort hos dig, og point optjent i butikken og i webshoppen står på samme saldo. Hvilke belønninger der kan bruges online, og hvad de er værd i kurven, bestemmer du i dashboardet.",
  },
  {
    q: "Hvilke betalingsmetoder kan bruges sammen med en belønning?",
    a: "Online betalingsmetoder. Bankoverførsel, check og efterkrav er som standard slået fra for ordrer med en belønning, fordi pointene ellers ville blive trukket, før pengene er kommet. Kunden kan stadig handle med de metoder — bare uden belønning.",
  },
  {
    q: "Hvilke krav er der til min webshop?",
    a: "WordPress 6.5 eller nyere, WooCommerce 8.2 eller nyere og PHP 7.4 eller nyere. Webshoppen skal bruge danske kroner, og for at belønninger kan bruges, skal priserne være indtastet inkl. moms. Pluginet virker med både den klassiske kurv og kassen og med WooCommerces blokke.",
  },
  {
    q: "Understøtter LoyalSum andre webshopsystemer end WooCommerce?",
    a: "Ikke i dag. WooCommerce er det eneste webshopsystem, LoyalSum kan forbindes med. Bruger du et andet system, kan du stadig dele dit LoyalSum-link og din QR-kode i webshoppen med LoyalSum Komplet Online.",
  },
];

/* ------------------------------------------------------------------- page */

export default function WooCommerceSide() {
  const online = getProduct("loyalsum-komplet-online");
  const komplet = getProduct("loyalsum-komplet");
  const base = getSiteUrl();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forside", item: base },
        {
          "@type": "ListItem",
          position: 2,
          name: "Loyalitetsprogram til WooCommerce",
          item: `${base}/woocommerce-loyalitetsprogram`,
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />

      <main id="indhold">
        {/* ------------------------------------------------------------ hero */}
        <section className="relative isolate overflow-hidden bg-dark px-4 py-16 text-white sm:py-20">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              backgroundImage:
                "radial-gradient(50% 55% at 76% 22%, rgba(26,144,137,0.16), transparent 64%), radial-gradient(55% 60% at 88% 4%, rgba(217,164,65,0.14), transparent 62%)",
            }}
          />
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-white/60">
              LoyalSum for WooCommerce
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Loyalitetsprogram til WooCommerce – få flere kunder til at handle
              igen
            </h1>
            <p className="mt-4 max-w-2xl leading-relaxed text-white/80">
              Med LoyalSum kan dine WooCommerce-kunder optjene point og
              stempler, når de handler i webshoppen, og bruge deres point som
              rabat direkte i kurven. Pluginet er inkluderet i LoyalSum Komplet
              Online og LoyalSum Komplet — og hvis du også har en fysisk butik,
              er det det samme kort i begge kanaler.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/loyalsum-komplet-online" size="lg">
                Se LoyalSum Komplet Online
              </ButtonLink>
              <ButtonLink
                href="#saadan-fungerer-det"
                size="lg"
                variant="outline-invert"
              >
                Sådan fungerer det
              </ButtonLink>
            </div>
            {online?.monthlyPrice ? (
              <p className="mt-4 text-sm text-white/60">
                Komplet Online koster {formatCurrency(online.monthlyPrice)}/md.
                ex moms. Pluginet er med i prisen. Ingen binding.
              </p>
            ) : null}
          </div>
        </section>

        {/* ----------------------------------------------- hvad er det */}
        <section className="border-t border-border px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hvad er et loyalitetsprogram til WooCommerce?
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Et loyalitetsprogram belønner kunder for at komme igen. I en
              webshop sker det typisk med point: kunden optjener point, når hun
              handler, og kan senere bruge dem som rabat. Nogle foretrækker et
              stempelkort i stedet — ti køb og en belønning — fordi det er
              lettere at forklare.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              WooCommerce har ikke et loyalitetsprogram indbygget, så det kræver
              et plugin. De fleste loyalitetsplugins til WooCommerce lever
              udelukkende inde i webshoppen: pointene findes kun dér, og
              programmet ved intet om de kunder, der handler i en fysisk
              butik, på et marked eller i et showroom.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              LoyalSum er bygget den anden vej rundt. Loyalitetsprogrammet bor i
              LoyalSum, og WooCommerce er én af kanalerne ind til det. Det
              betyder, at en ren webshop får et pointprogram, der virker i
              kurven, mens en forretning med både butik og webshop får ét
              program til begge — med samme regler, samme saldo og samme
              belønninger.
            </p>
          </div>
        </section>

        {/* ------------------------------------------ sådan fungerer det */}
        <section
          id="saadan-fungerer-det"
          className="sektion-skaer scroll-mt-24 border-t border-border bg-muted-bg px-4 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Sådan fungerer LoyalSum med WooCommerce
            </h2>
            <p className="mt-3 max-w-2xl text-muted">
              Fire trin fra installation til den første indløste belønning.
            </p>
            <ol className="mt-8 grid gap-6 sm:grid-cols-2">
              {TRIN.map((t, i) => (
                <li
                  key={t.title}
                  className="box-shape border border-border bg-card p-5 shadow-[var(--hoejde-1)]"
                >
                  <div className="flex items-start gap-4">
                    <IkonChip icon={t.Icon} size="lg" />
                    <div>
                      <p className="font-medium">
                        {i + 1}. {t.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {t.body}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">
              Kassen venter aldrig på LoyalSum: ordrerne sendes i baggrunden
              efter købet, og fejler forbindelsen et øjeblik, prøver pluginet
              igen af sig selv.
            </p>
          </div>
        </section>

        {/* ------------------------------------- pointprogram i webshoppen */}
        <section className="border-t border-border px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Pointprogram direkte i din WooCommerce-webshop
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Pointprogrammet opretter du i LoyalSum, præcis som en butik med
              en disk gør. Du vælger, hvordan kunderne optjener — for eksempel
              1 point pr. 10 kr. eller et fast antal point pr. køb — og hvilke
              belønninger pointene kan bruges til. Derefter slår du programmet
              til i webshoppen under Integrationer.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              Reglerne er programmets egne. Giver programmet 1 point pr. 10 kr.
              i butikken, giver det også 1 point pr. 10 kr. i webshoppen, og der
              rundes ned på samme måde. Du skal altså ikke vedligeholde to
              sæt regler, og kunden møder det samme program, uanset hvor hun
              handler.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              Der kan være ét pointprogram tilknyttet webshoppen ad gangen,
              fordi kunden skal kunne se én saldo. Har du flere pointprogrammer
              i LoyalSum, vælger du, hvilket der gælder online. Læs mere om{" "}
              <Link
                href="/loyalitetsprogram"
                className="font-medium text-accent hover:underline"
              >
                pointprogrammet i LoyalSum
              </Link>
              .
            </p>
          </div>
        </section>

        {/* ----------------------------------------- sådan optjener kunder */}
        <section className="sektion-skaer border-t border-border bg-muted-bg px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Sådan optjener kunder point
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Når en ordre er betalt, sender pluginet den til LoyalSum, og
              kunden får sine point efter programmets regel. Det kræver ingen
              handling fra hverken dig eller kunden.
            </p>

            <h3 className="mt-8 text-lg font-semibold">Hvad tæller med</h3>
            <p className="mt-2 leading-relaxed text-muted">
              Point regnes af varernes pris inkl. moms efter rabat. Fragt og
              gebyrer tæller ikke med, så kunden optjener på det, hun har købt —
              ikke på leveringen. En ordre, der endnu ikke er betalt, giver
              ingen point.
            </p>

            <h3 className="mt-8 text-lg font-semibold">
              Når en ordre refunderes
            </h3>
            <p className="mt-2 leading-relaxed text-muted">
              Refunderer du hele ordren eller en del af den, trækkes de point,
              der hører til de refunderede varer, fra igen. Saldoen passer
              dermed altid med det, kunden reelt har købt, og du skal ikke rette
              noget i hånden.
            </p>

            <h3 className="mt-8 text-lg font-semibold">
              Stempler for webshopordrer
            </h3>
            <p className="mt-2 leading-relaxed text-muted">
              Bruger du et stempelkort, kan du også slå det til i webshoppen.
              Så giver hver betalt ordre ét stempel. Du kan sætte et mindste
              ordrebeløb, for eksempel 100 kr., så en ordre på en enkelt lille
              vare ikke tæller som et helt besøg. Læs mere om{" "}
              <Link
                href="/stempelkort"
                className="font-medium text-accent hover:underline"
              >
                det digitale stempelkort
              </Link>
              .
            </p>

            <h3 className="mt-8 text-lg font-semibold">
              Kunder, der ikke har bekræftet endnu
            </h3>
            <p className="mt-2 leading-relaxed text-muted">
              LoyalSum genkender kunden på e-mailadressen fra ordren. Kender
              LoyalSum ikke kunden endnu, gemmes optjeningen i op til 90 dage og
              lægges på kundens kort, når hun bekræfter sin e-mail. Der oprettes
              ingen kunde i dit program, før kunden selv har sagt ja.
            </p>
          </div>
        </section>

        {/* ------------------------------------------- belønninger i kurven */}
        <section className="border-t border-border px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Sådan fungerer belønninger i webshoppen
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              At optjene kræver kun en e-mailadresse. At bruge point kræver
              lidt mere, og det er med vilje: pointene er kundens, og ingen
              skal kunne bruge dem bare ved at kende en e-mailadresse.
            </p>

            <h3 className="mt-8 text-lg font-semibold">
              Kunden kobler sin konto én gang
            </h3>
            <p className="mt-2 leading-relaxed text-muted">
              Under Min konto i webshoppen finder kunden en LoyalSum-sektion med
              knappen &ldquo;Brug mine LoyalSum-fordele&rdquo;. Hun modtager en
              mail fra LoyalSum og bekræfter, at det er hende. Derefter kan hun
              se sin saldo under Min konto og bruge sine point i kurven.
              Bekræftelsen er ikke en tilmelding til nyhedsbreve.
            </p>

            <h3 className="mt-8 text-lg font-semibold">
              Én belønning pr. ordre — direkte som rabat
            </h3>
            <p className="mt-2 leading-relaxed text-muted">
              I kurven vælger kunden én af de pointbelønninger, du har gjort
              tilgængelige i webshoppen. Du bestemmer, hvad hver belønning er
              værd online: et fast beløb eller en procentdel af kurven. Rabatten
              lægges på ordren, og pointene trækkes, når ordren er betalt. Indtil
              da er de kun sat af — bliver ordren annulleret, frigives de igen.
            </p>

            <h3 className="mt-8 text-lg font-semibold">
              Online betaling som standard
            </h3>
            <p className="mt-2 leading-relaxed text-muted">
              En belønning kan som standard kun bruges med online betaling.
              Bankoverførsel, check og efterkrav er slået fra for ordrer med en
              belønning, fordi pointene ellers ville blive trukket, før pengene
              er kommet. Kunden kan stadig vælge de metoder — bare uden
              belønning.
            </p>

            <h3 className="mt-8 text-lg font-semibold">
              Hvad der kan bruges i webshoppen
            </h3>
            <p className="mt-2 leading-relaxed text-muted">
              I denne version er det pointprogrammets belønninger, der kan
              bruges i kurven. Stempelkortets belønninger — for eksempel en
              gratis kop kaffe — indløses fortsat i butikken. Belønninger i
              webshoppen kræver, at priserne er indtastet inkl. moms, og at
              webshoppen bruger danske kroner.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------- samme kunderejse */}
        <section className="sektion-skaer border-t border-border bg-muted-bg px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              WooCommerce og LoyalSum i samme kunderejse
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              For kunden er der ét kort hos dig — ikke ét til webshoppen og ét
              til butikken. Det samme kort viser hendes point, stempler og
              belønninger, uanset hvor hun har optjent dem, og hun kan åbne det
              på telefonen uden at hente en app.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              For dig betyder det, at du ser hele kunden i ét dashboard: hvem
              der handler igen, hvilke belønninger der bliver brugt, og hvordan
              programmet udvikler sig. Kundens point i webshoppen er ikke en
              separat ø, men en del af den samme kunderelation.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              Resten af LoyalSum følger med: feedback, der når dig før en
              offentlig anmeldelse, overblik over dit omdømme og opslag lavet
              af dine bedste anmeldelser.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------- fysisk butik */}
        <section className="border-t border-border px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Har du også en fysisk butik?
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Så er LoyalSum særligt stærkt. Kunden scanner QR-koden på din
              stander ved disken, får sit kort på telefonen og samler point
              eller stempler, når hun handler i butikken. Når hun bagefter
              handler i webshoppen, er det det samme kort.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              Point, der er optjent i butikken, kan bruges i webshoppen og
              omvendt, så længe det er det samme program. Mens en belønning er
              lagt i en kurv online, er pointene sat af, så de ikke kan bruges
              to steder på samme tid.
            </p>
          </div>
        </section>

        {/* ----------------------------------- Komplet Online (primær) */}
        <section className="sektion-skaer border-t border-border bg-muted-bg px-4 py-16 sm:py-20">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-start">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                LoyalSum Komplet Online til WooCommerce-webshops
              </h2>
              <p className="mt-4 leading-relaxed text-muted">
                Driver du en webshop uden en disk at stille et skilt på, er{" "}
                <Link
                  href="/loyalsum-komplet-online"
                  className="font-medium text-accent hover:underline"
                >
                  LoyalSum Komplet Online
                </Link>{" "}
                den oplagte løsning. Du får hele LoyalSum-platformen uden fysisk
                stander, og WooCommerce-pluginet er med i prisen.
              </p>
              <p className="mt-4 leading-relaxed text-muted">
                Ud over integrationen får du dit eget LoyalSum-link og en
                QR-kode, som du kan bruge i nyhedsbreve, på kvitteringer og på
                sociale medier — så kunder, der ikke handler online lige nu,
                også kan finde vej til programmet.
              </p>
            </div>
            <div className="box-shape border border-accent/40 bg-card p-6 shadow-[var(--hoejde-2)]">
              <p className="font-medium">{online?.name}</p>
              <p className="mt-1 text-sm text-muted">
                Hele platformen — uden fysisk stander
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>✓ WooCommerce-plugin inkluderet</li>
                <li>✓ Pointprogram og digitalt stempelkort</li>
                <li>✓ Belønninger direkte i kurven</li>
                <li>✓ Feedback, kundescore og opslag</li>
                <li>✓ Dit eget LoyalSum-link og QR-kode</li>
              </ul>
              {online?.monthlyPrice ? (
                <p className="mt-4 text-sm text-muted">
                  {formatCurrency(online.monthlyPrice)}/md. ex moms · ingen
                  binding
                </p>
              ) : null}
              <ButtonLink
                href="/produkter/loyalsum-komplet-online"
                className="mt-5 w-full"
              >
                Se pris og kom i gang
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* ------------------------------------ Komplet (sekundær) */}
        <section className="border-t border-border px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              LoyalSum Komplet til virksomheder med både fysisk butik og webshop
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Har du både en butik og en webshop, giver{" "}
              <Link
                href="/produkter/loyalsum-komplet"
                className="font-medium text-accent hover:underline"
              >
                LoyalSum Komplet
              </Link>{" "}
              dig det hele: den samme platform og det samme WooCommerce-plugin,
              plus en fysisk stander med QR og NFC til disken. Kunderne
              tilmelder sig i butikken og optjener videre online.
            </p>
            {komplet?.monthlyPrice ? (
              <p className="mt-4 text-sm text-muted">
                LoyalSum Komplet koster{" "}
                {formatCurrency(komplet.price)} for standeren og{" "}
                {formatCurrency(komplet.monthlyPrice)}/md. ex moms for
                platformen.
              </p>
            ) : null}
          </div>
        </section>

        {/* ------------------------------------------------ installation */}
        <section className="sektion-skaer border-t border-border bg-muted-bg px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Installation af LoyalSum for WooCommerce
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Installationen foregår i WordPress, som med ethvert andet plugin.
              Det kræver ingen kode.
            </p>
            <ol className="mt-6 list-decimal space-y-3 pl-5 leading-relaxed text-muted">
              <li>
                <strong className="text-foreground">Vælg pakke.</strong> Køb
                LoyalSum Komplet Online eller LoyalSum Komplet.
              </li>
              <li>
                <strong className="text-foreground">Download pluginet.</strong>{" "}
                Log ind i dit LoyalSum-dashboard, gå til Integrationer, og klik
                &ldquo;Download WooCommerce-plugin&rdquo;.
              </li>
              <li>
                <strong className="text-foreground">Upload i WordPress.</strong>{" "}
                Gå til Plugins → Tilføj plugin → Upload plugin, og vælg filen.
              </li>
              <li>
                <strong className="text-foreground">Aktivér pluginet.</strong>{" "}
                Aktivér LoyalSum for WooCommerce.
              </li>
              <li>
                <strong className="text-foreground">
                  Opret en parringskode.
                </strong>{" "}
                Klik &ldquo;Hent parringskode&rdquo; under Integrationer i
                LoyalSum. Koden gælder i et kvarter og kan bruges én gang.
              </li>
              <li>
                <strong className="text-foreground">Forbind.</strong> Indsæt
                koden i WordPress under WooCommerce → LoyalSum og klik
                &ldquo;Forbind med LoyalSum&rdquo;. Slå derefter dine
                programmer og belønninger til i webshoppen.
              </li>
            </ol>
            <p className="mt-6 text-sm leading-relaxed text-muted">
              Krav: WordPress 6.5 eller nyere, WooCommerce 8.2 eller nyere og
              PHP 7.4 eller nyere. Pluginet virker med både den klassiske kurv
              og kasse og med WooCommerces blokke, og det understøtter
              WooCommerces nye ordrelagring (HPOS).
            </p>
          </div>
        </section>

        {/* ------------------------------------------------- sikkerhed */}
        <section className="border-t border-border px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center gap-3">
              <IkonChip icon={SkjoldDuo} size="lg" />
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Sikker forbindelse mellem WooCommerce og LoyalSum
              </h2>
            </div>
            <p className="mt-4 leading-relaxed text-muted">
              Hver webshop får sin egen nøgle, når den forbindes, og alt, hvad
              webshoppen sender til LoyalSum, er signeret med den. Nøglen vises
              aldrig, og den gemmes krypteret hos LoyalSum.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              Webshoppen sender kun det, loyalitet kræver: ordrens nummer,
              status og beløb, varelinjerne og kundens e-mailadresse. Ikke
              adresser, telefonnumre eller betalingsoplysninger. En ordre
              tilmelder aldrig kunden til markedsføring.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              Du kan afbryde forbindelsen fra dashboardet, når som helst.
              Kundernes point og historik bliver liggende i LoyalSum.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------ hvem passer */}
        <section className="sektion-skaer border-t border-border bg-muted-bg px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hvem passer løsningen til?
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <div className="flex items-center gap-3">
                  <IkonChip icon={KundeDuo} />
                  <p className="font-medium">Godt match</p>
                </div>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
                  <li>
                    WooCommerce-webshops, hvor kunderne handler igen inden for
                    måneder — mode, skønhed, kaffe, dyrefoder, hobby, vin
                  </li>
                  <li>
                    Forretninger med både butik og webshop, der vil have ét
                    program til begge
                  </li>
                  <li>
                    Webshops, der vil belønne gengangere uden at bygge en
                    kundeklub fra bunden
                  </li>
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <IkonChip icon={WebshopDuo} />
                  <p className="font-medium">Ikke det rette valg endnu</p>
                </div>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
                  <li>Webshops på Shopify eller andre systemer end WooCommerce</li>
                  <li>Webshops, der sælger i andre valutaer end danske kroner</li>
                  <li>
                    Webshops med priser ex moms, hvis kunderne skal kunne bruge
                    belønninger i kurven
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ FAQ */}
        <section className="border-t border-border px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ofte stillede spørgsmål om LoyalSum og WooCommerce
            </h2>
            <div className="mt-8 divide-y divide-border">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="trykmaal cursor-pointer list-none font-medium">
                    {item.q}
                  </summary>
                  <p className="mt-2 leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ CTA */}
        <section className="sektion-skaer border-t border-border bg-muted-bg px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Kom i gang med LoyalSum i din WooCommerce-webshop
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              Vælg Komplet Online, hvis du sælger online. Vælg Komplet, hvis du
              også har en butik med en disk.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/produkter/loyalsum-komplet-online" size="lg">
                Kom i gang med Komplet Online
              </ButtonLink>
              <ButtonLink
                href="/produkter/loyalsum-komplet"
                size="lg"
                variant="outline"
              >
                Se LoyalSum Komplet
              </ButtonLink>
            </div>
            <p className="mt-6 text-sm text-muted">
              Har du spørgsmål til din webshop?{" "}
              <Link
                href="/kontakt"
                className="font-medium text-accent hover:underline"
              >
                Skriv til os
              </Link>
              .
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
