import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { getProduct } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site";
import { PurchaseNotice } from "@/components/purchase-notice";
import {
  CreateCardIcon,
  ScanIcon,
  StampIcon,
  RewardIcon,
  ReturnVisitIcon,
  ProgressIcon,
  ReturningIcon,
} from "@/components/illustrations";

/**
 * SEO-landingsside for "stempelkort" / "digitalt stempelkort".
 *
 * REGEL FOR DENNE SIDE: der må kun stå funktioner, der findes i produktet.
 * Alt herunder er verificeret i koden — program-wizarden
 * (`src/app/dashboard/loyalitet/programmer/program-wizard.tsx`), domænets
 * enums (`src/lib/loyalty/constants.ts`), kundens kort (`/kort/[token]`),
 * selvtilmelding (`/kort/tilmeld/[slug]`) og stempel-/indløsningsflowet
 * (`src/lib/loyalty/service.ts`).
 *
 * Skriv IKKE noget om Apple/Google Wallet, kassesystem-integration, MobilePay,
 * push-beskeder, SMS, e-mailmarketing, automatisk stempling uden personale
 * eller flere afdelinger pr. konto. Intet af det findes.
 */

const title = "Digitalt stempelkort til virksomheder";
const description =
  "Få et digitalt stempelkort, der får kunderne til at komme igen. Kunden samler stempler på mobilen uden app, du bestemmer selv antal stempler og belønning. Se hvordan det virker.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "digitalt stempelkort",
    "stempelkort",
    "digitale stempelkort",
    "stempelkort app",
    "elektronisk stempelkort",
    "digitalt loyalitetskort",
    "loyalitetsprogram",
    "kundeklub",
    "stempelkort til café",
    "stempelkort til frisør",
  ],
  alternates: { canonical: "/stempelkort" },
  openGraph: {
    type: "website",
    title: `${title} — få kunderne til at komme igen`,
    description,
    url: "/stempelkort",
  },
};

/* ------------------------------------------------------------------ data */

/** Trin-for-trin. Rækkefølgen matcher det faktiske flow i produktet. */
const STEPS = [
  {
    Icon: CreateCardIcon,
    title: "Du opretter stempelkortet",
    body: "Vælg hvor mange stempler der skal til, hvad kunden optjener, og hvad kortet hedder. Du vælger farve og en kort tekst, så kortet ligner din forretning. Skal du hurtigt i gang, kan du starte fra en færdig skabelon til café, restaurant, frisør eller klinik.",
  },
  {
    Icon: ScanIcon,
    title: "Kunden får sit kort ved at scanne",
    body: "Gæsten scanner QR-koden på din stander og opretter kortet på få sekunder. Kortet er en helt almindelig webside — der er ingen app at hente og ingen konto, kunden skal oprette først.",
  },
  {
    Icon: StampIcon,
    title: "Personalet giver et stempel",
    body: "Kunden viser sit kort, personalet åbner det og trykker én gang. Stemplet lander med det samme, og kunden ser fremgangen på sin egen skærm. Kun personale med adgang til din forretning kan stemple.",
  },
  {
    Icon: RewardIcon,
    title: "Kunden låser belønningen op",
    body: "Når kortet er fuldt, står belønningen klar på kundens kort. Personalet indløser den, når kunden bruger den, og kortet starter forfra efter de regler, du har valgt.",
  },
  {
    Icon: ReturnVisitIcon,
    title: "Og har en grund til at komme igen",
    body: "Kunden går ud ad døren med fremskridt mod noget, de kun kan hente hos dig. Det er hele pointen: næste gang står valget ikke længere mellem dig og de andre på lige fod.",
  },
];

/** Belønningstyper — matcher `RewardType` i src/lib/loyalty/constants.ts. */
const REWARDS = [
  { label: "Gratis produkt", body: "Den tiende kaffe, en dessert, et stykke brød." },
  { label: "Beløb i rabat", body: "Et fast beløb trukket fra næste køb." },
  { label: "Procent i rabat", body: "Fx 20 % på næste besøg." },
  { label: "En ydelse", body: "En behandling, en service, en ekstra ting oveni." },
  { label: "En gave", body: "Noget håndgribeligt, kunden får med." },
  { label: "Noget du selv beskriver", body: "Din egen formulering, hvis intet af ovenstående passer." },
];

