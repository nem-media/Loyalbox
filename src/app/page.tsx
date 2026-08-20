import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { HeroVisual } from "@/components/home/hero-visual";
import { LoyalsumLoop } from "@/components/home/loyalsum-loop";
import { PlatformShowcase } from "@/components/home/platform-showcase";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site";
import {
  SetupIcon,
  InviteIcon,
  AutomationIcon,
} from "@/components/illustrations";

/* ------------------------------------------------------------------ icons */

function Svg({
  children,
  className = "h-6 w-6",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const IconCheck = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
    aria-hidden="true"
  >
    <path d="M5 12l4.5 4.5L19 7" />
  </svg>
);

const IconMagnet = (
  <Svg>
    <path d="M6 4v8a6 6 0 0 0 12 0V4" />
    <path d="M6 9h4M14 9h4" />
  </Svg>
);

const IconRepeat = (
  <Svg>
    <path d="M4 11a7 7 0 0 1 11.9-5L20 9" />
    <path d="M20 4v5h-5" />
    <path d="M20 13a7 7 0 0 1-11.9 5L4 15" />
    <path d="M4 20v-5h5" />
  </Svg>
);

/**
 * Modstykket til fluebenet. Listerne med flueben er sidens sprog for "det du
 * får"; den her linje handler om det, du mister, og skal derfor kunne læses
 * som det modsatte uden at nogen skal tænke over det.
 */
const IconCross = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
    aria-hidden="true"
  >
    <path d="M7 7l10 10M17 7L7 17" />
  </svg>
);

const IconAlert = (
  <Svg>
    <path d="M10.3 4.3 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </Svg>
);

/** Samme tegninger i det format, brancheikonerne bruger. */
function SvgLille({ children }: { children: React.ReactNode }) {
  return <Svg className="h-[1.15rem] w-[1.15rem]">{children}</Svg>;
}

/* ------------------------------------------------------------------- data */

const UDEN_SYSTEM = [
  "De glade kunder glemmer at anmelde dig.",
  "De utilfredse siger det først offentligt.",
  "Førstegangskunderne kommer aldrig igen.",
  "Og du kan ikke se, hvad der egentlig virker.",
];

const SETUP_STEPS = [
  {
    Icon: SetupIcon,
    title: "Sæt LoyalSum op",
    body: "Vi hjælper dig i gang med din forretning, dine anmeldelseslinks, dit loyalitetsprogram og din branding.",
  },
  {
    Icon: InviteIcon,
    title: "Invitér kunderne ind",
    body: "Kunderne møder LoyalSum gennem QR, NFC, links og de kontaktpunkter, du allerede har i forvejen.",
  },
  {
    Icon: AutomationIcon,
    title: "LoyalSum arbejder videre",
    body: "Anmeldelser, feedback, genbesøg, opslag og indsigt løber ind ét sted — også når du har travlt.",
  },
];

/**
 * Brancherne med hvert sit ikon.
 *
 * Ikonet gør mere end at pynte: den besøgende skal kunne SCANNE rækken og
 * finde sig selv, og en form fanges hurtigere end et ord. Uden dem var det ni
 * ens tekstbobler, man læser fra ende til anden.
 *
 * Tegnet i samme stregstil som sidens øvrige ikoner (24 px, stregtykkelse 1,8)
 * og ikke hentet fra et bibliotek — et blandet ikonsæt er dét, der får en side
 * til at ligne noget, der er klippet sammen.
 */
