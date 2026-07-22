import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Pricing } from "@/components/pricing";
import { ButtonLink } from "@/components/ui/button";
import { Stars } from "@/components/ui/stars";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site";

/* ------------------------------------------------------------------ icons */

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const IconReview = (
  <Svg>
    <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1 1 5.8L12 17.77l-5.21 2.75 1-5.8-4.21-4.1 5.82-.85z" />
  </Svg>
);
const IconStamp = (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </Svg>
);
const IconScan = (
  <Svg>
    <path d="M4 8V5.5A1.5 1.5 0 015.5 4H8M16 4h2.5A1.5 1.5 0 0120 5.5V8M20 16v2.5a1.5 1.5 0 01-1.5 1.5H16M8 20H5.5A1.5 1.5 0 014 18.5V16M4 12h16" />
  </Svg>
);
const IconShare = (
  <Svg>
    <path d="M12 15V3M8.5 6.5L12 3l3.5 3.5M5 13v6a1 1 0 001 1h12a1 1 0 001-1v-6" />
  </Svg>
);
const IconShield = (
  <Svg>
    <path d="M12 3l7 3v5c0 4.4-3 7.4-7 9-4-1.6-7-4.6-7-9V6l7-3z" />
    <path d="M9.5 12l1.8 1.8 3.5-3.8" />
  </Svg>
);
const IconChart = (
  <Svg>
    <path d="M3 20h18M6.5 20v-6M12 20V8M17.5 20v-9" />
  </Svg>
);
const IconCheck = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
    <path d="M5 12l4.5 4.5L19 7" />
  </svg>
);

/* ------------------------------------------------------------------- data */

const STEPS = [
  {
    title: "Kunden scanner skiltet",
    body: "Gæsten tapper NFC eller scanner QR på din stander ved kassen eller bordet — uden at hente en app.",
  },
  {
    title: "Anmelder eller samler stempel",
    body: "Glade kunder sendes til Google. Andre giver privat feedback. Og alle kan åbne deres digitale stempelkort.",
  },
  {
    title: "Du vokser — og kan se det",
    body: "Flere 5-stjernede anmeldelser og flere gengangere. Alt samlet i dit dashboard med statistik i realtid.",
  },
];

const FEATURES = [
  {
    icon: IconReview,
    title: "Flere Google-anmeldelser",
    body: "Gør det gnidningsfrit at anmelde. Glade kunder sendes direkte til Google, Trustpilot eller Facebook.",
  },
  {
    icon: IconStamp,
    title: "Digitalt stempelkort",
    body: "Kør din egen kundeklub uden app. Kunden tilmelder sig selv på skiltet og samler stempler mod belønninger.",
  },
  {
    icon: IconScan,
    title: "Scan-til-stempel",
    body: "Personalet giver et stempel med ét scan af kundens kort — hurtigt over disken, ingen kvitteringer.",
  },
  {
    icon: IconShare,
    title: "Opslag på et øjeblik",
    body: "Lav et færdigt opslag ud af dine bedste anmeldelser og del det på Facebook og Instagram — gratis reklame.",
  },
  {
    icon: IconShield,
    title: "Privat feedback",
    body: "Fang kritik internt, før den bliver til en offentlig 1-stjerne. Du hører det først — og kan rette op.",
  },
  {
    icon: IconChart,
    title: "Statistik i realtid",
    body: "Se scanninger, anmeldelser, stempler og gennemsnitlig rating — ét sted, opdateret løbende.",
  },
];

/* ------------------------------------------------------------------- page */

