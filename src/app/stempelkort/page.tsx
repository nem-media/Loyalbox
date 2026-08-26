import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { getProduct } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site";
import { PurchaseNotice } from "@/components/purchase-notice";
import { IndustryBadge, type Branche } from "@/components/industry-icons";
import {
  CreateCardIcon,
  ScanIcon,
  StampIcon,
  RewardIcon,
  ReturnVisitIcon,
  ProgressIcon,
  ReturningIcon,
  FreeProductIcon,
  AmountOffIcon,
  PercentOffIcon,
  ServiceIcon,
  GiftIcon,
  CustomRewardIcon,
} from "@/components/illustrations";
import { StempelkortVisual } from "@/components/home/hero-visual";
import {
  EARN_MODEL_LABELS,
  EARN_MODEL_HELP,
  type EarnModel,
} from "@/lib/loyalty/constants";

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

/**
 * Belønningstyper — matcher `RewardType` i src/lib/loyalty/constants.ts.
 *
 * `chip` er, hvordan belønningen står på KUNDENS kort, og den er tegnet med
 * præcis samme pille som i `StempelkortVisual`. Det er dét, der gør listen
 * til en visning af produktet frem for seks felter med tekst i: læseren har
 * lige set pillen i heroen og genkender den her.
 */
const REWARDS = [
  {
    Icon: FreeProductIcon,
    label: "Gratis produkt",
    body: "Den tiende kaffe, en dessert, et stykke brød.",
    chip: "Gratis kaffe",
  },
  {
    Icon: AmountOffIcon,
    label: "Beløb i rabat",
    body: "Et fast beløb trukket fra næste køb.",
    chip: "50 kr. rabat",
  },
  {
    Icon: PercentOffIcon,
    label: "Procent i rabat",
    body: "Fx 20 % på næste besøg.",
    chip: "20 % rabat",
  },
  {
    Icon: ServiceIcon,
    label: "En ydelse",
    body: "En behandling, en service, en ekstra ting oveni.",
    chip: "Gratis behandling",
  },
  {
    Icon: GiftIcon,
    label: "En gave",
    body: "Noget håndgribeligt, kunden får med.",
    chip: "En gave til dig",
  },
  {
    Icon: CustomRewardIcon,
    label: "Noget du selv beskriver",
    body: "Din egen formulering, hvis intet af ovenstående passer.",
    chip: "Din egen tekst",
  },
];

/** Optjeningsmodellerne i den rækkefølge, wizarden viser dem. */
const EARN_MODELS: EarnModel[] = [
  "per_purchase",
  "per_visit",
  "per_amount",
  "manual",
  "campaign",
];

/**
 * Spærrerne mod misbrug. Alle fem er faktiske felter på et program — se
 * `program-wizard.tsx` og FAQ'en længere nede, som beskriver de samme fem.
 */
const REGLER = [
  "Højst et bestemt antal stempler pr. køb",
  "Højst et bestemt antal stempler pr. kunde pr. dag",
  "En mindste tid mellem to stempler",
  "Stempler kan udløbe efter et antal dage",
  "Kortet nulstilles — eller overskydende stempler følger med videre",
];

/**
 * Tre opsætninger, vist med den mekanik de beskriver.
 *
 * `samlet` er med vilje ikke lig `stempler`: et fuldt kort viser ingenting
 * om, hvad kortet GØR. Det interessante er mellemrummet mellem det, kunden
 * har, og det, de mangler — og det er dét, prikkerne tegner.
 */
const EKSEMPLER: {
  branche: Branche;
  hvem: string;
  optjen: string;
  faa: string;
  stempler: number;
  samlet: number;
}[] = [
  {
    branche: "cafe",
    hvem: "Café",
    optjen: "Køb 9 kaffe",
    faa: "Den 10. er gratis",
    stempler: 10,
    samlet: 7,
  },
  {
    branche: "skoenhed",
    hvem: "Klinik",
    optjen: "5 behandlinger",
    faa: "En fordel på den næste",
    stempler: 5,
    samlet: 3,
  },
  {
    branche: "frisoer",
    hvem: "Frisør",
    optjen: "6 besøg",
    faa: "Lås op for en belønning",
    stempler: 6,
    samlet: 4,
  },
];

