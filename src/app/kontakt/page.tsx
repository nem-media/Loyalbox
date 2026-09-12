import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CompanyDetails } from "@/components/legal";
import { KontaktForm } from "@/components/kontakt-form";
import { PurchaseNotice } from "@/components/purchase-notice";
import { Liste, ListeRaekke } from "@/components/ui/liste";
import { COMPANY, SITE_NAME } from "@/lib/constants";
import { SVARTID } from "@/lib/kontakt";

/**
 * Kontakt os.
 *
 * SIDEN SKAL KUNNE BRUGES UDEN AT SKRIVE. De fleste henvendelser på en side
 * som denne er spørgsmål, der allerede er besvaret et andet sted — derfor står
 * genvejene ("Inden du skriver") ved siden af formularen og ikke under den.
 * Det er ikke for at slippe for at svare: et svar, man får med det samme, er
 * bedre end et svar, der kommer i morgen.
 *
 * AFSNITTET TIL SLUTKUNDER ER IKKE PYNT. Adressen står på hvert eneste
 * stempelkort, en butik deler ud, så vi FÅR beskeder fra butikkernes kunder om
 * manglende stempler. Dem kan vi ikke hjælpe med: vi er databehandler for
 * butikken og hverken må eller kan rette i deres kunders kort. Står det ikke
 * her, skriver folk alligevel — og venter så på et svar, der ikke kommer.
 *
 * Der gemmes intet fra formularen hos os; se src/lib/kontakt.ts.
 */
export const metadata: Metadata = {
  title: "Kontakt os",
  description: `Skriv til ${SITE_NAME} om bestilling, priser, din konto eller hvordan stempelkort og reviewstander virker. ${SVARTID}`,
  alternates: { canonical: "/kontakt" },
};

/** Spørgsmål, der kan besvares uden at vente på os. */
const GENVEJE = [
  {
    href: "/produkter",
    titel: "Hvad koster det?",
    tekst: "Alle tre varer med priser, mængderabat og hvad der er med.",
  },
  {
    href: "/stempelkort",
    titel: "Hvordan virker stempelkortet?",
    tekst: "Uden app for kunden, og scan-til-stempel over disken.",
  },
  {
    href: "/reviewstander",
    titel: "Hvordan får jeg flere anmeldelser?",
    tekst: "Sådan virker standeren, og hvad kunden møder efter et scan.",
  },
  {
    href: "/blog",
    titel: "Guides og baggrund",
    tekst: "Artikler om loyalitet, anmeldelser, NFC og QR.",
  },
  {
    href: "/handelsbetingelser",
    titel: "Levering, opsigelse og betaling",
    tekst: `Handelsbetingelserne — standeren sendes typisk inden for ${COMPANY.deliveryDays}.`,
  },
  {
    href: "/privatliv",
    titel: "Hvad gør I med mine data?",
    tekst: "Privatlivspolitikken, og hvor længe vi gemmer hvad.",
  },
];

export default function KontaktPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-accent">Kontakt</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Skriv til os
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Uanset om du overvejer en stander, er kunde i forvejen, eller bare
            vil vide, om LoyalSum passer til din forretning — så skriv. Vi er et
            lille hold, og du får svar fra et menneske.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.15fr_1fr]">
          {/* ------------------------------------------------------ formular */}
          <section aria-labelledby="skriv" className="order-2 lg:order-1">
            <h2 id="skriv" className="text-xl font-bold tracking-tight">
              Send en besked
            </h2>
            <p className="mt-1 text-sm text-muted">
              Vi skal bruge navn, mailadresse og en besked — resten er
              frivilligt.
            </p>
            <div className="mt-6">
              <KontaktForm />
            </div>
          </section>

          {/* ------------------------------------------------------- kontakt */}
          <div className="order-1 space-y-6 lg:order-2">
            <section
              aria-labelledby="direkte"
              className="box-shape border border-border bg-card p-6"
            >
              <h2 id="direkte" className="font-bold tracking-tight">
                Skriv direkte
              </h2>
              <p className="mt-3">
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="text-lg font-semibold text-accent break-words"
                >
                  {COMPANY.email}
                </a>
              </p>
              <p className="mt-2 text-sm text-muted">{SVARTID}</p>
              {/* Telefonen står i COMPANY og vises kun, hvis der ER et nummer
                  — et tomt felt på en kontaktside er værre end ingen linje. */}
              {COMPANY.phone ? (
                <p className="mt-2 text-sm text-muted">
                  Telefon: {COMPANY.phone}
                </p>
              ) : null}
              <div className="mt-5 border-t border-border pt-4 text-sm text-muted">
                <p className="mb-2 font-medium text-foreground">
                  {SITE_NAME} drives af
                </p>
                <CompanyDetails />
              </div>
            </section>

            {/* Købet er ikke åbnet endnu. Beskeden ligger ét sted (se
                PurchaseNotice) og forsvinder herfra af sig selv den dag,
                betalingen åbner — sammen med ventelisten. */}
            <PurchaseNotice />

            <section
              aria-labelledby="slutkunde"
              className="box-shape border border-border bg-muted-bg p-6"
            >
              <h2 id="slutkunde" className="font-bold tracking-tight">
                Har du et stempelkort fra en butik?
              </h2>
              <p className="mt-2 text-sm text-muted">
                Så skal du skrive til butikken og ikke til os. Vi leverer
                systemet, men det er butikken, der giver stempler og
                belønninger, og vi hverken må eller kan rette i deres kunders
                kort.
              </p>
              <p className="mt-2 text-sm text-muted">
                Har du mistet linket til dit kort, får du det igen ved at scanne
                butikkens skilt — og har du en konto hos os, ligger alle dine
                kort på{" "}
                <a href="/mine-kort" className="font-medium text-accent">
                  Mine stempelkort
                </a>
                .
              </p>
            </section>
          </div>
        </div>

        {/* ---------------------------------------------------------- genveje */}
        <section aria-labelledby="inden" className="mt-20">
          <div className="mb-6 max-w-2xl">
            <h2 id="inden" className="text-xl font-bold tracking-tight">
              Inden du skriver
            </h2>
            <p className="mt-2 text-sm text-muted">
              De fleste spørgsmål er besvaret her, og så behøver du ikke vente
              på os.
            </p>
          </div>
          <div className="box-shape border border-border bg-card px-5">
            <Liste>
              {GENVEJE.map((g) => (
                <ListeRaekke key={g.href} href={g.href}>
                  <span className="block font-medium">{g.titel}</span>
                  <span className="block text-sm text-muted">{g.tekst}</span>
                </ListeRaekke>
              ))}
            </Liste>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