export default function LandingPage() {
  const base = getSiteUrl();
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: base,
    logo: `${base}/reviewstand-logo.png`,
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
        {/* Hero */}
        <section className="relative isolate overflow-hidden bg-dark text-dark-fg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-cafe.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-10 h-full w-full object-cover object-right"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-r from-dark from-25% via-dark/90 to-dark/30"
          />
          <div className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
            <div className="max-w-2xl">
              <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/15">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden="true" />
                Stempelkort &amp; anmeldelser · ét lille skilt
              </span>
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                Flere anmeldelser.{" "}
                <span className="text-secondary">Flere faste kunder.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-white/75">
                LoyalBox samler 5-stjernede anmeldelser og kører dit digitale
                stempelkort — fra én NFC/QR-stander på disken. Ingen app for dine
                kunder.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/signup" size="lg">
                  Kom i gang
                </ButtonLink>
                <ButtonLink href="/#saadan" variant="outline-invert" size="lg">
                  Se hvordan det virker
                </ButtonLink>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/70">
                <span className="inline-flex items-center gap-2">
                  <Stars value={5} />
                  Elsket af caféer, frisører &amp; klinikker
                </span>
                <span className="hidden h-4 w-px bg-white/20 sm:block" aria-hidden="true" />
                <span>Ingen app · Ingen binding på Basic</span>
              </div>
            </div>
          </div>
        </section>

        {/* To motorer */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-accent">Én stander, to vækstmotorer</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                Få nye kunder — og få dem til at komme igen
              </h2>
              <p className="mt-3 text-muted">
                Anmeldelser trækker nye kunder ind. Stempelkort får dem tilbage
                igen og igen. LoyalBox gør begge dele fra det samme skilt.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {/* Tiltræk */}
              <div className="box-shape border border-accent/25 bg-card p-7 shadow-[0_20px_40px_-28px_rgba(27,145,106,0.5)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-fg">
                  {IconReview}
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-accent">Tiltræk</p>
                <h3 className="mt-1 text-xl font-bold tracking-tight">Flere nye kunder</h3>
                <p className="mt-2 text-sm text-muted">
                  Flere 5-stjernede anmeldelser er den bedste — og billigste —
                  reklame en lokal forretning kan få. Social proof sælger for dig,
                  døgnet rundt.
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  {["Direkte til Google, Trustpilot eller Facebook", "Privat feedback fanger kritikken først", "Opslag gør ros til gratis markedsføring"].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="mt-0.5 text-accent">{IconCheck}</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Fasthold */}
              <div className="box-shape border border-secondary/50 bg-card p-7 shadow-[0_20px_40px_-28px_rgba(255,183,0,0.55)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-secondary-fg">
                  {IconStamp}
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-secondary-fg">Fasthold</p>
                <h3 className="mt-1 text-xl font-bold tracking-tight">Flere faste kunder</h3>
                <p className="mt-2 text-sm text-muted">
                  Et digitalt stempelkort får engangskunder til at komme igen — og
                  hver gentagelse er ren fortjeneste. Uden app, uden pap, uden bøvl.
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  {["Kunden tilmelder sig selv på skiltet", "Personalet stempler med ét scan", "Belønninger der trækker dem tilbage"].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="mt-0.5 text-accent">{IconCheck}</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Sådan virker det */}
        <section id="saadan" className="border-t border-border bg-muted-bg">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <div className="text-center">
              <p className="text-sm font-semibold text-accent">Nemt for dine gæster</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Sådan virker det</h2>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <div key={s.title}>
                  <div className="btn-shape grid h-10 w-10 place-items-center bg-accent font-bold text-accent-fg">
                    {i + 1}
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Funktioner */}
        <section id="features" className="border-t border-border bg-dark text-dark-fg">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-secondary">Alt-i-ét</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                Alt du skal bruge — på ét skilt
              </h2>
              <p className="mt-3 text-white/70">
                Anmeldelser, loyalitet, feedback og markedsføring. Sat op og klar
                til disken.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="box-shape border border-white/10 bg-white/5 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-secondary">
                    {f.icon}
                  </div>
                  <h3 className="mt-4 font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm text-white/70">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Produkter / Priser */}
        <section id="produkter" className="border-t border-border bg-background">
          <div id="priser" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold text-accent">Produkter</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Vælg din stander</h2>
              <p className="mt-3 text-muted">
                Standeren virker standalone fra dag ét. Gå komplet, og få hele
                LoyalBox med: stempelkort, anmeldelser, opslag og statistik.
              </p>
            </div>
            <div className="mt-12">
              <Pricing />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-dark text-dark-fg">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center">
            <p className="text-sm font-semibold text-secondary">Kom godt i gang</p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              Klar til flere anmeldelser og flere faste kunder?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/70">
              Opret din virksomhed på under et minut og få din stander klar.
            </p>
            <div className="mt-8">
              <ButtonLink href="/signup" size="lg">
                Opret virksomhed
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
