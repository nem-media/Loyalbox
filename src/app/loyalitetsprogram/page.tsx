import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { getProduct } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site";
import { IndustryBadge, type Branche } from "@/components/industry-icons";
import {
  CreateCardIcon,
  ScanIcon,
  StampIcon,
  RewardIcon,
  ReturnVisitIcon,
  ProgressIcon,
  FreeProductIcon,
  AmountOffIcon,
  PercentOffIcon,
  ServiceIcon,
} from "@/components/illustrations";

/**
 * SEO- og salgsside for "loyalitetsprogram" / "pointprogram".
 *
 * REGLEN ER DEN SAMME SOM PÅ /stempelkort: der må KUN stå funktioner, der
 * findes. Alt herunder er efterprøvet i koden — optjeningsmodellerne i
 * `src/lib/loyalty/point.ts`, programmet og belønningerne i
 * `/dashboard/loyalitet/point`, personalets flow i `PointPanel`, kundens kort
 * i `/kort/[token]` og `/mine-kort`, og ledgeren i migration 0044.
 *
 * SKRIV IKKE: VIP-niveauer, bronze/sølv/guld, point der udløber, henvisninger,
 * cashback, automatiske kampagner, e-mail- eller SMS-udsendelser, integration
 * med kassesystem eller betalingskort. Intet af det er bygget, og et
 * loyalitetsprogram sælges til nogen, der skal bruge det i morgen.
 */

const title = "Loyalitetsprogram med point til din forretning";
const description =
  "Digitalt loyalitetsprogram, hvor kunden optjener point ved køb og selv vælger sin belønning. Ingen app, samme kundekonto som stempelkortet.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "loyalitetsprogram",
    "loyalitetssystem",
    "digitalt loyalitetsprogram",
    "pointprogram",
    "loyalitetsprogram med point",
    "kundeklub system",
  ],
  alternates: { canonical: "/loyalitetsprogram" },
  openGraph: {
    type: "website",
    title: `${title} — kunden vælger selv belønningen`,
    description,
    url: "/loyalitetsprogram",
  },
};

/* ------------------------------------------------------------------ data */

const STEPS = [
  {
    Icon: ScanIcon,
    title: "Kunden tilmelder sig",
    body: "Gæsten scanner QR-koden på din stander og skriver sin e-mail eller sit telefonnummer. Det tager få sekunder, der er ingen app, og kortet er en helt almindelig webside. Kører du både pointprogram og stempelkort, kommer kunden med i begge ved den ene tilmelding.",
  },
  {
    Icon: StampIcon,
    title: "Kunden optjener point",
    body: "Ved disken taster personalet købets beløb — eller trykker bare én gang, hvis hvert køb giver det samme. Skærmen viser, hvad kunden optjener, og hvad saldoen bliver, før der trykkes. Point kan også gives manuelt, hvis det passer bedre til din forretning.",
  },
  {
    Icon: ProgressIcon,
    title: "Kunden ser sin saldo",
    body: "Kortet viser saldoen, alle dine belønninger og hvor mange point der mangler til den næste. Kunden kan åbne det fra sit eget link — eller samle sine kort fra flere butikker på en gratis LoyalSum-konto.",
  },
  {
    Icon: RewardIcon,
    title: "Kunden bruger sine point",
    body: "Kunden vælger den belønning, hun vil have, og personalet indløser den. Pointene trækkes med det samme, og både kunde og butik kan se det i historikken bagefter.",
  },
];

