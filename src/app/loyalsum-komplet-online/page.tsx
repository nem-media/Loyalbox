import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { getProduct } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site";
/*
  DUOTONE OG IKKE STREGER, FORDI IKONERNE HER STÅR I ET FELT. En tynd streg
  i et 44 px ikonfelt bliver en skygge af et ikon — reglen står i AGENTS.md.
  Sættet er samme 24-net og samme stregtykkelse som `illustrations.tsx`, så
  de to kan stå på hver sin side uden at ligne to huse.
*/
import {
  ScanDuo,
  KlikDuo,
  FeedbackDuo,
  StempelDuo,
  PointDuo,
  KundeDuo,
  OpslagDuo,
} from "@/components/duotone-ikoner";
import { IkonChip } from "@/components/ui/ikon-chip";
import { ProduktStribe } from "@/components/produkt-stribe";
import { KanalDiagram } from "@/components/kanal-diagram";

/**
 * Salgsside for LoyalSum Komplet Online.
 *
 * REGLEN FOR DENNE SIDE ER DEN SAMME SOM PÅ /stempelkort OG
 * /loyalitetsprogram: der må kun stå funktioner, der findes. Alt herunder er
 * efterprøvet i koden — platformens adgang (`includesLoyalSum` →
 * `hasLoyaltyAccess`), stempelkort og pointprogram (`/dashboard/loyalitet`),
 * feedback og kundescore, opslagene (`/dashboard/opslag`), det dynamiske link
 * og QR-koden (`/dashboard/standere/[id]`, `/r/<slug>`).
 *
 * SKRIV IKKE, AT LOYALSUM ER INTEGRERET MED EN WEBSHOP. Der findes ingen
 * Shopify- eller WooCommerce-integration, ingen ordreimport og ingen
 * automatisk pointtildeling fra et webshopkøb. Produktet er DIGITAL ADGANG:
 * kunden får et link og en QR-kode, som butikken selv deler. Formuleringen er
 * derfor altid "sammen med din webshop" og aldrig "integreret med".
 *
 * OG SKRIV IKKE, AT VI PUBLICERER PÅ SOCIALE MEDIER. Opslagsværktøjet laver
 * billedet og teksten; butikken henter det og deler det selv.
 */

const title = "LoyalSum Komplet Online — loyalitetsprogram uden stander";
const description =
  "Brug hele LoyalSum-platformen uden fysisk stander. Del dit loyalitetsprogram via hjemmeside, webshop, e-mail, QR-kode eller et direkte link.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "loyalitetsprogram til webshop",
    "loyalitetsprogram online",
    "digitalt loyalitetsprogram",
    "loyalitetssystem til webshop",
    "pointprogram til webshop",
    "kundeklub system",
  ],
  alternates: { canonical: "/loyalsum-komplet-online" },
  openGraph: {
    type: "website",
    title: "LoyalSum Komplet Online — hele LoyalSum uden fysisk stander",
    description,
    url: "/loyalsum-komplet-online",
  },
};

/* ------------------------------------------------------------------ data */

const TRIN = [
  {
    Icon: StempelDuo,
    title: "Du opretter LoyalSum",
    body: "Du får din egen konto og dit eget dashboard. Herfra sætter du op, hvad dine kunder skal møde: et stempelkort, et pointprogram eller begge dele.",
  },
  {
    Icon: ScanDuo,
    title: "Du får dit LoyalSum-link",
    body: "Hver LoyalSum-adresse har sit eget link og sin egen QR-kode. Du finder begge dele i dashboardet, kopierer linket med ét klik og henter QR-koden som billede.",
  },
  {
    Icon: OpslagDuo,
    title: "Du deler det, hvor du møder kunderne",
    body: "På din hjemmeside, i din webshop, i en mail, på en kvittering eller som QR på et opslag. Det er det samme link — du bestemmer selv hvor det står.",
  },
  {
    Icon: KlikDuo,
    title: "Kunden åbner LoyalSum",
    body: "Kunden lander på din LoyalSum-side, kan give feedback, tilmelde sig dit stempelkort eller pointprogram og se sine belønninger. Uden app og uden at oprette noget.",
  },
];

/** Adgangsvejene — alle sammen det SAMME link. */
const VEJE: readonly (readonly [string, string])[] = [
  ["Hjemmeside", "Sæt linket på en knap eller i menuen."],
  ["Webshop", "Brug linket på kundesiden eller i ordrebekræftelsen."],
  ["E-mail", "Skriv linket ind i nyhedsbrevet eller signaturen."],
  ["QR-kode", "Hent koden og sæt den på en flyer, en pose eller en plakat."],
  ["Sociale medier", "Del linket i et opslag eller i din profil."],
  ["Kvittering", "Læg linket eller koden i bunden af kvitteringen."],
];