const INDUSTRIES: { navn: string; ikon: React.ReactNode }[] = [
  {
    navn: "Café",
    ikon: (
      <SvgLille>
        <path d="M4 8h11v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" />
        <path d="M15 9.5h2a2.5 2.5 0 0 1 0 5h-2" />
        <path d="M7.5 2.5v2M11 2.5v2" />
      </SvgLille>
    ),
  },
  {
    navn: "Restaurant",
    ikon: (
      <SvgLille>
        <path d="M6 3v5a2 2 0 0 0 4 0V3" />
        <path d="M8 3v18" />
        <path d="M20 13.5h-2.2a2 2 0 0 1-2-2V7.8A4.8 4.8 0 0 1 20 3v10.5Z" />
        <path d="M20 13.5V21" />
      </SvgLille>
    ),
  },
  {
    navn: "Takeaway",
    ikon: (
      <SvgLille>
        <path d="M5 8h14l-1.1 11.9a1.2 1.2 0 0 1-1.2 1.1H7.3a1.2 1.2 0 0 1-1.2-1.1L5 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </SvgLille>
    ),
  },
  {
    navn: "Frisør",
    ikon: (
      <SvgLille>
        <circle cx="6.5" cy="17.5" r="2.6" />
        <circle cx="17.5" cy="17.5" r="2.6" />
        <path d="M8.3 15.7 19 4M15.7 15.7 5 4" />
      </SvgLille>
    ),
  },
  {
    navn: "Skønhedsklinik",
    ikon: (
      <SvgLille>
        <path d="M11 3.5 12.7 8.3 17.5 10 12.7 11.7 11 16.5 9.3 11.7 4.5 10 9.3 8.3 11 3.5Z" />
        <path d="M17.5 15.5 18.4 17.6 20.5 18.5 18.4 19.4 17.5 21.5 16.6 19.4 14.5 18.5 16.6 17.6 17.5 15.5Z" />
      </SvgLille>
    ),
  },
  {
    navn: "Klinik",
    ikon: (
      <SvgLille>
        <path d="M9.5 3h5v6.5H21v5h-6.5V21h-5v-6.5H3v-5h6.5V3Z" />
      </SvgLille>
    ),
  },
  {
    navn: "Butik",
    ikon: (
      <SvgLille>
        <path d="M4.5 9.5h15V20a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V9.5Z" />
        <path d="M3 9.5 4.6 4h14.8L21 9.5" />
        <path d="M9.8 21v-6h4.4v6" />
      </SvgLille>
    ),
  },
  {
    navn: "Værksted",
    ikon: (
      <SvgLille>
        <path d="M15.2 3a5.6 5.6 0 0 0-5 8.1L3.6 17.7a2 2 0 0 0 2.8 2.8l6.6-6.6a5.6 5.6 0 0 0 7.2-6.7l-3.1 3.1-2.9-.8-.8-2.9 3.1-3.1A5.6 5.6 0 0 0 15.2 3Z" />
      </SvgLille>
    ),
  },
  {
    navn: "Fitness",
    ikon: (
      <SvgLille>
        <path d="M4 8.5v7M7.5 5v14M16.5 5v14M20 8.5v7M7.5 12h9" />
      </SvgLille>
    ),
  },
];

const NEW_CUSTOMERS = [
  "Flere anmeldelser",
  "Større troværdighed online",
  "Løbende synlighed",
  "Færdige opslag til sociale medier",
  "Mere aktivitet omkring forretningen",
];

const RETURNING_CUSTOMERS = [
  "Digitale stempelkort",
  "Belønninger og tilbud",
  "Privat feedback du kan handle på",
  "Stærkere kunderelationer",
  "Flere genbesøg pr. kunde",
];

/* ------------------------------------------------------------------- page */

