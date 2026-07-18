import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Pricing } from "@/components/pricing";
import { ButtonLink } from "@/components/ui/button";
import { Stars } from "@/components/ui/stars";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site";

const STEPS = [
  {
    title: "Kunden scanner",
    body: "Gæsten scanner QR eller tapper NFC på din stander ved kassen eller bordet.",
  },
  {
    title: "Giver en vurdering",
    body: "De vælger 1-5 stjerner og kan skrive en kommentar på få sekunder.",
  },
  {
    title: "Du får indsigt",
    body: "Glade kunder sendes til Google. Kritik lander privat i dit dashboard.",
  },
];

const FEATURES = [
  {
    title: "Dynamisk QR + NFC",
    body: "Skift destination når som helst — uden at genoptrykke standeren.",
  },
  {
    title: "Privat feedback",
    body: "Fang kritik internt, før den bliver en offentlig 1-stjerne.",
  },
  {
    title: "Statistik i realtid",
    body: "Se scanninger, klik og gennemsnitlig rating på ét sted.",
  },
  {
    title: "Klar til vækst",
    body: "Bygget til loyalitet, kundeklub og AI-analyse — når du er klar.",
  },
];

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
            className="absolute inset-0 -z-10 bg-gradient-to-r from-dark from-20% via-dark/85 to-dark/20"
          />
          <div className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
            <div className="max-w-xl">
              <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-secondary"
                  aria-hidden="true"
                />
                NFC- &amp; QR-stander til din butik
              </span>
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                Få flere anmeldelser,{" "}
                <span className="text-secondary">forstå dine kunder</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg text-white/70">
                LoyalBox gør det nemt at samle anmeldelser, fange privat
                feedback og styrke din lokale forretning — med én fysisk
                stander.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/signup" size="lg">
                  Kom i gang
                </ButtonLink>
                <ButtonLink
                  href="/produkter"
                  variant="outline-invert"
                  size="lg"
                >
                  Se produkter
                </ButtonLink>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-white/70">
                <Stars value={5} />
                <span>Elsket af lokale forretninger</span>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="saadan" className="border-t border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <p className="text-center text-sm font-semibold text-accent">
              Nemt for dine gæster
            </p>
            <h2 className="mt-1 text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Sådan virker det
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <div key={s.title} className="p-2">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-fg font-semibold">
                    {i + 1}
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="border-t border-border bg-dark text-dark-fg"
        >
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="mb-10 text-center">
              <p className="text-sm font-semibold text-secondary">Funktioner</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Alt du skal bruge
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="box-shape border border-white/10 bg-white/5 p-5"
                >
                  <h3 className="font-bold">{f.title}</h3>
                  <p className="mt-2 text-sm text-white/70">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Products / Pricing */}
        <section
          id="produkter"
          className="border-t border-border bg-background"
        >
          <div id="priser" className="mx-auto max-w-6xl px-4 py-16">
            <div className="mb-10 text-center">
              <p className="text-sm font-semibold text-accent">Produkter</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Vælg din stander
              </h2>
              <p className="mt-2 text-muted">
                Ingen binding på Basic og Premium. Pro er et abonnement med fuld
                statistik.
              </p>
            </div>
            <Pricing />
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-dark text-dark-fg">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center">
            <p className="text-sm font-semibold text-secondary">
              Kom godt i gang
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Klar til flere anmeldelser?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/70">
              Opret din virksomhed på under et minut og få din stander klar.
            </p>
            <div className="mt-6">
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