const FEATURES = [
  {
    Icon: CreateCardIcon,
    title: "Tre måder at optjene på",
    body: "Point efter beløb (fx 10 kr. = 1 point), faste point pr. køb, eller helt manuel tildeling. Der rundes altid ned, så tallet er til at forklare over disken.",
  },
  {
    Icon: RewardIcon,
    title: "Så mange belønninger du vil",
    body: "Hver belønning har sin egen pris i point. Kunden vælger selv — det er dét, der skiller pointprogrammet fra stempelkortet.",
  },
  {
    Icon: ProgressIcon,
    title: "Saldo og historik, der kan revideres",
    body: "Hver bevægelse står som sin egen linje med dato, medarbejder og beløb. Intet slettes: en fejl rettes med en modpost, så historikken bliver ved med at passe.",
  },
  {
    Icon: StampIcon,
    title: "Justering med begrundelse",
    body: "Du kan lægge point til eller trække fra — for eksempel som kompensation — men aldrig uden at skrive hvorfor, og aldrig ved at rette saldoen direkte.",
  },
  {
    Icon: ReturnVisitIcon,
    title: "Pause uden at miste noget",
    body: "Sætter du programmet på pause, beholder kunderne deres point og kan se dem. Der gives og bruges bare ingen, før du genoptager.",
  },
  {
    Icon: ScanIcon,
    title: "Medarbejdere med hver sin adgang",
    body: "Personalet kan give point og indløse belønninger. Justeringer og annulleringer kræver administratoradgang, og alt håndhæves på serveren — ikke kun i menuen.",
  },
];

const REWARDS = [
  {
    Icon: FreeProductIcon,
    label: "Gratis produkt",
    body: "Den kaffe, dessert eller ting, kunden helst vil have.",
    chip: "Gratis kaffe · 50 point",
  },
  {
    Icon: AmountOffIcon,
    label: "Beløb i rabat",
    body: "Et fast beløb trukket fra næste køb.",
    chip: "20 kr. rabat · 100 point",
  },
  {
    Icon: PercentOffIcon,
    label: "Procent i rabat",
    body: "En procentdel af næste besøg.",
    chip: "20 % rabat · 150 point",
  },
  {
    Icon: ServiceIcon,
    label: "En ydelse",
    body: "En behandling, en service, noget ekstra oveni.",
    chip: "Gratis behandling · 500 point",
  },
];

const BRANCHER: { branche: Branche; navn: string; body: string }[] = [
  {
    branche: "cafe",
    navn: "Café",
    body: "Regningerne er små og forskellige. Point efter beløb passer bedre end et stempel pr. besøg, når nogen køber én kop og andre køber til hele bordet.",
  },
  {
    branche: "restaurant",
    navn: "Restaurant",
    body: "Et måltid for to og en frokost alene er ikke det samme besøg. Point gør forskellen synlig uden at du skal føre regnskab.",
  },
  {
    branche: "frisoer",
    navn: "Frisør",
    body: "Klip, farve og produkter koster vidt forskelligt. Kunden samler point på det hele og vælger selv, hvad de skal bruges på.",
  },
  {
    branche: "skoenhed",
    navn: "Salon",
    body: "Behandlinger med længere mellemrum. En saldo, der bliver stående, er lettere at komme tilbage til end et kort, der skal fyldes.",
  },
  {
    branche: "butik",
    navn: "Butik",
    body: "Kurvens størrelse svinger. Point efter beløb belønner den store handel uden at lukke den lille ude.",
  },
  {
    branche: "klinik",
    navn: "Klinik",
    body: "Få, men store besøg. Faste point pr. besøg holder det enkelt for både klinik og patient.",
  },
];

