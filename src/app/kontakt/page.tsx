import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { KontaktForm } from "@/components/kontakt-form";
import { ButtonLink } from "@/components/ui/button";
import { IkonChip, type ChipFarve } from "@/components/ui/ikon-chip";
import {
  AdresseDuo,
  ArtikelDuo,
  EmailDuo,
  FeedbackDuo,
  KundeDuo,
  KvitteringDuo,
  RabatBeloebDuo,
  SkjoldDuo,
  StempelDuo,
  StjerneDuo,
  UrDuo,
} from "@/components/duotone-ikoner";
import { COMPANY, SITE_NAME } from "@/lib/constants";
import { SVARTID, KONTORTID } from "@/lib/kontakt";

/**
 * Kontakt os.
 *
 * SIDEN SKAL KUNNE BRUGES UDEN AT SKRIVE. De fleste henvendelser på en side
 * som denne er spørgsmål, der allerede er besvaret et andet sted — derfor står
 * genvejene ("Inden du skriver") som deres egen sektion med et ikon pr.
 * spørgsmål, så man kan finde sit eget uden at læse dem alle. Det er ikke for
 * at slippe for at svare: et svar, man får med det samme, er bedre end et
 * svar, der kommer i morgen.
 *
 * AFSNITTET TIL SLUTKUNDER ER IKKE PYNT. Adressen står på hvert eneste
 * stempelkort, en butik deler ud, så vi FÅR beskeder fra butikkernes kunder om
 * manglende stempler. Dem kan vi ikke hjælpe med: vi er databehandler for
 * butikken og hverken må eller kan rette i deres kunders kort. Står det ikke
 * her, skriver folk alligevel — og venter så på et svar, der ikke kommer.
 *
 * SIDEN VAR DEN ENESTE OFFENTLIGE UDEN HUSETS RYTME. Den havde ingen hero,
 * ingen sektionsgrunde, ingen hårlinjer og ikke ét ikon — én hvid flade fra
 * header til footer, hvor resten af sitet skifter mellem lys og mørk og lader
 * et ikonfelt bære hvert punkt. Samme halvhed som da salgssiderne ikke fik
 * moderniseringen, bare et år senere og på den side, hvor en tvivlende kunde
 * lander. Formen er ny; TEKSTEN ER DEN SAMME — der er ikke tilføjet et eneste
 * løfte, og de tre punkter i heroen står ordret i sidens egen brødtekst og i
 * `SVARTID`. Et layout må aldrig være dét, der lover noget nyt.
 *
 * Der gemmes intet fra formularen hos os; se src/lib/kontakt.ts.
 */
export const metadata: Metadata = {
  title: "Kontakt os",
  // 198 tegn klippede SVARTID væk — og svarløftet er netop dét, der er værd
  // at læse i et søgeresultat. Første halvdel er forkortet, så den anden
  // overlever.
  description: `Skriv til ${SITE_NAME} om bestilling, priser eller din konto. ${SVARTID}`,
  alternates: { canonical: "/kontakt" },
};

/**
 * De tre ting, man vil vide, FØR man skriver.
 *
 * Alle tre står i forvejen på siden: svartiden er konstanten, "svar fra et
 * menneske" står i heroens egen brødtekst, og "beskeden gemmes ikke" er
 * formularens privatlivslinje. De er flyttet op og har fået et tegn — de er
 * ikke skrevet.
 */
const LOEFTER = [
  {
    Icon: UrDuo,
    titel: "Svar inden for få minutter",
    tekst: `Skriver du inden for kontortiden (${KONTORTID}).`,
  },
  {
    Icon: KundeDuo,
    titel: "Et menneske svarer",
    tekst: "Vi er et lille hold — der sidder ingen robot i den anden ende.",
  },
  {
    Icon: SkjoldDuo,
    titel: "Beskeden gemmes ikke",
    tekst: "Den står i vores mailboks og ikke i systemet.",
  },
];

/**
 * Spørgsmål, der kan besvares uden at vente på os.
 *
 * IKONET SKAL SIGE DESTINATIONEN og ikke spørgsmålet: man scanner en
 * kortrække efter dét, man leder efter, og et tegn, der gentager
 * overskriften, hjælper ikke. Kvitteringen står ved betalingsbetingelserne
 * og pengesedlen ved prisen — ikke omvendt.
 */