const FUNKTIONER = [
  {
    Icon: StempelDuo,
    title: "Digitalt stempelkort",
    body: "Kunden samler stempler på telefonen, og personalet giver dem med ét scan. Du bestemmer antal og belønning.",
  },
  {
    Icon: PointDuo,
    title: "Pointprogram",
    body: "Kunden optjener point efter beløb eller pr. køb og vælger selv mellem dine belønninger.",
  },
  {
    Icon: FeedbackDuo,
    title: "Feedback og kundescore",
    body: "Utilfredse kunder når dig først — i din private indbakke — og du kan se din score og udvikling i dashboardet.",
  },
  {
    Icon: OpslagDuo,
    title: "Opslag til sociale medier",
    body: "Lav et delbart opslag ud af dine bedste anmeldelser: vælg tekst og baggrund, hent billedet og del det selv.",
  },
  {
    Icon: ScanDuo,
    title: "Dit eget link og din QR-kode",
    body: "Linket er dynamisk: du kan skifte, hvor det fører hen, uden at lave en ny QR-kode.",
  },
  {
    Icon: KundeDuo,
    title: "Kunder og medarbejdere",
    body: "Se dine kunder og deres aktivitet, og giv dine ansatte adgang til at stemple og indløse — uden at dele din egen kode.",
  },
];

const FAQ = [
  {
    q: "Hvad er forskellen på LoyalSum Komplet og LoyalSum Komplet Online?",
    a: "Softwaren er den samme — alle funktioner i LoyalSum Komplet er med i Komplet Online. Forskellen er den fysiske stander: med LoyalSum Komplet får du en stander med QR og NFC til disken, med Komplet Online får du platformen uden. Begge dele har det samme LoyalSum-link og den samme QR-kode.",
  },
  {
    q: "Hvordan får mine kunder adgang?",
    a: "Gennem dit LoyalSum-link eller din QR-kode. Du finder begge dele i dashboardet og deler dem, hvor du møder dine kunder — på hjemmesiden, i webshoppen, i mails eller på tryk. Kunden skal hverken hente en app eller oprette en konto først.",
  },
  {
    q: "Er LoyalSum integreret med min webshop?",
    a: "Nej. LoyalSum bruges sammen med din webshop, ikke inde i den: du lægger dit link eller din QR-kode dér, hvor kunderne ser det — for eksempel på kundesiden eller i ordrebekræftelsen. Der er ingen integration med Shopify, WooCommerce eller andre systemer, og ordrer overføres ikke automatisk.",
  },
  {
    q: "Optjener mine kunder så point automatisk, når de handler i webshoppen?",
    a: "Nej. Point og stempler gives af dig eller dine medarbejdere — ved disken eller fra dashboardet. Et køb i en webshop registreres ikke automatisk i LoyalSum.",
  },
  {
    q: "Kan jeg få en fysisk stander senere?",
    a: "Ja. Standeren er en ekstra adgangsvej og ikke en forudsætning: du kan købe et skilt til din LoyalSum-adresse, når du vil, og dit link og din QR-kode er de samme.",
  },
  {
    q: "Publicerer LoyalSum opslag på mine sociale medier?",
    a: "Nej. LoyalSum laver opslaget ud fra dine bedste anmeldelser — du vælger tekst og baggrund, henter billedet og deler det selv på de kanaler, du bruger.",
  },
  {
    q: "Hvem passer Komplet Online til?",
    a: "Virksomheder, der møder deres kunder digitalt eller ikke har en disk at stille en stander på: webshops, onlineforretninger, bookingsider, portaler, klinikker med onlinetid og alle, der hellere vil dele et link end sætte et skilt op.",
  },
  {
    q: "Hvad koster det?",
    a: "Komplet Online er et fast månedligt abonnement uden binding og uden engangspris for hardware — der er jo ingen stander. Se den aktuelle pris på produktsiden.",
  },
];

/* ------------------------------------------------------------------- page */