/** Brancheeksempler. Tallene er de faktiske skabeloner i produktet. */
const INDUSTRIES: {
  name: string;
  branche: Branche;
  body: string;
  template: string;
}[] = [
  {
    name: "Café og kaffebar",
    branche: "cafe",
    body: "Et køb giver et stempel, og det tiende er gratis. Den klassiske kaffeaftale, bare uden papkort der falder fra hinanden i lommen.",
    template: "1 køb = 1 stempel · 10 stempler = gratis kaffe",
  },
  {
    name: "Restaurant og takeaway",
    branche: "restaurant",
    body: "Et besøg giver et stempel. Efter otte besøg står der en dessert eller en ret klar til gæsten.",
    template: "1 besøg = 1 stempel · 8 stempler = gratis dessert",
  },
  {
    name: "Frisør og barber",
    branche: "frisoer",
    body: "Klip nummer seks udløser en rabat. Det gør det lidt lettere for kunden at booke hos dig igen frem for at prøve en ny salon.",
    template: "1 besøg = 1 stempel · 6 stempler = 20 % rabat",
  },
  {
    name: "Klinik og skønhed",
    branche: "skoenhed",
    body: "Behandlinger tæller op mod en bonus, kunden selv vælger. Passer til neglesalon, hudpleje og mindre klinikker med faste forløb.",
    template: "1 behandling = 1 stempel · 5 stempler = valgfri bonus",
  },
  {
    name: "Butik",
    branche: "butik",
    body: "Beløn dem, der handler hos dig igen og igen. Du kan lade et stempel følge et køb, et besøg eller et beløb, kunden handler for.",
    template: "Du sætter selv antal og belønning",
  },
  {
    name: "Bilvask, værksted og fitness",
    branche: "vaerksted",
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
        {/* `overflow-hidden` er IKKE pynt: skæret bag kortet er et absolut
            felt, der stikker 4 rem ud til hver side. På en telefon ligger
            spalten allerede ude ved kanten, og uden klipningen ville siden
            kunne scrolles til højre — samme fejl som cookielinket i footeren. */}
        <section className="overflow-hidden border-b border-border bg-dark text-dark-fg">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/15">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-secondary"
                  aria-hidden="true"
                />
                Uden app · uden konto for kunden
              </span>
              {/* SØGEORDET STÅR I H1, men som anden linje.
                  Overskriftens løfte er "nye kunder bliver faste kunder", og
                  det skal læses først; "med et digitalt stempelkort" er
                  MIDLET og hører derfor til i en mindre vægt. De to linjer er
                  én sætning, så betydningen er præcis den samme som før — der
                  er kun sat navn på værktøjet.

                  Eyebrow'en sagde det samme og er derfor lavet om: to
                  gentagelser af "digitalt stempelkort" inden for tre
                  centimeter læses som udfyldning, ikke som vægt. */}
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Få nye kunder til at blive til{" "}
                <span className="text-secondary">faste kunder</span>
                <span className="mt-3 block text-xl font-semibold text-white/60 sm:text-2xl">
                  med et digitalt stempelkort
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-white/70">
                Et digitalt stempelkort giver det tilfældige besøg en
                fortsættelse. Kunden samler stempler på mobilen — ingen app,
                ingen konto — optjener den belønning, du selv vælger, og går ud
                ad døren med noget, de kun kan hente hos dig.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink variant="secondary" href="/signup" size="lg">
                  Kom i gang
                </ButtonLink>
                <ButtonLink href="#saadan" variant="outline-invert" size="lg">
                  Se hvordan det virker
                </ButtonLink>
              </div>
            </div>

            {/* Samme kort som forsidens hero, uden de to notifikationer —
                de handler om anmeldelser og hører ikke til på denne side.

                AFLØSTE et skærmbillede (`/stempelkort-app.webp`). Tegningen er
                skarp i alle størrelser, og den fjerner samtidig heroens
                LCP-billede: det, der skal males først, er nu tekst. */}
            <div className="lg:justify-self-end lg:pl-8">
              <div className="relative mx-auto w-full max-w-[23rem]">
                {/* Skæret bag kortet. Skærmbilledet var højt og fyldte
                    spalten; kortet er lavere og stod alene i en stor sort
                    flade. Et blødt petroleumsskær giver den flade noget at
                    være — og `relative` på indholdet holder det foran, uden
                    et negativt z-index, som ville lægge det bag sektionens
                    egen baggrund. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-16 rounded-full bg-accent/30 blur-3xl"
                />
                <div className="relative">
                  {/* EGEN relative-boks om KORTET ALENE. Lå emblemerne i den
                      ydre boks, målte `-bottom-6` fra bunden af billedteksten
                      og ikke fra kortet — og det nederste emblem landede oven
                      i teksten. Målt: 517 mod tekstens 509-525. */}
                  <div className="relative">
                    <StempelkortVisual />

                    {/* TO EMBLEMER — de to valg, der ER produktet. De peger på
                      hver sin del af kortet: prikkerne foroven og pillen med
                      belønningen forneden.

                      Samme form og placering som forsidens notifikationer, så
                      de to heroer taler samme sprog. Og KUN to: forsidens
                      egen kommentar advarer mod at lade kompositionen blive
                      et rodet collage, og et tredje emblem ville dække kortet
                      frem for at pege på det.

                      De to linjer læses som én sætning ovenfra og ned.
                      Teksten findes ikke andre steder i heroen — den linje,
                      der stod under knapperne, sagde det samme og er væk. */}
                    <div className="absolute -top-6 -right-2 sm:-right-7">
                      {/* BEIGE OG IKKE HVID. Emblemet var hvidt som kortet, og
                          dér hvor de to overlapper, fandtes der ingen kant —
                          det læste som en linje INDE i stempelkortet frem for
                          en note oven på det.

                          Beige og ikke petroleum: emblemet ligger for det
                          meste på den mørke sektion, hvor beige giver 6,79 i
                          kontrast og petroleum kun 2,44. Det er samme regel,
                          som knapperne følger — paletten vender efter
                          baggrunden. Det nederste emblem er koksgråt og
                          skiller sig ud fra kortet af samme grund, bare den
                          anden vej. */}
                      <div className="btn-shape flex items-center gap-2 bg-secondary px-3 py-2 text-secondary-fg shadow-[0_16px_32px_-16px_rgba(0,0,0,0.6)]">
                        <StampIcon className="h-4 w-4 shrink-0" />
                        <span className="text-xs font-semibold tracking-tight">
                          Du bestemmer antal stempler
                        </span>
                      </div>
                    </div>

                    <div className="absolute -bottom-6 -left-2 sm:-left-8">
                      <div className="btn-shape flex items-center gap-2 bg-dark px-3 py-2 text-white shadow-[0_16px_32px_-16px_rgba(0,0,0,0.6)] ring-1 ring-white/15">
                        {/* Beige og ikke accent: på koks giver beigen 6,79 i
                          kontrast, petroleum kun 2,44. */}
                        <RewardIcon className="h-4 w-4 shrink-0 text-secondary" />
                        <span className="text-xs font-medium">
                          Og hvad kunden får
                        </span>
                      </div>
                    </div>

                    {/* Emblemerne overlapper kun kortets POLSTRING (p-6),
                        aldrig indholdet: de er 32 px høje og forskudt 24 px, så
                        de rager 8 px ind over en kant, der har 24 px luft.
                        Første forsøg lå 16 px oppe og skar toppen af
                        "Café Aurora" — det er dét, målingen nedenfor fanger.

                        mt-10 og ikke mt-5: det nederste emblem hænger 24 px ud
                        under kortet og lå ellers oven i billedteksten. */}
                  </div>

                  <p className="mt-10 text-center text-xs text-white/50">
                    Sådan ser kundens kort ud undervejs
                  </p>
                </div>
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

            <ul className="mt-10 grid gap-4 sm:grid-cols-3">
              {EKSEMPLER.map((e) => (
                <li
                  key={e.hvem}
                  className="box-shape flex flex-col overflow-hidden border border-border bg-card shadow-[var(--hoejde-1)]"
                >
                  <div className="flex items-center gap-2.5 border-b border-border bg-muted-bg px-4 py-3">
                    <IndustryBadge branche={e.branche} />
                    <span className="text-sm font-medium">{e.hvem}</span>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <p className="font-bold tracking-tight">{e.optjen}</p>
                    <p className="mt-1 flex-1 text-sm text-muted">{e.faa}</p>

                    {/* Prikkerne bærer ingen betydning, teksten ovenfor siger
                        det samme — derfor aria-hidden, samme regel som
                        brancheikonerne. */}
                    <div
                      className="mt-5 flex flex-wrap items-center gap-1.5"
                      aria-hidden="true"
                    >
                      {Array.from({ length: e.stempler }).map((_, i) => {
                        // Den SIDSTE prik er belønningen og står i beige.
                        // Uden den ender rækken bare med et tomt felt, og så
                        // er der ikke noget at samle op mod.
                        const klasse =
                          i === e.stempler - 1
                            ? "bg-secondary"
                            : i < e.samlet
                              ? "bg-accent"
                              : "border border-border";
                        return (
                          <span
                            key={i}
                            className={`h-3 w-3 rounded-full ${klasse}`}
                          />
                        );
                      })}
                    </div>

                    <p className="mt-3 text-xs text-muted">
                      {e.samlet} af {e.stempler} stempler
                    </p>
                  </div>
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
              Det er den enkle mekanik, der gør papstempelkortet så sejlivet.
              Det digitale kort ændrer ikke på psykologien — det fjerner bare
              besværet og giver dig et overblik, papkortet aldrig kunne.
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
                  <span className="text-xs font-medium text-muted">
                    {i + 1}
                  </span>
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
                <h3 className="font-bold tracking-tight">
                  Digitalt stempelkort
                </h3>
                <ul className="mt-4 space-y-2 text-sm text-muted">
                  <li>Ligger på kundens telefon og kan hentes frem igen</li>
                  <li>Ingen tryk, intet oplag, ingen genoptryk</li>
                  <li>Du ændrer belønning og regler ét sted</li>
                  <li>
                    Du kan se aktiviteten og hvem der er tæt på en belønning
                  </li>
                  <li>Kun personale med adgang kan give stempler</li>
                </ul>
              </div>
            </div>

            <p className="mt-6 text-sm text-muted">
              Har din forretning få genbesøg og ingen interesse i tallene
              bagved, gør papkortet det fint. Det digitale kort betaler sig, når
              kunderne kommer igen — og du vil vide hvor mange.
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------- belønninger */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Du bestemmer, hvad dine kunder skal optjene
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-foreground/90">
              En café og en frisør har vidt forskellig økonomi i hvert besøg.
              Derfor er der ingen fast opskrift: du vælger selv antallet af
              stempler, hvad der udløser dem, og hvad kunden får til sidst.
            </p>

            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {REWARDS.map((r) => (
                <li
                  key={r.label}
                  className="box-shape flex flex-col border border-border bg-card p-5 shadow-[var(--hoejde-1)] transition-shadow hover:shadow-[var(--hoejde-2)]"
                >
                  <span
                    className="btn-shape grid h-11 w-11 place-items-center bg-accent/8 text-accent"
                    aria-hidden="true"
                  >
                    <r.Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 font-bold tracking-tight">{r.label}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">
                    {r.body}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3.5">
                    <span className="text-[11px] text-muted">
                      På kundens kort:
                    </span>
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                      {r.chip}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-14">
              <h3 className="text-lg font-bold tracking-tight">
                Hvornår tæller et stempel?
              </h3>
              <p className="mt-2 max-w-2xl leading-relaxed text-muted">
                Du vælger modellen, når du opretter kortet — og du kan lave
                flere programmer med hver sin.
              </p>

              {/* Labels og forklaringer hentes fra loyalitetsmodulet og
                  skrives ikke af her. Siden må kun love funktioner, der
                  findes, og en afskrift ville kunne blive stående, dagen en
                  model bliver ændret eller fjernet. */}
              <ul className="mt-6 grid gap-x-10 gap-y-3.5 sm:grid-cols-2">
                {EARN_MODELS.map((m) => (
                  <li key={m} className="flex gap-3">
                    <span
                      className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-secondary"
                      aria-hidden="true"
                    />
                    <p className="text-sm leading-relaxed">
                      <strong className="font-semibold">
                        {EARN_MODEL_LABELS[m]}
                      </strong>
                      <span className="text-muted">
                        {" — "}
                        {EARN_MODEL_HELP[m]}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Spærrerne står i et MØRKT felt, og det er ikke pynt: afsnittet
                skifter fra "hvad kunden får" til "hvad der forhindrer
                misbrug". Et farveskift gør springet synligt uden en ekstra
                overskrift, og sektionen får samtidig den tyngde, en side af
                lyse kort mangler. */}
            <div className="mt-14 box-shape overflow-hidden bg-dark text-dark-fg">
              <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_1.1fr] lg:items-center">
                <div>
                  <span className="etiket text-secondary">
                    Spærrer mod misbrug
                  </span>
                  <h3 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
                    Du sætter reglerne — systemet holder dem
                  </h3>
                  <p className="mt-3 leading-relaxed text-white/70">
                    Reglerne håndhæves af systemet og ikke af hukommelsen hos
                    den, der står ved kassen en travl fredag. Du sætter dem én
                    gang, når du opretter kortet.
                  </p>
                </div>

                <ul className="grid gap-2.5">
                  {REGLER.map((r) => (
                    <li
                      key={r}
                      className="btn-shape flex items-start gap-3 bg-white/5 px-4 py-3 text-sm leading-relaxed ring-1 ring-white/10"
                    >
                      {/* Beige på koks giver 6,79 i kontrast; accentfarven
                          ville kun give 2,44 og forsvinde. Paletten vender
                          efter baggrunden, også her. */}
                      <span
                        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-secondary/20 text-secondary"
                        aria-hidden="true"
                      >
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3 w-3"
                        >
                          <path d="m3.5 8.5 3 3 6-7" />
                        </svg>
                      </span>
                      <span className="text-white/85">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-12 box-shape border border-secondary/30 bg-secondary/10 p-5">
              <h3 className="font-bold tracking-tight">
                Belønninger kobles aldrig til anmeldelser
              </h3>
              <p className="mt-2 text-sm leading-relaxed">
                Det er bevidst umuligt at give stempler eller belønninger for,
                at en kunde skriver, ændrer eller sletter en offentlig
                anmeldelse. Den slags er i strid med både Googles og Trustpilots
                regler og kan koste dig dine anmeldelser. Derfor holder LoyalSum
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
                  <div className="flex items-center gap-3">
                    <IndustryBadge branche={b.branche} size="md" />
                    <h3 className="font-bold tracking-tight">{b.name}</h3>
                  </div>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
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
              <ButtonLink variant="secondary" href="/signup" size="lg">
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