/** Brancheeksempler. Tallene er de faktiske skabeloner i produktet. */
const INDUSTRIES = [
  {
    name: "Café og kaffebar",
    body: "Et køb giver et stempel, og det tiende er gratis. Den klassiske kaffeaftale, bare uden papkort der falder fra hinanden i lommen.",
    template: "1 køb = 1 stempel · 10 stempler = gratis kaffe",
  },
  {
    name: "Restaurant og takeaway",
    body: "Et besøg giver et stempel. Efter otte besøg står der en dessert eller en ret klar til gæsten.",
    template: "1 besøg = 1 stempel · 8 stempler = gratis dessert",
  },
  {
    name: "Frisør og barber",
    body: "Klip nummer seks udløser en rabat. Det gør det lidt lettere for kunden at booke hos dig igen frem for at prøve en ny salon.",
    template: "1 besøg = 1 stempel · 6 stempler = 20 % rabat",
  },
  {
    name: "Klinik og skønhed",
    body: "Behandlinger tæller op mod en bonus, kunden selv vælger. Passer til neglesalon, hudpleje og mindre klinikker med faste forløb.",
    template: "1 behandling = 1 stempel · 5 stempler = valgfri bonus",
  },
  {
    name: "Butik",
    body: "Beløn dem, der handler hos dig igen og igen. Du kan lade et stempel følge et køb, et besøg eller et beløb, kunden handler for.",
    template: "Du sætter selv antal og belønning",
  },
  {
    name: "Bilvask, værksted og fitness",
    body: "Alt hvor den samme kunde kommer tilbage med jævne mellemrum. Er der genbesøg i din forretning, er der en grund til et stempelkort.",
    template: "Du sætter selv antal og belønning",
  },
];

const FAQ = [
  {
    q: "Hvad er et digitalt stempelkort?",
    a: "Et digitalt stempelkort er den digitale udgave af papkortet med stempler. I stedet for et fysisk kort ligger kundens stempler på telefonen. Når kunden har samlet det antal stempler, du har bestemt, kan de hente den belønning, du har valgt — for eksempel den tiende kaffe gratis.",
  },
  {
    q: "Skal mine kunder hente en app?",
    a: "Nej. Kortet er en almindelig webside, kunden får ved at scanne QR-koden på din stander. Der er ingen app at downloade og ingen App Store. Kunden kan lægge kortet på telefonens hjemmeskærm, så det ligner en app og er lige ved hånden næste gang.",
  },
  {
    q: "Hvordan får kunden sit stempelkort?",
    a: "Kunden scanner QR-koden på standeren og opretter kortet på få sekunder. Du kan også oprette en kunde manuelt fra dit dashboard, hvis det passer bedre til situationen — for eksempel når nogen står ved disken uden telefonen fremme.",
  },
  {
    q: "Hvordan giver jeg et stempel?",
    a: "Kunden viser sit kort, du åbner det og trykker én gang. Kun personale, der er logget ind med adgang til din forretning, kan give stempler — kunden kan altså ikke stemple sig selv.",
  },
  {
    q: "Kan jeg selv vælge antal stempler og belønningen?",
    a: "Ja. Du bestemmer, hvor mange stempler der skal til, og hvad kunden optjener: et gratis produkt, et beløb i rabat, en procentrabat, en ydelse, en gave eller noget, du selv formulerer. Du kan også vælge, om kortet nulstilles efter en belønning, eller om overskydende stempler følger med over på det næste kort.",
  },
  {
    q: "Kan stempelkortet tilpasses min forretning?",
    a: "Du vælger kortets navn, farve og en kort tekst, og dit logo vises for kunden, når du har lagt det op i dit dashboard. Kortet bærer altså din forretnings udtryk, ikke vores.",
  },
  {
    q: "Hvad forhindrer, at nogen samler stempler uden at købe noget?",
    a: "Du sætter reglerne: hvor mange stempler der højst må gives pr. køb, hvor mange en kunde kan få på én dag, og hvor lang tid der mindst skal gå mellem to stempler. Du kan også lade stempler udløbe efter et antal dage. Reglerne håndhæves af systemet, ikke af hukommelsen hos den, der står ved kassen.",
  },
  {
    q: "Hvad sker der, når stempelkortet er fuldt?",
    a: "Belønningen står klar på kundens kort, og personalet indløser den, når kunden bruger den. Derefter starter kortet forfra efter de regler, du har valgt — enten på nul eller med de stempler, kunden har samlet ud over det krævede antal.",
  },
  {
    q: "Kan jeg have flere stempelkort samtidig?",
    a: "Ja. Du kan oprette flere programmer i din forretning, for eksempel et almindeligt kort og et til en kampagne, og sætte dem aktive eller på pause hver for sig.",
  },
  {
    q: "Hvad sker der, hvis kunden skifter telefon?",
    a: "Kortet kan altid åbnes fra sit eget link. Vil kunden være sikker på at finde det igen på en ny telefon, kan de gratis oprette en konto fra kortet og samle alle deres kort ét sted.",
  },
  {
    q: "Hvad er forskellen på et stempelkort og et loyalitetsprogram?",
    a: "Et stempelkort er den enkleste form for loyalitetsprogram: besøg tæller op mod én belønning, du selv har valgt. Et loyalitetsprogram kan derudover rumme rabatter og fordele, der ikke hænger på stempler — for eksempel en velkomstrabat eller en fordel til kunder, du gerne vil have tilbage. Begge dele findes i LoyalSum.",
  },
  {
    q: "Hvad koster et digitalt stempelkort?",
    a: "Stempelkortet er en del af LoyalSum Komplet. Du betaler for standeren én gang og et fast månedligt abonnement — se de aktuelle priser på produktsiden.",
  },
];