const FAQ = [
  {
    q: "Hvad er et loyalitetsprogram med point?",
    a: "Et pointprogram er et loyalitetsprogram, hvor kunden optjener point, når hun handler hos dig, og selv vælger hvad pointene skal bruges på. Du bestemmer, hvordan point optjenes, og hvilke belønninger der findes — for eksempel gratis kaffe for 50 point eller 20 kr. i rabat for 100 point.",
  },
  {
    q: "Hvad er forskellen på pointprogram og stempelkort?",
    a: "Et stempelkort er fast progression: ti køb giver den ene belønning, du har valgt. Et pointprogram er en saldo: kunden samler point og vælger selv mellem flere belønninger. Stempelkortet er det enkleste at forstå; pointprogrammet er det mest fleksible, især når regningerne er forskellige. Begge dele findes i LoyalSum, og du kan køre dem samtidig.",
  },
  {
    q: "Hvordan optjener kunden point?",
    a: "På én af tre måder, som du vælger: point efter beløb (fx 10 kr. = 1 point), et fast antal point pr. køb, eller manuel tildeling, hvor personalet selv skriver antallet. Ved point efter beløb rundes der altid ned, så 249 kr. ved 10 kr./point giver 24 point.",
  },
  {
    q: "Skal mine kunder hente en app?",
    a: "Nej. Kundens pointkort er en almindelig webside, hun får ved at scanne QR-koden på din stander. Der er ingen app og ingen konto, hun skal oprette først. Vil hun samle sine kort fra flere butikker ét sted, kan hun oprette en gratis LoyalSum-konto.",
  },
  {
    q: "Kan kunden have point hos flere butikker?",
    a: "Ja, og de blandes aldrig sammen. Hver forretning har sin egen saldo og sine egne belønninger. Har kunden en konto, ser hun dem side om side — for eksempel 245 point hos caféen og 7 af 10 stempler hos bageren — men butikkerne kan ikke se hinandens.",
  },
  {
    q: "Hvem kan give point?",
    a: "Kun personale, der er logget ind med adgang til din forretning. Kunden kan ikke give sig selv point. Du kan give dine ansatte adgang til at give point og indløse belønninger, mens justeringer og annulleringer kræver administratoradgang.",
  },
  {
    q: "Hvad hvis der bliver tastet forkert?",
    a: "Transaktionen kan annulleres. Der laves en modpost, så både den oprindelige linje og rettelsen står i historikken — ingenting slettes. Du kan også justere en kundes point manuelt, men det kræver en begrundelse, der bliver stående.",
  },
  {
    q: "Kan kunden komme i minus?",
    a: "Nej. En belønning kan kun indløses, hvis saldoen rækker, og systemet afviser enhver bevægelse, der ville give en negativ saldo. Det gælder også, hvis to medarbejdere trykker samtidig.",
  },
  {
    q: "Hvad sker der, hvis jeg ændrer prisen på en belønning?",
    a: "Den nye pris gælder fremad. De indløsninger, der allerede er sket, beholder den pris, de havde den dag — kvitteringen i historikken ændrer sig ikke bagefter.",
  },
  {
    q: "Kan jeg sætte programmet på pause?",
    a: "Ja. Kunderne beholder deres point og kan se dem, men der kan hverken gives eller bruges point, mens det er på pause. Du kan også arkivere programmet; så bevares al historik, men det kan ikke bruges mere.",
  },
  {
    q: "Kan point optjenes for at skrive en anmeldelse?",
    a: "Nej, og det er et bevidst valg. Det er i strid med både markedsføringsloven og Googles egne regler at betale for anmeldelser, og konsekvensen rammer butikken. LoyalSum holder derfor anmeldelser og loyalitet adskilt: der findes ingen måde at knytte point til en anmeldelse på.",
  },
  {
    q: "Hvad koster et loyalitetsprogram?",
    a: "Pointprogrammet er en del af LoyalSum Komplet, sammen med stempelkortet. Du betaler for standeren én gang og et fast månedligt abonnement — se de aktuelle priser på produktsiden. Der er ingen binding.",
  },
];

/* ------------------------------------------------------------------- page */