const GENVEJE: {
  href: string;
  titel: string;
  tekst: string;
  Icon: React.ComponentType<{ className?: string }>;
  farve: ChipFarve;
}[] = [
  {
    href: "/produkter",
    titel: "Hvad koster det?",
    tekst: "Alle tre varer med priser, mængderabat og hvad der er med.",
    Icon: RabatBeloebDuo,
    farve: "guld",
  },
  {
    href: "/stempelkort",
    titel: "Hvordan virker stempelkortet?",
    tekst: "Uden app for kunden, og scan-til-stempel over disken.",
    Icon: StempelDuo,
    farve: "accent",
  },
  {
    href: "/reviewstander",
    titel: "Hvordan får jeg flere anmeldelser?",
    tekst: "Sådan virker standeren, og hvad kunden møder efter et scan.",
    Icon: StjerneDuo,
    farve: "guld",
  },
  {
    href: "/blog",
    titel: "Guides og baggrund",
    tekst: "Artikler om loyalitet, anmeldelser, NFC og QR.",
    Icon: ArtikelDuo,
    farve: "blaa",
  },
  {
    href: "/handelsbetingelser",
    titel: "Levering, opsigelse og betaling",
    tekst: `Handelsbetingelserne — standeren sendes typisk inden for ${COMPANY.deliveryDays}.`,
    Icon: KvitteringDuo,
    farve: "violet",
  },
  {
    href: "/privatliv",
    titel: "Hvad gør I med mine data?",
    tekst: "Privatlivspolitikken, og hvor længe vi gemmer hvad.",
    Icon: SkjoldDuo,
    farve: "groen",
  },
];