export default function LandingPage() {
  const base = getSiteUrl();
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: base,
    // Mørk variant: strukturdata-logoer vises på hvid baggrund hos Google.
    logo: `${base}/loyalsum-logo-dark.png`,
    description: SITE_TAGLINE,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <SiteHeader />

      <main>
        {/* ---------------------------------------------------------- hero */}
        {/* Ingen baggrundsfoto her: hero-cafe.jpg viser en reviewstander og
            hører hjemme på /reviewstander. En ren gradient holder heroen om
            platformen — og sparer et stort billede over folden. */}
        <section className="relative isolate overflow-hidden bg-dark text-dark-fg">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              backgroundImage:
                "radial-gradient(60% 60% at 78% 12%, rgba(27,145,106,0.32), transparent 62%), radial-gradient(55% 55% at 4% 96%, rgba(255,183,0,0.10), transparent 60%)",
            }}
          />
          <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
            <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/15">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-secondary"
                    aria-hidden="true"
                  />
                  Anmeldelser · Synlighed · Feedback · Loyalitet
                </span>
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                  Få flere kunder.{" "}
                  {/* Egen linje fra sm og op, så de to sætninger ikke brækker
                      midt over — på mobil får den lov at flyde. */}
                  <span className="text-secondary sm:block">
                    Få dem til at komme igen.
                  </span>
                </h1>
                <p className="mt-5 max-w-xl text-lg text-white/75">
                  LoyalSum samler anmeldelser, kundeloyalitet, feedback og
                  synlighed i én enkel platform — så lokale forretninger
                  tiltrækker nye kunder og får de eksisterende til at vende
                  tilbage.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/signup" size="lg">
                    Kom i gang
                  </ButtonLink>
                  <ButtonLink href="/#loop" variant="outline-invert" size="lg">
                    Se hvordan LoyalSum virker
                  </ButtonLink>
                </div>
              </div>

              <div className="lg:pl-6">
                <HeroVisual />
              </div>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------- trust-stribe */}
        <section className="border-t border-border bg-muted-bg">
          <div className="mx-auto max-w-6xl px-4 py-5">
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted">
              {[
                "Ingen app for dine kunder",
                "Virker på alle telefoner",
                "Dansk platform",
                "Ingen binding på Basic",
              ].map((t) => (
                <li key={t} className="inline-flex items-center gap-2">
                  <span className="text-accent">{IconCheck}</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------- problemet */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <p className="text-sm font-semibold text-accent">Muligheden</p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                  Det er dyrt at skaffe en ny kunde. Få mere ud af hver enkelt.
                </h2>
                <p className="mt-4 text-muted">
                  Du bruger tid og penge på at få folk ind ad døren. Men værdien
                  stopper ikke ved første besøg — den opstår, når kunden får en
                  god oplevelse, deler den, kommer igen og trækker nye kunder med
                  sig.
                </p>
                <p className="mt-3 text-muted">
                  Det er præcis den proces, LoyalSum samler ét sted.
                </p>
              </div>

              {/*
                Kortet følger SAMME opbygning som de to kort i "To ting, der
                får din forretning til at vokse": ikonfelt, rigtig overskrift,
                liste, skygge. Før var det en tynd kasse med grå småtekst i
                toppen og luft i bunden — den lignede noget, der ikke var
                færdigt, netop fordi den var det eneste kort på siden, der ikke
                fulgte mønsteret.

                Ikonet er dæmpet gult og ikke fyldt: det skal signalere, at her
                er noget at være opmærksom på, uden at stjæle blikket fra
                overskriften til venstre, som er sektionens egentlige budskab.
              */}
              <div className="box-shape border border-border bg-card p-7 shadow-[0_20px_40px_-28px_rgba(25,55,92,0.4)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/15 text-dark">
                  {IconAlert}
                </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight">
                  Uden et system sker det tilfældigt
                </h3>
                <ul className="mt-5 divide-y divide-border/70">
                  {UDEN_SYSTEM.map((t) => (
                    <li key={t} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="mt-0.5 shrink-0 text-muted">{IconCross}</span>
                      <span className="text-sm">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ LoyalSum-loopet */}
        <section id="loop" className="scroll-mt-24 border-t border-border bg-muted-bg">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-accent">LoyalSum-loopet</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                Fra første besøg til næste besøg
              </h2>
              <p className="mt-3 text-muted">
                De fire dele hænger sammen. Hver gang loopet kører rundt, bliver
                din forretning lidt mere synlig — og lidt sværere at vælge fra.
              </p>
            </div>
            <div className="mt-12">
              <LoyalsumLoop />
            </div>
          </div>
        </section>

        {/* ------------------------------- nye kunder vs. eksisterende kunder */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                To ting, der får din forretning til at vokse
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <div className="box-shape border border-accent/25 bg-card p-7 shadow-[0_20px_40px_-28px_rgba(27,145,106,0.5)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-fg">
                  {IconMagnet}
                </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight">
                  Få flere nye kunder
                </h3>
                <ul className="mt-4 space-y-2 text-sm">
                  {NEW_CUSTOMERS.map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="mt-0.5 text-accent">{IconCheck}</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="box-shape border border-secondary/50 bg-card p-7 shadow-[0_20px_40px_-28px_rgba(255,183,0,0.55)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-secondary-fg">
                  {IconRepeat}
                </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight">
                  Få flere kunder til at komme igen
                </h3>
                <ul className="mt-4 space-y-2 text-sm">
                  {RETURNING_CUSTOMERS.map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="mt-0.5 text-accent">{IconCheck}</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mx-auto mt-8 max-w-xl text-center text-lg font-medium">
              Det hele hænger sammen i LoyalSum.
            </p>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted">
              Genbesøgene starter med et{" "}
              <Link href="/stempelkort" className="font-medium text-accent">
                digitalt stempelkort
              </Link>{" "}
              — kunden samler stempler og optjener den belønning, du vælger.
            </p>
          </div>
        </section>

        {/* ----------------------------------------------------- platformen */}
        <section
          id="platform"
          className="scroll-mt-24 border-t border-border bg-muted-bg"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-accent">Platformen</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                Alt du skal bruge til stærkere kunderelationer
              </h2>
              <p className="mt-3 text-muted">
                Fem områder, ét system. Vælg et område og se, hvad det gør for
                din forretning.
              </p>
            </div>
            <div className="mt-12">
              <PlatformShowcase />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ sådan kommer du i gang */}
        <section
          id="saadan"
          className="scroll-mt-24 border-t border-border bg-background"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <div className="text-center">
              <p className="text-sm font-semibold text-accent">Kom godt fra start</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                Sådan virker det
              </h2>
            </div>
            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {SETUP_STEPS.map((s, i) => (
                <li key={s.title}>
                  <div className="flex items-center gap-3">
                    <div className="btn-shape grid h-10 w-10 shrink-0 place-items-center bg-accent font-bold text-accent-fg">
                      {i + 1}
                    </div>
                    <s.Icon className="h-10 w-10 text-accent" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10 text-center">
              <ButtonLink href="/signup" size="lg">
                Kom i gang
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------- brancher */}
        <section className="border-t border-border bg-muted-bg">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Bygget til forretninger med kunder, der gerne må komme igen
              </h2>
            </div>
            {/*
              Bobler og ikke et gitter. Brancherne har vidt forskellig
              ordlængde — "Café" mod "Skønhedsklinik" — og et gitter ville
              enten give tomme felter eller tvinge det længste ord i to linjer.
              En rad, der selv brydes, holder dem lige tætte og læser samtidig
              som dét, sektionen påstår: at der er mange af dem.
            */}
            <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-3">
              {INDUSTRIES.map((branche) => (
                <li
                  key={branche.navn}
                  className="btn-shape inline-flex items-center gap-2.5 border border-border bg-card py-2 pl-2.5 pr-4 text-sm font-medium shadow-[0_10px_24px_-20px_rgba(25,55,92,0.65)]"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                    {branche.ikon}
                  </span>
                  {branche.navn}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------- final CTA */}
        <section className="border-t border-border bg-dark text-dark-fg">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Få flere kunder. Og flere af dem tilbage.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/70">
              Få anmeldelser, loyalitet, feedback og synlighed samlet i LoyalSum.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/signup" size="lg">
                Kom i gang
              </ButtonLink>
              <Link
                href="/produkter"
                className="text-sm font-medium text-white/75 underline-offset-4 hover:text-white hover:underline"
              >
                Se priser og produkter →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