export default function KompletOnlinePage() {
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
          name: "LoyalSum Komplet Online",
          item: `${base}/loyalsum-komplet-online`,
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
        {/*
          Lyset kommer et sted fra — som i produktfotoet, hvor vinduet står
          til venstre og bordpladen fanger det. To radiale skær: husets beige
          som varme og logoets turkis bag panelet til højre, begge under 18 %.
        */}
        <section className="relative isolate overflow-hidden bg-dark px-4 py-16 text-white sm:py-20">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              backgroundImage:
                "radial-gradient(50% 55% at 76% 22%, rgba(26,144,137,0.16), transparent 64%), radial-gradient(55% 60% at 88% 4%, rgba(217,164,65,0.14), transparent 62%)",
            }}
          />
          <div className="mx-auto grid max-w-side gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-white/60">
                LoyalSum Komplet Online
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Hele LoyalSum — uden fysisk stander
              </h1>
              <p className="mt-4 max-w-xl leading-relaxed text-white/80">
                Brug LoyalSum via din hjemmeside, din webshop, dine mails, en
                QR-kode eller et direkte link. Du får præcis den samme
                platform som i LoyalSum Komplet — stempelkort, pointprogram,
                feedback, kundescore og opslag — bare uden skiltet til disken.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink
                  href="/produkter/loyalsum-komplet-online"
                  size="lg"
                >
                  Se pris og kom i gang
                </ButtonLink>
                <ButtonLink
                  href="/produkter/loyalsum-komplet"
                  size="lg"
                  variant="outline-invert"
                >
                  Eller se den med stander
                </ButtonLink>
              </div>
              {online?.monthlyPrice ? (
                <p className="mt-4 text-sm text-white/60">
                  {formatCurrency(online.monthlyPrice)}/md ex moms. Ingen
                  binding, ingen hardware.
                </p>
              ) : null}
            </div>

            {/* Linket, som kunden faktisk får at se i dashboardet. */}
            {/*
              PRODUKTET STÅR FØRST, OG DET ER PRÆCIS DET RIGTIGE BILLEDE.
              Varen ER platformen uden hardware, og der findes ét foto i
              huset, der viser netop dét: panelet på en skærm og kundens kort
              på en telefon, uden et skilt nogen steder. Heroen havde kun
              linkpanelet, altså en tegnet adresse — og en side, der sælger
              en platform, bør vise platformen.

              DER ER BEVIDST INGEN STANDER HER. Det er hele forskellen på
              Komplet og Komplet Online, og et skilt i baggrunden ville sige
              det modsatte af overskriften.

              `priority`, fordi det står over folden og er sidens
              LCP-element; målene er filens egne, så heroen ikke hopper.
            */}
            <div className="overflow-hidden rounded-[var(--radius-stor)] shadow-[var(--hoejde-foto)] ring-1 ring-white/12">
              <Image
                src="/loyalsum-komplet-online-dashboard-og-mobil.jpg"
                alt=""
                aria-hidden="true"
                width={1000}
                height={1250}
                sizes="(min-width: 1024px) 30rem, 92vw"
                priority
                className="h-auto w-full"
              />
            </div>

            {/* Frostet og ikke bare gennemsigtig: en lys inderkant foroven
                og en blød skygge under gør panelet til en flade, der ligger
                FORAN heroen, frem for et felt malet ned i den.

                Linkpanelet BLIVER — det er sidens egentlige løfte ("ét link,
                mange kanaler") og kan ikke fotograferes. Det ligger nu under
                billedet frem for i stedet for det. */}
            <div className="box-shape mt-5 border border-white/15 bg-white/[0.07] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_50px_-24px_rgba(0,0,0,0.6)] backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Dit LoyalSum-link
              </p>
              <p className="mt-2 break-all font-mono text-sm">
                loyalsum.dk/r/din-butik
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {["Hjemmeside", "Webshop", "E-mail", "QR", "Opslag"].map(
                  (v) => (
                    <span
                      key={v}
                      className="rounded-full bg-white/10 px-3 py-1 text-white/80"
                    >
                      {v}
                    </span>
                  ),
                )}
              </div>
              <p className="mt-4 text-sm text-white/70">
                Ét link. Du deler det, hvor du vil — og kan skifte, hvor det
                fører hen, uden at lave en ny QR-kode.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------- produkterne, lige her */}
        {/* Den købeklare skal ikke lede. Se ProduktStribe for hvorfor det er
            en stribe og ikke kataloggitteret. */}
        <ProduktStribe aktuel="loyalsum-komplet-online" />

        {/* -------------------------------------------- hvad er produktet */}
        <section className="border-t border-border px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hvad er LoyalSum Komplet Online?
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Det er hele LoyalSum-platformen uden det fysiske skilt. Du får dit
              eget dashboard, din egen LoyalSum-side og et link, du selv deler.
              Kunderne kan give feedback, samle stempler eller point og hente
              deres belønninger — på telefonen, uden app.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              Det er <strong>ikke</strong> en light-udgave: alle funktioner i
              LoyalSum Komplet er med. Det eneste, du ikke får, er standeren til
              disken — og den kan du købe senere, hvis du får brug for den.
            </p>
          </div>
        </section>

        {/* ----------------------------------------------- sådan fungerer det */}
        <section className="sektion-skaer border-t border-border bg-muted-bg px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Sådan fungerer det
            </h2>
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
          </div>
        </section>

        {/* ------------------------------------- én side, mange adgangsveje */}
        <section className="border-t border-border px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Én LoyalSum-side. Mange måder at dele den på.
            </h2>
            <p className="mt-3 max-w-2xl text-muted">
              Det er det samme link og den samme QR-kode hver gang. Hvor du
              lægger dem, bestemmer du selv.
            </p>
            {/*
              SEKS ENS KORT I ET GITTER SAGDE "SEKS TING", og pointen er den
              modsatte: ÉT link, der kan stå seks steder. Diagrammet sætter
              navet i midten og kanalerne omkring, så formen bærer det samme
              som overskriften. Teksten er uændret — den kommer stadig fra
              `VEJE` og er efterprøvet mod, hvad produktet kan.
            */}
            <div className="mt-10">
              <KanalDiagram kanaler={VEJE} link="loyalsum.dk/r/din-butik" />
            </div>
            <p className="mt-6 max-w-2xl text-sm text-muted">
              LoyalSum bruges <strong>sammen med</strong> din webshop — der er
              ingen integration med Shopify, WooCommerce eller andre systemer,
              og ordrer overføres ikke automatisk. Point og stempler gives af
              dig eller dine medarbejdere.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------- funktioner */}
        <section className="sektion-skaer border-t border-border bg-muted-bg px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Det, du får med
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FUNKTIONER.map((f) => (
                <div key={f.title}>
                  <IkonChip icon={f.Icon} size="lg" />
                  <p className="mt-3 font-medium">{f.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------ Komplet vs Komplet Online */}
        <section className="border-t border-border px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Med eller uden stander?
            </h2>
            <p className="mt-3 max-w-2xl text-muted">
              Softwaren er den samme. Forskellen er, hvordan kunderne møder
              den.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="box-shape border border-border bg-card p-6 shadow-[var(--hoejde-1)]">
                <p className="font-medium">{komplet?.name}</p>
                <p className="mt-1 text-sm text-muted">
                  Hele platformen + fysisk stander
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li>✓ Alle funktioner i platformen</li>
                  <li>✓ Fysisk stander med QR og NFC</li>
                  <li>✓ Dit eget link og din QR-kode</li>
                  <li>✓ Til disken, bordet eller receptionen</li>
                </ul>
                <Link
                  href="/produkter/loyalsum-komplet"
                  className="trykmaal mt-4 inline-block text-sm font-medium text-accent hover:underline"
                >
                  Se LoyalSum Komplet →
                </Link>
              </div>
              <div className="box-shape border border-accent/40 bg-card p-6 shadow-[var(--hoejde-2)]">
                <p className="font-medium">{online?.name}</p>
                <p className="mt-1 text-sm text-muted">
                  Hele platformen — uden fysisk stander
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li>✓ Alle funktioner i platformen</li>
                  <li>✓ Dit eget link og din QR-kode</li>
                  <li>✓ Til hjemmeside, webshop, mails og opslag</li>
                  <li className="text-muted">– Ingen fysisk stander</li>
                </ul>
                <Link
                  href="/produkter/loyalsum-komplet-online"
                  className="trykmaal mt-4 inline-block text-sm font-medium text-accent hover:underline"
                >
                  Se pris →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ FAQ */}
        <section className="sektion-skaer border-t border-border bg-muted-bg px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ofte stillede spørgsmål
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
        <section className="border-t border-border px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Kom i gang med LoyalSum Komplet Online
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              Samme platform som LoyalSum Komplet — du deler den bare selv.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/produkter/loyalsum-komplet-online" size="lg">
                Se pris og kom i gang
              </ButtonLink>
              <ButtonLink href="/kontakt" size="lg" variant="outline">
                Spørg os
              </ButtonLink>
            </div>
            <p className="mt-6 text-sm text-muted">
              Skal du bruge en stander til disken?{" "}
              <Link
                href="/produkter/loyalsum-komplet"
                className="font-medium text-accent hover:underline"
              >
                Se LoyalSum Komplet
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
