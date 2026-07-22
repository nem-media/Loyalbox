import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Pricing } from "@/components/pricing";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Digitalt stempelkort uden app til din butik",
  description:
    "Et digitalt stempelkort uden app får dine kunder til at komme igen. Kunden tilmelder sig selv på skiltet, personalet stempler med ét scan, og belønninger trækker dem tilbage. Se hvordan — og priser.",
  keywords: [
    "digitalt stempelkort",
    "stempelkort uden app",
    "stempelkort til café",
    "loyalitetsprogram lille virksomhed",
    "kundeklub",
    "NFC stempelkort",
    "digitalt loyalitetskort",
  ],
  alternates: { canonical: "/stempelkort" },
};

const STEPS = [
  {
    title: "Kunden tilmelder sig på skiltet",
    body: "Gæsten scanner QR eller tapper NFC på standeren og opretter sit stempelkort på få sekunder — i browseren, uden at hente en app.",
  },
  {
    title: "Personalet stempler med ét scan",
    body: "Ved næste køb scanner personalet kundens kode og giver et stempel over disken. Ingen papkort, ingen kvitteringer at holde styr på.",
  },
  {
    title: "Belønningen trækker dem tilbage",
    body: "Når kortet er fuldt, får kunden sin belønning — en gratis kaffe, en rabat, hvad du vælger. Og en grund til at komme igen.",
  },
];

const BENEFITS = [
  {
    title: "Helt uden app",
    body: "Dine kunder skal ikke hente noget. Stempelkortet lever i browseren og kan gemmes på hjemmeskærmen.",
  },
  {
    title: "Selvbetjent tilmelding",
    body: "Kunderne opretter sig selv på skiltet — du behøver ikke taste noget ind eller stå med et kartotek.",
  },
  {
    title: "Scan-til-stempel",
    body: "Personalet giver et stempel med ét scan af kundens kode. Hurtigt, selv i myldretiden.",
  },
  {
    title: "Din egen kundeklub",
    body: "Sæt selv reglerne: antal stempler, belønninger og kampagner. Se det hele i dit dashboard.",
  },
];

const FAQ = [
  {
    q: "Hvad er et digitalt stempelkort?",
    a: "Et digitalt stempelkort er den moderne udgave af papkortet med klip. I stedet for et pap-kort samler kunden stempler på sin telefon og optjener belønninger — men helt uden en app. Kortet er en almindelig webside, kunden får ved at scanne dit skilt.",
  },
  {
    q: "Skal mine kunder hente en app?",
    a: "Nej. Kunden tilmelder sig ved at scanne QR-koden eller tappe NFC på standeren, og stempelkortet åbner med det samme i browseren. De kan gemme det på hjemmeskærmen som en genvej — men der er ingen app at downloade og ingen konto at oprette.",
  },
  {
    q: "Hvordan giver personalet et stempel?",
    a: "Kunden viser sit kort, personalet scanner koden og giver et stempel med ét tryk — det tager få sekunder. Systemet forhindrer selv dobbelt-stempling, så det er sikkert selv når der er travlt.",
  },
  {
    q: "Passer et digitalt stempelkort til min forretning?",
    a: "Ja, hvis du har kunder der kommer igen. Det er stærkt til caféer, restauranter, frisører, klinikker, bagere og butikker — alle steder hvor et loyalitetsprogram får engangskunder til at blive faste kunder.",
  },
  {
    q: "Hvad koster et digitalt stempelkort?",
    a: "Stempelkortet er en del af LoyalBox Komplet — abonnementet der samler stempelkort, anmeldelser og opslag på én stander. Se de tre produktniveauer nedenfor.",
  },
];

export default function StempelkortPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="border-b border-border bg-dark text-dark-fg">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
            <div className="max-w-2xl">
              <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/15">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden="true" />
                Digitalt stempelkort · NFC &amp; QR
              </span>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Digitalt stempelkort —{" "}
                <span className="text-secondary">uden app</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-white/70">
                Få dine kunder til at komme igen med en digital kundeklub. Kunden
                tilmelder sig selv på skiltet, personalet stempler med ét scan, og
                belønninger trækker dem tilbage — helt uden en app.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/produkter/loyalbox-komplet" size="lg">
                  Se priser
                </ButtonLink>
                <ButtonLink href="/#saadan" variant="outline-invert" size="lg">
                  Sådan virker det
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        {/* Hvad er et digitalt stempelkort */}
        <section className="bg-background">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hvad er et digitalt stempelkort?
            </h2>
            <p className="mt-4 leading-relaxed text-foreground/90">
              Et <strong>digitalt stempelkort</strong> er den moderne udgave af
              papkortet med klip: kunden samler stempler mod en belønning — men på
              telefonen, og helt <strong>uden app</strong>. Det fjerner alt
              besværet med papkort, der bliver væk, og gør din kundeklub til noget
              kunderne faktisk bruger.
            </p>
            <p className="mt-4 leading-relaxed text-foreground/90">
              Nye kunder er dyre at skaffe. Et <strong>loyalitetsprogram</strong>{" "}
              gør det billigt at få dem igen — og hver gentagelse er nærmest ren
              fortjeneste. Derfor er et stempelkort en af de enkleste måder at få
              flere faste kunder på for en lokal forretning.
            </p>
          </div>
        </section>

        {/* Sådan virker det */}
        <section id="saadan" className="border-t border-border bg-muted-bg">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Sådan virker et digitalt stempelkort
            </h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
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

        {/* Fordele */}
        <section className="border-t border-border bg-dark text-dark-fg">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="mb-10 text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Derfor virker det
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map((b) => (
                <div key={b.title} className="box-shape border border-white/10 bg-white/5 p-5">
                  <h3 className="font-bold">{b.title}</h3>
                  <p className="mt-2 text-sm text-white/70">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Priser */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Få stempelkort med LoyalBox Komplet
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-muted">
                Det digitale stempelkort er en del af LoyalBox Komplet — sammen med
                anmeldelser, opslag og statistik på ét skilt.
              </p>
            </div>
            <Pricing />
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ofte stillede spørgsmål
            </h2>
            <div className="mt-8 divide-y divide-border border-y border-border">
              {FAQ.map((item) => (
                <div key={item.q} className="py-5">
                  <h3 className="font-bold">{item.q}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{item.a}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-sm text-muted">
              Vil du også have flere anmeldelser? Se vores{" "}
              <Link href="/reviewstander" className="font-medium text-accent">
                reviewstander
              </Link>{" "}
              — eller få det hele med{" "}
              <Link href="/produkter/loyalbox-komplet" className="font-medium text-accent">
                LoyalBox Komplet
              </Link>
              .
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-dark text-dark-fg">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Klar til flere faste kunder?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/70">
              Kom i gang med et digitalt stempelkort i dag — og gør engangskunder
              til gengangere.
            </p>
            <div className="mt-6">
              <ButtonLink href="/produkter/loyalbox-komplet" size="lg">
                Se LoyalBox Komplet
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