export default function KontaktPage() {
  return (
    <>
      <SiteHeader />
      <main id="indhold">
        {/* ------------------------------------------------------------ hero */}
        <section className="relative isolate overflow-hidden border-b border-border bg-dark px-4 py-16 text-white sm:py-20">
          {/*
            SKÆRET GØR ARBEJDET, FOR DER ER INTET AT FOTOGRAFERE.
            De øvrige heroer bærer et produktfoto, fordi de sælger noget, der
            står på en disk. En kontaktside sælger et SVAR. Et stockfoto af en
            supportmedarbejder ville være præcis dét, huset ikke gør — vi har
            ingen rigtige medarbejderfotos, og et lånt ansigt ville være en
            påstand om et menneske, der ikke har sagt ja.
          */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              backgroundImage:
                "radial-gradient(58% 58% at 50% 0%, rgba(26,144,137,0.24), transparent 66%), radial-gradient(34% 34% at 88% 8%, rgba(217,164,65,0.12), transparent 62%)",
            }}
          />

          <div className="mx-auto max-w-side">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-white/60">
                Kontakt
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Skriv til os
              </h1>
              <p className="mx-auto mt-4 max-w-xl leading-relaxed text-white/80">
                Uanset om du overvejer en stander, er kunde i forvejen, eller
                bare vil vide, om LoyalSum passer til din forretning — så skriv.
                Vi er et lille hold, og du får svar fra et menneske.
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <ButtonLink href="#skriv" size="lg">
                  Send en besked
                </ButtonLink>
                {/*
                  MAILADRESSEN STÅR SOM SIG SELV og ikke som "Skriv til os".
                  Samme regel som i kundemailene: der står aldrig "klik her",
                  fordi en adresse, man kan læse, er en adresse, man kan skrive
                  ned, gemme eller kontrollere. Her er den oven i købet dét,
                  folk kom efter.
                */}
                <ButtonLink
                  href={`mailto:${COMPANY.email}`}
                  size="lg"
                  variant="outline-invert"
                >
                  {COMPANY.email}
                </ButtonLink>
              </div>
            </div>

            {/* De tre løfter — sidens egen tekst, løftet op og givet et tegn. */}
            <ul className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
              {LOEFTER.map((l) => (
                <li
                  key={l.titel}
                  className="box-shape border border-white/12 bg-white/5 p-5 text-left backdrop-blur-sm"
                >
                  <l.Icon className="h-7 w-7 text-accent-lys" />
                  <p className="mt-3 font-semibold tracking-tight">{l.titel}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">
                    {l.tekst}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* -------------------------------------------------------- formular */}
        <section
          id="skriv"
          aria-labelledby="skriv-titel"
          className="scroll-mt-6 px-4 py-16 sm:py-20"
        >
          <div className="mx-auto grid max-w-side items-start gap-10 lg:grid-cols-[1.15fr_1fr]">
            <div className="order-2 lg:order-1">
              <h2
                id="skriv-titel"
                className="text-2xl font-bold tracking-tight sm:text-3xl"
              >
                Send en besked
              </h2>
              <p className="mt-2 max-w-xl text-muted">
                Vi skal bruge navn, mailadresse og en besked — resten er
                frivilligt.
              </p>
              <div className="mt-7">
                <KontaktForm />
              </div>
            </div>

            <div className="order-1 space-y-4 lg:order-2">
              {/*
                KORTET ER EN LISTE MED TEGN OG IKKE FIRE AFSNIT.
                Her stod mail, svartid, dashboard-genvejen og adressen som lige
                tunge afsnit adskilt af hårlinjer, og øjet kunne ikke se, at
                det var fire FORSKELLIGE ting. Ikonfeltet gør hver linje til en
                linje: en adresse man skriver TIL, et sted man er, og en
                kortere vej ind for den, der allerede er kunde.
              */}
              <div className="box-shape border border-border bg-card p-6 shadow-[var(--hoejde-1)]">
                <h3 className="font-bold tracking-tight">Skriv direkte</h3>

                <ul className="mt-5 space-y-5">
                  <li className="flex items-start gap-3.5">
                    <IkonChip icon={EmailDuo} size="lg" farve="accent" />
                    <div className="min-w-0">
                      <a
                        href={`mailto:${COMPANY.email}`}
                        className="trykmaal inline-block break-words font-semibold text-accent hover:underline"
                      >
                        {COMPANY.email}
                      </a>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {SVARTID}
                      </p>
                    </div>
                  </li>

                  {/* ER DU ALLEREDE KUNDE, er der en kortere vej ind: skriver
                      du fra hjælpesiden i dashboardet, kender vi butikken i
                      forvejen, og så slipper vi begge for runden med "hvem
                      skriver du fra?". Derfor står linjen her og ikke gemt
                      nederst på siden. */}
                  <li className="flex items-start gap-3.5">
                    <IkonChip icon={FeedbackDuo} size="lg" farve="violet" />
                    <div className="min-w-0">
                      <p className="font-semibold tracking-tight">
                        Er du allerede kunde?
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        Skriv fra{" "}
                        <a
                          href="/dashboard/hjaelp#support"
                          className="font-medium text-accent hover:underline"
                        >
                          Hjælp i dashboardet
                        </a>{" "}
                        — så ved vi, hvilken butik du skriver fra, og kan svare
                        uden at spørge først.
                      </p>
                    </div>
                  </li>

                  {/*
                    KUN NAVN OG ADRESSE HER.
                    Selskabsnavn og CVR stod også på dette kort, men de hører
                    til dér, hvor de er et lovkrav: footeren (på hver eneste
                    side, også denne) samt /handelsbetingelser og /privatliv.
                    På en kontaktside er de støj — den skal svare på "hvor er
                    I, og hvordan får jeg fat i jer". Mailen står lige ovenfor
                    og gentages derfor ikke.
                  */}
                  <li className="flex items-start gap-3.5">
                    <IkonChip icon={AdresseDuo} size="lg" farve="blaa" />
                    <div className="min-w-0">
                      <p className="font-semibold tracking-tight">
                        {SITE_NAME}
                      </p>
                      <address className="mt-1 text-sm not-italic leading-relaxed text-muted">
                        {COMPANY.address}
                        <br />
                        {COMPANY.postalCode} {COMPANY.city}
                      </address>
                    </div>
                  </li>

                  {/* Telefonen står i COMPANY og vises kun, hvis der ER et
                      nummer — et tomt felt på en kontaktside er værre end
                      ingen linje. */}
                  {COMPANY.phone ? (
                    <li className="flex items-start gap-3.5">
                      <IkonChip icon={KundeDuo} size="lg" farve="groen" />
                      <div className="min-w-0">
                        <p className="font-semibold tracking-tight">Telefon</p>
                        <p className="mt-1 text-sm text-muted">
                          {COMPANY.phone}
                        </p>
                      </div>
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="box-shape sektion-skaer border border-border bg-muted-bg p-6">
                <div className="flex items-start gap-3.5">
                  <IkonChip icon={StempelDuo} size="lg" farve="guld" />
                  <div className="min-w-0">
                    <h3 className="font-bold tracking-tight">
                      Har du et stempelkort fra en butik?
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      Så skal du skrive til butikken og ikke til os. Vi leverer
                      systemet, men det er butikken, der giver stempler og
                      belønninger, og vi hverken må eller kan rette i deres
                      kunders kort.
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      Har du mistet linket til dit kort, får du det igen ved at
                      scanne butikkens skilt — og har du en konto hos os, ligger
                      alle dine kort på{" "}
                      <a
                        href="/mine-kort"
                        className="font-medium text-accent hover:underline"
                      >
                        Mine stempelkort
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- genveje */}
        <section
          aria-labelledby="inden"
          className="sektion-skaer border-t border-border bg-muted-bg px-4 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-side">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-accent">Selvbetjening</p>
              <h2
                id="inden"
                className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
              >
                Inden du skriver
              </h2>
              <p className="mt-3 text-muted">
                De fleste spørgsmål er besvaret her, og så behøver du ikke vente
                på os.
              </p>
            </div>

            {/*
              KORT FREM FOR EN LISTE. Seks rækker med en lille pil i højre
              kant er en indholdsfortegnelse; man læser den fra en ende af.
              Et gitter med et tegn pr. kort kan SCANNES — og det er dét, en
              genvejssektion skal kunne, ellers er den endnu en tekst, man
              springer over på vej til formularen.
            */}
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {GENVEJE.map((g) => (
                <li key={g.href}>
                  <a
                    href={g.href}
                    className="box-shape group flex h-full flex-col border border-border bg-card p-5 shadow-[var(--hoejde-1)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--hoejde-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <IkonChip icon={g.Icon} size="lg" farve={g.farve} />
                    <p className="mt-4 font-semibold tracking-tight transition-colors group-hover:text-accent">
                      {g.titel}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      {g.tekst}
                    </p>
                    {/* `mt-auto` holder pilen i bund, så kortene i en række
                        ender ens, uanset hvor lang overskriften er. */}
                    <span
                      aria-hidden="true"
                      className="mt-auto pt-4 text-sm font-semibold text-accent"
                    >
                      Læs mere →
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------------- afslutning */}
        {/*
          SIDEN SLUTTER SOM RESTEN AF HUSET.
          Hver salgsside ender i en mørk flade, og footeren rejser sig op over
          den med afrundede hjørner (`overMoerk`). Kontaktsiden endte på den
          lyse sektionsgrund, og da footeren har PRÆCIS samme grund, smeltede
          de to sammen til ét bånd uden kant.

          BUNDEN GENTAGER IKKE HEROEN. Den er til den, der er rullet HELE vejen
          ned gennem genvejene uden at finde sit svar — derfor peger den
          tilbage til formularen og viser adressen én gang mere, og den sælger
          ingenting. En "Kom i gang"-knap her ville svare på et andet spørgsmål
          end det, man kom med.
        */}
        <section className="border-t border-border bg-dark text-dark-fg">
          <div className="mx-auto max-w-side px-4 py-20 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Fandt du ikke svaret?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/70">
              Så skriv — det er derfor, siden er her. {SVARTID}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="#skriv" variant="secondary" size="lg">
                Send en besked
              </ButtonLink>
              <ButtonLink
                href={`mailto:${COMPANY.email}`}
                variant="outline-invert"
                size="lg"
              >
                {COMPANY.email}
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
      {/* Sidste sektion er mørk — se `overMoerk` i SiteFooter. */}
      <SiteFooter overMoerk />
    </>
  );
}
