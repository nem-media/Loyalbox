import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Pricing } from "@/components/pricing";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Reviewstander til Google-anmeldelser (QR + NFC)",
  description:
    "En reviewstander gør det nemt for dine kunder at anmelde din forretning med et scan eller tap. QR + NFC, dynamisk link og privat feedback. Se priser og kom i gang.",
  alternates: { canonical: "/reviewstander" },
};

const STEPS = [
  {
    title: "Kunden scanner eller tapper",
    body: "Gæsten holder telefonen mod standeren (NFC) eller scanner QR-koden ved kassen eller bordet.",
  },
  {
    title: "Giver en vurdering",
    body: "Anmeldelsessiden åbner med det samme — kunden giver 1-5 stjerner på få sekunder.",
  },
  {
    title: "Du får flere anmeldelser",
    body: "Glade kunder sendes til Google. Kritik kan fanges privat, før den bliver offentlig.",
  },
];

const BENEFITS = [
  {
    title: "QR + NFC i én stander",
    body: "Virker på alle telefoner — både scan med kamera og tap med NFC.",
  },
  {
    title: "Dynamisk link",
    body: "Skift destination når som helst — uden at genoptrykke standeren.",
  },
  {
    title: "Privat feedback",
    body: "Fang utilfredse kunder internt, før de skriver en offentlig 1-stjerne.",
  },
  {
    title: "Dit eget design",
    body: "Tilpas standeren med dit logo, så den matcher din forretning.",
  },
];

const FAQ = [
  {
    q: "Hvad er en reviewstander?",
    a: "En reviewstander er en lille fysisk stander til kassen eller bordet, der lader dine kunder anmelde din forretning med et enkelt scan eller tap. Den fjerner besværet ved at finde frem til din Google-profil.",
  },
  {
    q: "Hvordan virker NFC og QR?",
    a: "Standeren har både en QR-kode, kunden scanner med kameraet, og NFC — samme teknologi som mobilbetaling. Kunden holder blot telefonen mod standeren, og anmeldelsessiden åbner automatisk. NFC virker på alle iPhones fra XR og frem samt de fleste Android-telefoner.",
  },
  {
    q: "Kan jeg ændre, hvor kunderne sendes hen?",
    a: "Ja. Med et dynamisk link kan du skifte destination — fx Google, Trustpilot eller Facebook — uden at genoptrykke standeren.",
  },
  {
    q: "Hvad koster en reviewstander?",
    a: "Der findes en engangspris for selve standeren og et abonnement, hvis du vil have dashboard, statistik og dynamiske links. Se de tre niveauer nedenfor.",
  },
];

export default function ReviewstanderPage() {
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
              <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-secondary"
                  aria-hidden="true"
                />
                QR- &amp; NFC-reviewstander
              </span>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Reviewstander til{" "}
                <span className="text-secondary">flere Google-anmeldelser</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-white/70">
                Gør det nemt for dine kunder at anmelde din forretning med et
                enkelt scan eller tap. Én stander ved kassen — flere anmeldelser,
                mere tillid og bedre lokal synlighed.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/produkter" size="lg">
                  Se priser
                </ButtonLink>
                <ButtonLink href="/#saadan" variant="outline-invert" size="lg">
                  Sådan virker det
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        {/* Hvad er en reviewstander */}
        <section className="bg-background">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hvad er en reviewstander?
            </h2>
            <p className="mt-4 leading-relaxed text-foreground/90">
              En <strong>reviewstander</strong> er en lille fysisk stander til
              kassen eller bordet, der lader dine kunder anmelde din forretning
              med et enkelt scan eller tap. Den fjerner besværet ved at finde
              frem til din Google-profil — og det er netop besværet, der ellers
              koster dig de fleste anmeldelser.
            </p>
            <p className="mt-4 leading-relaxed text-foreground/90">
              I stedet for at bede personalet spørge hver kunde, står
              reviewstanderen der altid, ser professionel ud og virker på det
              rigtige tidspunkt — lige når kunden betaler.
            </p>
          </div>
        </section>

        {/* Sådan virker det */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Sådan virker en reviewstander
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

        {/* Fordele */}
        <section className="border-t border-border bg-dark text-dark-fg">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="mb-10 text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Derfor virker den
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {BENEFITS.map((b) => (
                <div
                  key={b.title}
                  className="box-shape border border-white/10 bg-white/5 p-5"
                >
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
                Vælg din reviewstander
              </h2>
              <p className="mt-2 text-muted">
                Ingen binding på Basic og Premium. Pro er et abonnement med fuld
                statistik.
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
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-dark text-dark-fg">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Klar til flere anmeldelser?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/70">
              Kom i gang med en reviewstander i dag — og gør det nemt for dine
              kunder at anbefale dig.
            </p>
            <div className="mt-6">
              <ButtonLink href="/produkter" size="lg">
                Se produkterne
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