/* ------------------------------------------------------------------- page */

export default function StempelkortPage() {
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
          name: "Digitalt stempelkort",
          item: `${base}/stempelkort`,
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

      <main>
        {/* ---------------------------------------------------------- hero */}
        <section className="border-b border-border bg-dark text-dark-fg">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/15">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-secondary"
                  aria-hidden="true"
                />
                Digitalt stempelkort · uden app
              </span>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Digitalt stempelkort, der får kunderne til at{" "}
                <span className="text-secondary">komme igen</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-white/70">
                Beløn dine faste kunder med et digitalt stempelkort fra LoyalSum.
                Kunden samler stempler på mobilen, optjener den belønning du selv
                vælger — og får en grund til at vælge dig næste gang.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/signup" size="lg">
                  Kom i gang
                </ButtonLink>
                <ButtonLink href="#saadan" variant="outline-invert" size="lg">
                  Se hvordan det virker
                </ButtonLink>
              </div>
              <p className="mt-5 text-sm text-white/50">
                Ingen app for dine kunder · du bestemmer stempler og belønning
              </p>
            </div>

            {/* Skærmbillede fra det rigtige produkt — ikke en illustration.
                Faste dimensioner mod layoutskift; høj prioritet, da det er
                heroens LCP-element. */}
            <div className="lg:justify-self-end lg:pl-8">
              <div className="mx-auto w-full max-w-[330px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/stempelkort-app.webp"
                  alt="Kundens stempelkort på telefonen: Kaffekort hos Testcafe med 7 af 10 stempler samlet og belønningen gratis kaffe"
                  width={660}
                  height={720}
                  fetchPriority="high"
                  className="box-shape w-full border border-white/10 bg-white shadow-[0_30px_60px_-25px_rgba(0,0,0,0.6)]"
                />
                <p className="mt-3 text-center text-xs text-white/50">
                  Sådan ser kundens kort ud på telefonen
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------- hvad er et digitalt stempelkort */}
        <section className="bg-background">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hvad er et digitalt stempelkort?
            </h2>
            <p className="mt-4 leading-relaxed text-foreground/90">
              Et <strong>digitalt stempelkort</strong> er den digitale udgave af
              det klassiske papstempelkort. I stedet for et fysisk kort, kunden
              skal huske at have med, registreres stemplerne digitalt og ligger
              på kundens telefon. Når kunden har samlet det antal stempler, du
              har bestemt, kan de hente den belønning, du har valgt.
            </p>
            <p className="mt-4 leading-relaxed text-foreground/90">
              Princippet er det samme som altid — det er kun kortet, der har
              skiftet form. Til gengæld kan det ikke blive væk i en jakkelomme,
              og du kan se, hvor mange der er i gang med at samle op mod en
              belønning.
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                "Køb 9 kaffe — få den 10. gratis",
                "5 behandlinger — få en fordel på den næste",
                "6 besøg — lås op for en belønning",
              ].map((ex) => (
                <li
                  key={ex}
                  className="box-shape border border-border bg-card p-4 text-sm font-medium"
                >
                  {ex}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------------------ hvorfor det virker */}
        <section className="border-t border-border bg-muted-bg">
          <div className="mx-auto max-w-4xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Giv kunderne en grund til at vælge dig igen
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-foreground/90">
              En tilfreds kunde er ikke det samme som en fast kunde. Næste gang
              står de med de samme ti valgmuligheder som alle andre, og
              tilfredshed alene flytter sjældent beslutningen. Et stempelkort
              lægger noget i den anden vægtskål: kunden er allerede på vej mod
              noget, de kun kan hente hos dig.
            </p>
            <p className="mt-4 max-w-2xl leading-relaxed text-foreground/90">
              Det er den enkle mekanik, der gør papstempelkortet så sejlivet. Det
              digitale kort ændrer ikke på psykologien — det fjerner bare besværet
              og giver dig et overblik, papkortet aldrig kunne.
            </p>

            <ol className="mt-10 grid gap-3 sm:grid-cols-5">
              {[
                { label: "Besøg", Icon: ReturnVisitIcon },
                { label: "Stempel", Icon: StampIcon },
                { label: "Fremskridt", Icon: ProgressIcon },
                { label: "Belønning", Icon: RewardIcon },
                { label: "Næste besøg", Icon: ReturningIcon },
              ].map((step, i) => (
                <li
                  key={step.label}
                  className="box-shape border border-border bg-card p-4 text-center"
                >
                  <span className="text-xs font-medium text-muted">{i + 1}</span>
                  <step.Icon className="mx-auto mt-1 h-8 w-8 text-accent" />
                  <p className="mt-1 font-bold tracking-tight">{step.label}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------- sådan fungerer det */}
        <section id="saadan" className="border-t border-border bg-background">
          <div className="mx-auto max-w-4xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Sådan fungerer LoyalSums digitale stempelkort
            </h2>
            <p className="mt-3 max-w-2xl text-muted">
              Fem trin fra du opretter kortet, til kunden står i døren igen.
            </p>

            <ol className="mt-10 space-y-8">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-5">
                  <div
                    className="btn-shape grid h-10 w-10 shrink-0 place-items-center bg-accent font-bold text-accent-fg"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </div>
                  <s.Icon className="hidden h-10 w-10 shrink-0 text-accent sm:block" />
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">
                      {s.title}
                    </h3>
                    <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-10">
              <ButtonLink href="/signup" size="lg">
                Kom i gang
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------- digitalt vs. fysisk */}
        <section className="border-t border-border bg-muted-bg">
          <div className="mx-auto max-w-4xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Digitalt eller fysisk stempelkort?
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-foreground/90">
              Papkortet har én stor fordel: det kræver ingenting af nogen. Det
              koster et tryk og en stempelpude, og alle forstår det med det
              samme. Vælger du digitalt, er det fordi du vil have styr på
              stemplerne og se, hvad der egentlig sker i din kundeklub.
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="box-shape border border-border bg-card p-6">
                <h3 className="font-bold tracking-tight">Fysisk stempelkort</h3>
                <ul className="mt-4 space-y-2 text-sm text-muted">
                  <li>Bliver glemt eller væk</li>
                  <li>Skal printes og genoptrykkes</li>
                  <li>Ændrer du belønningen, gælder de gamle kort stadig</li>
                  <li>Ingen indsigt i hvem der samler, eller hvor mange</li>
                  <li>Stempelpuden kan lånes af andre end personalet</li>
                </ul>
              </div>
              <div className="box-shape border border-accent/30 bg-accent/5 p-6">
                <h3 className="font-bold tracking-tight">Digitalt stempelkort</h3>
                <ul className="mt-4 space-y-2 text-sm text-muted">
                  <li>Ligger på kundens telefon og kan hentes frem igen</li>
                  <li>Ingen tryk, intet oplag, ingen genoptryk</li>
                  <li>Du ændrer belønning og regler ét sted</li>
                  <li>Du kan se aktiviteten og hvem der er tæt på en belønning</li>
                  <li>Kun personale med adgang kan give stempler</li>
                </ul>
              </div>
            </div>

            <p className="mt-6 text-sm text-muted">
              Har din forretning få genbesøg og ingen interesse i tallene bagved,
              gør papkortet det fint. Det digitale kort betaler sig, når kunderne
              kommer igen — og du vil vide hvor mange.
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------- belønninger */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-4xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Du bestemmer, hvad dine kunder skal optjene
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-foreground/90">
              En café og en frisør har vidt forskellig økonomi i hvert besøg.
              Derfor er der ingen fast opskrift: du vælger selv antallet af
              stempler, hvad der udløser dem, og hvad kunden får til sidst.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {REWARDS.map((r) => (
                <div
                  key={r.label}
                  className="box-shape border border-border bg-card p-5"
                >
                  <h3 className="font-bold tracking-tight">{r.label}</h3>
                  <p className="mt-1 text-sm text-muted">{r.body}</p>
                </div>
              ))}
            </div>

            <h3 className="mt-12 text-lg font-bold tracking-tight">
              Hvornår tæller et stempel?
            </h3>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted">
              Du vælger, om et stempel følger et køb, et besøg, et beløb kunden
              handler for, eller om personalet giver det manuelt. Til kampagner
              kan du lave et program, der kun kører i en periode.
            </p>

            <h3 className="mt-10 text-lg font-bold tracking-tight">
              Du sætter reglerne — systemet holder dem
            </h3>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted">
              Sæt hvor mange stempler der højst må gives pr. køb, hvor mange en
              kunde kan få på én dag, og hvor lang tid der mindst skal gå mellem
              to stempler. Du kan lade stempler udløbe efter et antal dage, og
              du bestemmer, om kortet nulstilles efter en belønning, eller om
              overskydende stempler følger med videre. Reglerne håndhæves af
              systemet — ikke af hukommelsen hos den, der står ved kassen en
              travl fredag.
            </p>

            <div className="mt-8 box-shape border border-secondary/30 bg-secondary/10 p-5">
              <h3 className="font-bold tracking-tight">
                Belønninger kobles aldrig til anmeldelser
              </h3>
              <p className="mt-2 text-sm leading-relaxed">
                Det er bevidst umuligt at give stempler eller belønninger for, at
                en kunde skriver, ændrer eller sletter en offentlig anmeldelse.
                Den slags er i strid med både Googles og Trustpilots regler og
                kan koste dig dine anmeldelser. Derfor holder LoyalSum
                loyalitetsprogrammet og{" "}
                <Link href="/reviewstander" className="font-medium text-accent">
                  anmeldelserne
                </Link>{" "}
                adskilt.
              </p>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- brancher */}
        <section className="border-t border-border bg-muted-bg">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Digitalt stempelkort til din virksomhed
            </h2>
            <p className="mt-3 max-w-2xl text-muted">
              Kommer den samme kunde tilbage flere gange, giver et stempelkort
              mening. Her er, hvordan det typisk sættes op.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {INDUSTRIES.map((b) => (
                <div
                  key={b.name}
                  className="box-shape flex flex-col border border-border bg-card p-6"
                >
                  <h3 className="font-bold tracking-tight">{b.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                    {b.body}
                  </p>
                  <p className="mt-4 text-xs font-medium text-accent">
                    {b.template}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ del af platformen */}
        <section className="border-t border-border bg-dark text-dark-fg">
          <div className="mx-auto max-w-4xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Stempelkortet er kun begyndelsen
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-white/70">
              Dit digitale stempelkort er en del af LoyalSum — platformen der
              hjælper dig med både at få nye kunder og få de eksisterende til at
              komme igen. Et stempelkort motiverer genbesøget. Men en kunde, der
              også skriver en god anmeldelse, sender de næste kunder din vej.
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <div className="box-shape border border-white/10 bg-white/5 p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-secondary">
                  Flere nye kunder
                </p>
                <h3 className="mt-1 font-bold">Anmeldelser og synlighed</h3>
                <p className="mt-2 text-sm text-white/70">
                  Standeren gør det let for kunden at anmelde dig — eller sende
                  dig feedback direkte, hvis de hellere vil det.
                </p>
              </div>
              <div className="box-shape border border-white/10 bg-white/5 p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-secondary">
                  Flere genbesøg
                </p>
                <h3 className="mt-1 font-bold">Stempelkort og belønninger</h3>
                <p className="mt-2 text-sm text-white/70">
                  Stempelkort, rabatter til udvalgte kunder og overblik over,
                  hvem der er tæt på en belønning.
                </p>
              </div>
            </div>

            <p className="mt-8">
              <Link href="/" className="font-medium text-secondary">
                Se hele LoyalSum →
              </Link>
            </p>
          </div>
        </section>

        {/* --------------------------------------------------------------- pris */}
        {komplet ? (
          <section className="border-t border-border bg-background">
            <div className="mx-auto max-w-4xl px-4 py-16">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Hvad koster et digitalt stempelkort?
              </h2>
              <p className="mt-4 max-w-2xl leading-relaxed text-foreground/90">
                Stempelkortet får du med <strong>{komplet.name}</strong>, som
                samler stempelkort, anmeldelser og opslag på én stander.
              </p>

              <PurchaseNotice className="mt-8" />

              <div className="mt-4 box-shape border border-border bg-card p-6">
                <dl className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-sm text-muted">Stander</dt>
                    <dd className="text-xl font-bold">
                      {formatCurrency(komplet.price)}
                    </dd>
                  </div>
                  {komplet.setupPrice ? (
                    <div>
                      <dt className="text-sm text-muted">
                        Opsætning (engangs)
                      </dt>
                      <dd className="text-xl font-bold">
                        {formatCurrency(komplet.setupPrice)}
                      </dd>
                    </div>
                  ) : null}
                  {komplet.monthlyPrice ? (
                    <div>
                      <dt className="text-sm text-muted">Abonnement</dt>
                      <dd className="text-xl font-bold">
                        {formatCurrency(komplet.monthlyPrice)}
                        <span className="text-sm font-normal text-muted">
                          /md
                        </span>
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <p className="mt-4 text-sm text-muted">
                  Alle priser er ex moms. Køber du flere standere, falder prisen
                  pr. stk.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href={`/produkter/${komplet.slug}`} size="lg">
                    Se {komplet.name}
                  </ButtonLink>
                  <ButtonLink href="/produkter" variant="outline" size="lg">
                    Sammenlign alle priser
                  </ButtonLink>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------------- FAQ */}
        <section className="border-t border-border bg-muted-bg">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ofte stillede spørgsmål om digitale stempelkort
            </h2>
            <div className="mt-8 divide-y divide-border border-y border-border">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="cursor-pointer list-none font-bold tracking-tight marker:content-none">
                    <span className="flex items-start justify-between gap-4">
                      {item.q}
                      <span
                        className="mt-1 shrink-0 text-accent transition-transform group-open:rotate-45"
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </div>

            <p className="mt-8 text-sm text-muted">
              Læs videre:{" "}
              <Link
                href="/blog/hvor-mange-stempler-stempelkort"
                className="font-medium text-accent"
              >
                hvor mange stempler bør et stempelkort have?
              </Link>{" "}
              eller{" "}
              <Link
                href="/blog/kundeklub-uden-app-guide"
                className="font-medium text-accent"
              >
                guiden til en kundeklub uden app
              </Link>
              .
            </p>
          </div>
        </section>

        {/* --------------------------------------------------------- final CTA */}
        <section className="border-t border-border bg-dark text-dark-fg">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Giv kunderne en grund til at komme igen
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/70">
              Opret dit digitale stempelkort med LoyalSum, og begynd at gøre
              flere førstegangskunder til stamkunder.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/signup" size="lg">
                Kom i gang
              </ButtonLink>
              <ButtonLink
                href="/produkter/loyalsum-komplet"
                variant="outline-invert"
                size="lg"
              >
                Se priser
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
