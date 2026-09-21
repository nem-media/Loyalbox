import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { HeroVisual } from "@/components/home/hero-visual";
import { LoyalsumLoop } from "@/components/home/loyalsum-loop";
import { PlatformShowcase } from "@/components/home/platform-showcase";
import { COMPANY, SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { getSiteUrl, organisationsLogo } from "@/lib/site";
import {
  SetupIcon,
  InviteIcon,
  AutomationIcon,
} from "@/components/illustrations";
import { IndustryBadge, type Branche } from "@/components/industry-icons";
import { ProduktStribe } from "@/components/produkt-stribe";
import { Udtalelser } from "@/components/home/udtalelser";

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

/** Brancherne. Tegningerne bor i industry-icons, fordi tre sider viser dem. */
const INDUSTRIES: { navn: string; branche: Branche }[] = [
  { navn: "Café", branche: "cafe" },
  { navn: "Restaurant", branche: "restaurant" },
  { navn: "Takeaway", branche: "takeaway" },
  { navn: "Frisør", branche: "frisoer" },
  { navn: "Skønhedsklinik", branche: "skoenhed" },
  { navn: "Klinik", branche: "klinik" },
  { navn: "Butik", branche: "butik" },
  { navn: "Værksted", branche: "vaerksted" },
  { navn: "Fitness", branche: "fitness" },
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
  /* Den anden loyalitetsform. Listen er dét, forsiden lover om genbesøg, og
     pointprogrammet stod ikke på den — se punktet om de to former i
     AGENTS.md. */
  "Pointprogram med egne belønninger",
  "Belønninger og tilbud",
  /*
   * KORTET SKAL KUNNE OVERLEVE EN NY TELEFON, ellers er stemplerne kun et
   * løfte indtil næste gang mobilen bliver skiftet. Kortet virker UDEN konto
   * — den er det frivillige lag, der samler kortene på tværs af butikker
   * (`/mine-kort`). Linjen siger derfor "med ét login" og ikke "kræver en
   * konto".
   */
  "Alle kundens kort ét sted med ét login",
  "Privat feedback du kan handle på",
  "Stærkere kunderelationer",
  "Flere genbesøg pr. kunde",
];

/* ------------------------------------------------------------------- page */

export default function LandingPage() {
  const base = getSiteUrl();
  /**
   * TO STYKKER STRUKTURDATA, OG DE GØR HVER SIT.
   *
   * `Organization` fortæller hvem vi er. `WebSite` er dét, Google bruger til
   * **sitets navn i søgeresultatet** — uden den står der "loyalsum.dk" som en
   * rå adresse over hvert resultat, med den står der "LoyalSum.dk". Det er et
   * af de få steder, hvor strukturdata ændrer, hvad brugeren faktisk SER.
   *
   * Der er BEVIDST ingen `SearchAction`: den lover en søgefunktion på sitet,
   * og der er ingen. Og intet `sameAs` — vi har ingen profiler at pege på,
   * og et gæt ville være en påstand.
   *
   * `legalName`, `email` og CVR står i forvejen i footeren og på
   * `/handelsbetingelser`; det er et lovkrav, at de gør. Her gentages de i
   * maskinlæsbar form, ikke som noget nyt.
   */
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      legalName: COMPANY.legalName,
      url: base,
      // Mørk variant: strukturdata-logoer vises på hvid baggrund hos Google.
      logo: organisationsLogo(),
      description: SITE_TAGLINE,
      email: COMPANY.email,
      identifier: {
        "@type": "PropertyValue",
        propertyID: "CVR",
        value: COMPANY.cvr,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: base,
      inLanguage: "da-DK",
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
        {/* ---------------------------------------------------------- hero */}
        {/* Ingen baggrundsfoto her: hero-cafe.jpg viser en reviewstander og
            hører hjemme på /reviewstander. En ren gradient holder heroen om
            platformen — og sparer et stort billede over folden. */}
        <section className="relative isolate overflow-hidden bg-dark text-dark-fg">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              /*
TRE SKÆR, OG TEALEN FØRER NU AN.
                De to varme lå øverst og holdt heroen beige — rigtigt dengang
                paletten var det. Efter omvendingen til den kølige palet ville
                to beige skær på en petroleumsgrund være den ENESTE varme
                flade på sitet, altså præcis den fejl, de før løste.

                Nu er den lyse teal det bærende skær (18 % bag produktet, hvor
                den giver skærmen en glød at stå i), og guldet er ét lille
                kys øverst til højre — supporting-farven set som lys og ikke
                som flade. Det tredje ligger i bunden til venstre og hindrer,
                at den store mørke flade bliver flad.

                Alle tre er radiale og uden skarp kant: en gradient, man kan
                SE, er en gradient for meget.
              */
              backgroundImage:
                "radial-gradient(58% 58% at 70% 20%, rgba(26,144,137,0.20), transparent 64%), radial-gradient(42% 42% at 88% 2%, rgba(217,164,65,0.12), transparent 60%), radial-gradient(55% 55% at 2% 98%, rgba(26,144,137,0.10), transparent 60%)",
            }}
          />
          <div className="mx-auto max-w-side px-4 py-20 sm:py-28">
            <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/8 px-3.5 py-1.5 text-xs font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/15 backdrop-blur-sm">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(217,164,65,0.8)]"
                    aria-hidden="true"
                  />
                  Anmeldelser · Synlighed · Feedback · Loyalitet
                </span>
                {/* Strammere bogstavafstand på de store grader: Geist
                    spreder sig ved 60 px, og en overskrift, der er bred som
                    en plakat, ser trykt ud frem for designet. */}
                <h1 className="text-4xl font-bold tracking-[-0.025em] sm:text-5xl lg:text-[3.75rem] lg:leading-[1.05]">
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
                  <ButtonLink variant="secondary" href="/signup" size="lg">
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

        {/* ------------------------------------------- produkterne, lige her */}
        {/* Den købeklare skal ikke lede. Se ProduktStribe for hvorfor det er
            en stribe og ikke kataloggitteret. */}
        <ProduktStribe />

        {/* --------------------------------------------------- trust-stribe */}
        <section className="sektion-skaer border-t border-border bg-muted-bg">
          <div className="mx-auto max-w-side px-4 py-5">
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted">
              {[
                "Ingen app for dine kunder",
                "Virker på alle telefoner",
                "Dansk platform",
                // "på Basic" stod her, som om de to abonnementsvarer bandt
                // kunden. Det gør de ikke: handelsbetingelsernes §6 siger
                // ligeud, at der ingen bindingsperiode er, og opsigelsen kan
                // ske når som helst fra dashboardet. Et forbehold, der ikke
                // svarer til vilkårene, er en dårligere handel end den, vi
                // faktisk tilbyder.
                "Ingen binding",
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
          <div className="mx-auto max-w-side px-4 py-16 sm:py-20">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <p className="text-sm font-semibold text-accent">Muligheden</p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                  Det er dyrt at skaffe en ny kunde. Få mere ud af hver enkelt.
                </h2>
                <p className="mt-4 text-muted">
                  Du bruger tid og penge på at få folk ind ad døren. Men værdien
                  stopper ikke ved første besøg — den opstår, når kunden får en
                  god oplevelse, deler den, kommer igen og trækker nye kunder
                  med sig.
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
              <div className="box-shape border border-border bg-card p-7 shadow-[0_20px_40px_-28px_rgba(30,28,26,0.4)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/15 text-dark">
                  {IconAlert}
                </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight">
                  Uden et system sker det tilfældigt
                </h3>
                <ul className="mt-5 divide-y divide-border/70">
                  {UDEN_SYSTEM.map((t) => (
                    <li
                      key={t}
                      className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <span className="mt-0.5 shrink-0 text-muted">
                        {IconCross}
                      </span>
                      <span className="text-sm">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ LoyalSum-loopet */}
        <section
          id="loop"
          className="sektion-skaer scroll-mt-24 border-t border-border bg-muted-bg"
        >
          <div className="mx-auto max-w-side px-4 py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-accent">
                LoyalSum-loopet
              </p>
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
          <div className="mx-auto max-w-side px-4 py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                To ting, der får din forretning til at vokse
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <div className="box-shape border border-accent/25 bg-card p-7 shadow-[0_20px_40px_-28px_rgba(30,28,26,0.5)]">
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

              <div className="box-shape border border-secondary/50 bg-card p-7 shadow-[0_20px_40px_-28px_rgba(217,164,65,0.55)]">
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
            {/* HVILKEN VARE GIVER HVAD.
                De to lister ovenfor er platformen som helhed, og sådan skal
                forsiden læses — men uden denne linje står stempelkort og
                belønninger som noget, ENHVER stander kan. Den enkle
                Reviewstander til 499 kr. viderestiller bare og har hverken
                side, indbakke eller stempelkort. Et løfte, kunden først
                opdager ikke gjaldt efter købet, er ikke en detalje.

                DELT OP EFTER FUNKTION OG IKKE EFTER KORT: "opslag" står i
                venstre kort, men er ikke en Pro-funktion, og "privat
                feedback" står i højre, men er netop Pro. En sætning om
                "venstre halvdel" ville altså tage fejl begge veje — og på en
                telefon står kortene alligevel over hinanden.

                Opslag står nu under Komplet, og det er også dér, koden
                sætter dem: `/dashboard/opslag` var slet ikke spærret, så en
                Pro-kunde havde funktionen uden at have købt den. Spærringen
                ligger i dashboardets opslag-layout.

                Bevidst en SÆTNING og ikke en prissektion: prissektionen blev
                taget af forsiden, dengang den blev positioneret som platform
                frem for som stander, og "Priser" peger på /produkter. */}
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-muted">
              Anmeldelsessiden og den private feedback følger med{" "}
              <Link
                href="/produkter/reviewstander-pro"
                className="font-medium text-accent"
              >
                Reviewstander Pro
              </Link>
              .{" "}
              <Link href="/stempelkort" className="font-medium text-accent">
                Stempelkort
              </Link>
              ,{" "}
              <Link
                href="/loyalitetsprogram"
                className="font-medium text-accent"
              >
                pointprogram
              </Link>
              , belønninger og opslag er en del af{" "}
              <Link
                href="/produkter/loyalsum-komplet"
                className="font-medium text-accent"
              >
                LoyalSum Komplet
              </Link>
              . Den enkle{" "}
              <Link
                href="/produkter/reviewstander"
                className="font-medium text-accent"
              >
                Reviewstander
              </Link>{" "}
              sender kunden direkte videre til det link, du vælger.
            </p>
            {/*
              OG DEN FJERDE VARE. Sætningen ovenfor beskrev tre varer, hvor
              adgangsvejen altid var en stander — og efter LoyalSum Komplet
              Online var den derfor ikke længere fuldstændig. Den står som sin
              EGEN linje og ikke inde i sætningen: forskellen er ikke en
              funktion, men om der følger et skilt med, og det er en anden
              slags oplysning end de tre foran.
            */}
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-muted">
              Har du ingen disk at stille et skilt på, findes hele platformen
              også uden stander:{" "}
              <Link
                href="/loyalsum-komplet-online"
                className="font-medium text-accent"
              >
                LoyalSum Komplet Online
              </Link>{" "}
              deler du selv via din hjemmeside, din webshop, dine mails eller
              en QR-kode.
            </p>
          </div>
        </section>

        {/* ----------------------------------------------------- platformen */}
        <section
          id="platform"
          className="sektion-skaer scroll-mt-24 border-t border-border bg-muted-bg"
        >
          <div className="mx-auto max-w-side px-4 py-16 sm:py-20">
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
          <div className="mx-auto max-w-side px-4 py-16 sm:py-20">
            <div className="text-center">
              <p className="text-sm font-semibold text-accent">
                Kom godt fra start
              </p>
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

        {/* ------------------------------------------------------ udtalelser */}
        {/* Tegner ingenting, når der ikke er godkendte citater — se
            komponenten. Den står EFTER "sådan kommer du i gang" og før
            brancherne: et citat virker bedst, når læseren lige har set, hvad
            det handler om, og endnu ikke har set prisen. */}
        <Udtalelser />

        {/* -------------------------------------------------------- brancher */}
        <section className="sektion-skaer border-t border-border bg-muted-bg">
          <div className="mx-auto max-w-side px-4 py-16 sm:py-20">
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
                  className="btn-shape inline-flex items-center gap-2.5 border border-border bg-card py-2 pl-2.5 pr-4 text-sm font-medium shadow-[0_10px_24px_-20px_rgba(30,28,26,0.65)]"
                >
                  <IndustryBadge branche={branche.branche} />
                  {branche.navn}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------- final CTA */}
        <section className="border-t border-border bg-dark text-dark-fg">
          <div className="mx-auto max-w-side px-4 py-20 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Få flere kunder. Og flere af dem tilbage.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/70">
              Få anmeldelser, loyalitet, feedback og synlighed samlet i
              LoyalSum.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink variant="secondary" href="/signup" size="lg">
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

      {/* Sidste sektion er mørk — se `overMoerk` i SiteFooter. */}
      <SiteFooter overMoerk />
    </>
  );
}