export default function LoyalitetsprogramPage() {
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
          name: "Loyalitetsprogram",
          item: `${base}/loyalitetsprogram`,
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

      <main id="indhold">
        {/* ------------------------------------------------------------ hero */}
        <section className="bg-dark px-4 py-16 text-white sm:py-20">
          <div className="mx-auto grid max-w-side gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-white/60">
                Loyalitetsprogram
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Kunden optjener point — og vælger selv sin belønning
              </h1>
              <p className="mt-4 max-w-xl leading-relaxed text-white/80">
                Et digitalt loyalitetsprogram til caféer, butikker, saloner og
                klinikker. Kunden samler point, når hun handler, ser sin saldo
                på telefonen og bruger pointene på dét, hun helst vil have.
                Ingen app, ingen plastikkort.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="/produkter/loyalsum-komplet" size="lg">
                  Se LoyalSum Komplet
                </ButtonLink>
                <ButtonLink
                  href="/stempelkort"
                  size="lg"
                  variant="outline-invert"
                >
                  Eller se stempelkortet
                </ButtonLink>
              </div>
              <p className="mt-4 text-sm text-white/60">
                Pointprogram og stempelkort er samme abonnement — du kan køre
                begge dele.
              </p>
            </div>

            {/* Et rigtigt pointkort, tegnet som kunden ser det. */}
            <div className="box-shape border border-white/15 bg-white/5 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Kaffeklubben
              </p>
              <p className="mt-1 text-4xl font-bold tracking-tight">
                245 point
              </p>
              <p className="mt-1 text-sm text-white/60">Café Aurora</p>
              <ul className="mt-5 space-y-2 text-sm">
                {[
                  ["Gratis kaffe", "50 point", "Kan bruges nu"],
                  ["20 kr. rabat", "100 point", "Kan bruges nu"],
                  ["Gratis dessert", "150 point", "Kan bruges nu"],
                  ["Gratis behandling", "500 point", "Mangler 255 point"],
                ].map(([navn, pris, status]) => (
                  <li
                    key={navn}
                    className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 last:border-0"
                  >
                    <span>{navn}</span>
                    <span className="shrink-0 text-right">
                      <span className="block text-white/80">{pris}</span>
                      <span
                        className={
                          "block text-xs " +
                          (status === "Kan bruges nu"
                            ? "text-success"
                            : "text-white/50")
                        }
                      >
                        {status}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ------------------------------------------- hvad er det */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight">
              Hvad er LoyalSums loyalitetsprogram?
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Det er et pointprogram, der kører på den stander, du i forvejen
              har stående. Kunden scanner koden, bliver medlem på få sekunder
              og optjener point, hver gang hun handler. Du bestemmer selv,
              hvordan point optjenes, og hvilke belønninger de kan bruges på —
              og du kan ændre begge dele undervejs, uden at kunderne mister
              det, de har samlet.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              Alt ligger i det samme LoyalSum: samme kunder, samme
              medarbejderadgang, samme dashboard. Har du i forvejen et
              stempelkort, kan de to køre side om side.
            </p>
          </div>
        </section>

        {/* ------------------------------------------- sådan fungerer det */}
        <section className="bg-muted-bg px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold tracking-tight">
              Sådan fungerer det
            </h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-2">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="box-shape border border-border bg-card p-5"
                >
                  <div className="flex items-start gap-4">
                    <s.Icon className="h-10 w-10 shrink-0 text-accent" />
                    <div>
                      <p className="font-medium">
                        {i + 1}. {s.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {s.body}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------ features */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold tracking-tight">
              Det, programmet kan
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <f.Icon className="h-10 w-10 text-accent" />
                  <p className="mt-3 font-medium">{f.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ belønninger */}
        <section className="bg-muted-bg px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold tracking-tight">
              Belønninger, kunden selv vælger
            </h2>
            <p className="mt-3 max-w-2xl text-muted">
              Du opretter så mange, du vil, og sætter prisen i point på hver.
              Kunden ser dem billigst først og kan se, hvor mange point der
              mangler til de næste.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {REWARDS.map((r) => (
                <div
                  key={r.label}
                  className="box-shape border border-border bg-card p-5"
                >
                  <r.Icon className="h-10 w-10 text-accent" />
                  <p className="mt-3 font-medium">{r.label}</p>
                  <p className="mt-1 text-sm text-muted">{r.body}</p>
                  <p className="mt-3 inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                    {r.chip}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------- fysisk eller online adgang */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight">
              Brug loyalitetsprogrammet fysisk eller online
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Programmet er det samme; det er adgangsvejen, der er forskellig.
              <strong> Med en stander</strong> scanner kunden QR-koden på
              disken — det er LoyalSum Komplet.{" "}
              <strong>Uden stander</strong> deler du i stedet dit eget
              LoyalSum-link eller din QR-kode på hjemmesiden, i webshoppen, i
              mails eller i et opslag — det er LoyalSum Komplet Online.
            </p>
            <p className="mt-4 leading-relaxed text-muted">
              Begge veje fører til den samme LoyalSum-side, og du kan bruge dem
              side om side: en stander i butikken og linket online.
            </p>
            <Link
              href="/loyalsum-komplet-online"
              className="mt-4 inline-block font-medium text-accent hover:underline"
            >
              Se LoyalSum Komplet Online →
            </Link>
          </div>
        </section>

        {/* ------------------------------------------ samme kundekonto */}
        <section className="px-4 py-16">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Samme LoyalSum-konto som stempelkortet
              </h2>
              <p className="mt-4 leading-relaxed text-muted">
                Kunden har ét kort hos dig — ikke ét til point og ét til
                stempler. Opretter hun en gratis konto, ligger alle hendes
                fordele fra alle butikker samlet ét sted og kan åbnes fra
                enhver telefon.
              </p>
              <p className="mt-4 leading-relaxed text-muted">
                Butikkerne ser kun deres egne kunder og deres egen aktivitet.
                Hvad kunden har hos naboen, kommer ingen andre ved.
              </p>
            </div>
            <div className="box-shape border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Mine fordele
              </p>
              <ul className="mt-3 space-y-3 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block font-medium">Café Aurora</span>
                    <span className="text-muted">Pointprogram</span>
                  </span>
                  <span className="font-medium">245 point</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block font-medium">Salon Nova</span>
                    <span className="text-muted">Pointprogram</span>
                  </span>
                  <span className="font-medium">80 point</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block font-medium">Bager Hansen</span>
                    <span className="text-muted">Stempelkort</span>
                  </span>
                  <span className="font-medium">7 / 10</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* --------------------------------- stempelkort vs pointprogram */}
        <section className="bg-muted-bg px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold tracking-tight">
              Stempelkort eller pointprogram?
            </h2>
            <p className="mt-3 max-w-2xl text-muted">
              Begge dele er rigtige — de svarer bare på hver sin forretning.
              Du kan også køre dem samtidig.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="box-shape border border-border bg-card p-6">
                <p className="font-medium">Stempelkort</p>
                <p className="mt-1 text-sm text-muted">
                  Fast progression mod én belønning.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-muted">
                  <li>· Det enkleste at forklare: 10 køb, så en gratis.</li>
                  <li>· Passer, når købene ligner hinanden.</li>
                  <li>· Kunden ser tydeligt, hvor langt der er igen.</li>
                </ul>
                <Link
                  href="/stempelkort"
                  className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
                >
                  Se stempelkortet →
                </Link>
              </div>
              <div className="box-shape border border-accent/40 bg-card p-6">
                <p className="font-medium">Pointprogram</p>
                <p className="mt-1 text-sm text-muted">
                  En saldo og flere belønninger at vælge imellem.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-muted">
                  <li>· Passer, når regningerne er forskellige.</li>
                  <li>· Kunden vælger selv, hvad pointene skal bruges på.</li>
                  <li>· Du kan have både små og store belønninger.</li>
                </ul>
                <p className="mt-4 text-sm font-medium text-accent">
                  Du læser om det lige nu.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------- brancher */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold tracking-tight">
              Hvor det giver mening
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {BRANCHER.map((b) => (
                <div key={b.branche}>
                  <IndustryBadge branche={b.branche} />
                  <p className="mt-3 font-medium">{b.navn}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {b.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ FAQ */}
        <section className="bg-muted-bg px-4 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight">
              Ofte stillede spørgsmål
            </h2>
            <div className="mt-8 divide-y divide-border">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="cursor-pointer list-none font-medium">
                    {item.q}
                  </summary>
                  <p className="mt-2 leading-relaxed text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- CTA */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight">
              Kom i gang med dit loyalitetsprogram
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              Pointprogrammet er en del af LoyalSum Komplet sammen med
              stempelkortet og reviewstanderen.
              {komplet?.monthlyPrice ? (
                <>
                  {" "}
                  {formatCurrency(komplet.monthlyPrice)}/md ex moms, ingen
                  binding.
                </>
              ) : null}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/produkter/loyalsum-komplet" size="lg">
                Se LoyalSum Komplet
              </ButtonLink>
              <ButtonLink href="/kontakt" size="lg" variant="outline">
                Spørg os
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
