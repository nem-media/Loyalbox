import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { StanderPlaceholder } from "@/components/product-placeholder";
import { PurchaseNotice } from "@/components/purchase-notice";
import { getProduct } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site";
import { IndustryBadge, type Branche } from "@/components/industry-icons";
import { PLATFORM_VALG, prisTekst } from "@/lib/reviewstander-valg";
import { AnmeldelseVisual } from "@/components/home/hero-visual";
import { SkiltPreview } from "@/components/skilt-preview";
import {
  EGEN_FRONTFARVE_PRIS,
  FRONT_TEKSTER,
  STANDER_FARVER,
} from "@/lib/stander-tilvalg";
import {
  TapIcon,
  ShareExperienceIcon,
  GrowthIcon,
  NewCustomersIcon,
  FeedbackIcon,
  ReturningIcon,
  NfcIcon,
  QrIcon,
} from "@/components/illustrations";

/**
 * Produkt- og SEO-landingsside for reviewstanderen.
 *
 * TO REGLER FOR DENNE SIDE:
 *
 * 1. Kun funktioner der findes. Verificeret i `src/lib/stands.ts`,
 *    `/r/[slug]` (scan-flowet), stand-indstillingerne i dashboardet og
 *    produktdata i `src/lib/constants.ts`.
 *
 * 2. INGEN review gating. Siden må aldrig antyde, at utilfredse kunder holdes
 *    væk fra offentlige anmeldelser. Det ville være i strid med Googles og
 *    Trustpilots retningslinjer og kan koste virksomheden dens anmeldelser.
 *    Produktet er også bygget sådan: `resolvePublicDestination()` falder
 *    tilbage til første tilgængelige link, og i `review-flow.tsx` har ALLE
 *    kunder adgang til det offentlige link uanset antal stjerner. Privat
 *    feedback er et TILBUD ved siden af — ikke en spærring.
 */

const title = "Reviewstander med NFC og QR";
const description =
  "Gør det nemt for kunderne at anmelde dig på Google, Trustpilot eller Facebook. Kunden holder mobilen hen til standeren eller scanner QR-koden og kommer direkte videre. Se hvordan den virker og hvad den koster.";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "reviewstander",
    "review stander",
    "anmeldelsesstander",
    "stander til anmeldelser",
    "Google review stander",
    "stander til Google anmeldelser",
    "NFC stander",
    "QR stander",
    "få flere Google anmeldelser",
    // Trustpilot stod kun i ét FAQ-svar, mens en hel sektion talte om
    // Google. Trafik fra Trustpilot-guiden landede altså på en side, der
    // så ud til kun at kunne det ene.
    "Trustpilot stander",
    "stander til Trustpilot anmeldelser",
    "flere Trustpilot anmeldelser",
  ],
  alternates: { canonical: "/reviewstander" },
  openGraph: {
    type: "website",
    title: `${title} — gør det nemt at anmelde dig`,
    description,
    url: "/reviewstander",
  },
};

/* ------------------------------------------------------------------- data */

const STEPS = [
  {
    Icon: TapIcon,
    title: "Tap eller scan",
    body: "Kunden holder mobilen hen til standeren eller scanner QR-koden med kameraet. Der skal ikke hentes en app.",
  },
  {
    Icon: ShareExperienceIcon,
    title: "Del oplevelsen",
    body: "Din anmeldelsesside åbner med det samme på kundens telefon, og de kan gå videre til den platform, du har valgt.",
  },
  {
    Icon: GrowthIcon,
    title: "Styrk din forretning",
    body: "Flere kunder får mulighed for at fortælle om deres oplevelse — og du kan se aktiviteten i dit dashboard.",
  },
];

/**
 * De tre skilte i farvesektionen.
 *
 * Standerens to farver hentes af `STANDER_FARVER`, så listen ikke kan komme
 * til at vise en farve, bestillingen ikke tilbyder. Den tredje er et EKSEMPEL
 * på en egen frontfarve — den er ikke et produktvalg, men en illustration af,
 * at feltet kan få hvad som helst.
 */
const FARVEVALG: {
  navn: string;
  standerFarve: "sort" | "hvid";
  baggrund: string | null;
  accent: string | null;
  pris: string;
}[] = [
  {
    navn: STANDER_FARVER[0].navn,
    standerFarve: "sort",
    baggrund: null,
    accent: null,
    pris: "Uden tillæg",
  },
  {
    navn: STANDER_FARVER[1].navn,
    standerFarve: "hvid",
    baggrund: null,
    accent: null,
    pris: "Uden tillæg",
  },
  {
    navn: "Din egen farve",
    standerFarve: "sort",
    baggrund: "#6b1f2e",
    accent: "#e8c37a",
    pris: `+${EGEN_FRONTFARVE_PRIS} kr. pr. ordre`,
  },
];

const PLACES: { name: string; branche: Branche; where: string }[] = [
  {
    name: "Café og kaffebar",
    branche: "cafe",
    where: "Ved kassen, mens kunden venter på kaffen.",
  },
  {
    name: "Restaurant",
    branche: "restaurant",
    where: "Ved betalingen eller på vej ud ad døren.",
  },
  {
    name: "Frisør og barber",
    branche: "frisoer",
    where: "I receptionen, når kunden betaler.",
  },
  {
    name: "Klinik og skønhed",
    branche: "skoenhed",
    where: "I receptionen efter behandlingen.",
  },
  { name: "Butik", branche: "butik", where: "Ved kassen, lige efter købet." },
  { name: "Værksted", branche: "vaerksted", where: "Ved udlevering af bilen." },
];

const FAQ = [
  {
    q: "Hvad er en reviewstander?",
    a: "En reviewstander er en lille fysisk stander til disken, bordet eller receptionen. Den har både en QR-kode og NFC, så kunden kan komme videre til din anmeldelsesside med et enkelt scan eller tap — uden selv at skulle finde din forretning frem.",
  },
  {
    q: "Hvordan virker NFC?",
    a: "NFC er den samme teknologi, telefonen bruger til kontaktløs betaling. Kunden holder blot toppen af telefonen mod standeren, og siden åbner af sig selv. Der skal hverken hentes en app eller parres noget.",
  },
  {
    q: "Virker den på både iPhone og Android?",
    a: "QR-koden virker på alle telefoner med et kamera. NFC virker på nyere iPhones og de fleste Android-telefoner. Derfor sidder begge dele på standeren — kan telefonen ikke tappe, scanner kunden i stedet.",
  },
  {
    q: "Skal kunden downloade en app?",
    a: "Nej. Anmeldelsessiden er en helt almindelig webside, der åbner i telefonens browser.",
  },
  {
    q: "Kan jeg bruge den til Google-anmeldelser?",
    a: "Ja. Du sætter selv linket til din Google-profil. Med Reviewstander Pro kan du vælge flere platforme — Google, Trustpilot og Facebook — og kunden vælger selv, hvor de vil skrive.",
  },
  {
    q: "Kan jeg bruge den til Trustpilot?",
    a: "Ja. Med Reviewstander Pro sætter du dit Trustpilot-link ved siden af Google og Facebook, og kunden vælger selv. Vil du kun have Trustpilot, kan skiltet uden konto sende direkte til din Trustpilot-side. Trustpilot tillader udtrykkeligt QR-koder som invitation, så længe alle kunder inviteres ens.",
  },
  {
    q: "Kan jeg skifte fra Google til Trustpilot senere?",
    a: "Med Reviewstander Pro ja — destinationen ændres i dashboardet, og standeren skal ikke trykkes om. Uden Pro sættes linket ved opsætningen og ligger fast.",
  },
  {
    q: "Kan standeren få mit logo?",
    a: "Ja. Dit logo trykkes på selve standeren — du lægger det op, når du bestiller, og du vælger samtidig farve og front. Med Reviewstander Pro eller LoyalSum Komplet vises logoet også på den anmeldelsesside, kunden lander på. Køber du den enkle Reviewstander uden konto, er der ingen side: QR'en sender kunden direkte videre.",
  },
  {
    q: "Kan jeg ændre linket senere?",
    a: "Med Reviewstander Pro kan du skifte destination når som helst fra dit dashboard — standeren skal ikke trykkes om. Vælger du den enkle Reviewstander uden abonnement, sættes linket ved opsætningen.",
  },
  {
    q: "Kræver reviewstanderen et abonnement?",
    a: "Nej. Den enkle Reviewstander er en engangspris uden abonnement. Vil du have din egen anmeldelsesside, flere platforme, dynamiske links, privat feedback og statistik, er det Reviewstander Pro, der har et månedligt abonnement. Skal du også have digitalt stempelkort, er det LoyalSum Komplet.",
  },
  {
    q: "Hvor bør jeg placere standeren?",
    a: "Der hvor den gode oplevelse slutter — typisk ved kassen, i receptionen eller på bordet. Pointen er, at kunden ser den i det øjeblik, hvor oplevelsen er frisk.",
  },
  {
    q: "Hvad sker der, hvis en kunde er utilfreds?",
    a: "Kunden vælger selv. Både den offentlige anmeldelse og muligheden for at sende feedback direkte til dig står åben — uanset hvad kunden har givet i stjerner. Feedback er et tilbud om at fortælle dig noget, du kan handle på, ikke en måde at holde kritik væk fra offentlige platforme.",
  },
];

/* ------------------------------------------------------------------- page */

export default function ReviewstanderPage() {
  const basis = getProduct("reviewstander");
  const pro = getProduct("reviewstander-pro");
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
          name: "Reviewstander",
          item: `${base}/reviewstander`,
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
        <section className="relative isolate overflow-hidden border-b border-border bg-dark text-dark-fg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-cafe.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-10 h-full w-full object-cover object-right"
          />
          {/* Gradienten slutter på /80 og ikke /40. Fotoet viser en fysisk
              stander i højre side — præcis dér hvor kortet nu ligger — og to
              produkter oven i hinanden kæmper om at være motivet. Dæmpet
              bliver fotoet stemning, og kortet bliver det, man ser. Det
              gjorde samtidig billedteksten læselig; hvid på 50 % over det
              lyse foto kunne ikke læses. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-r from-dark from-25% via-dark/95 to-dark/80"
          />
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-secondary">
                LoyalSum Reviewstander
              </p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
                Få flere anmeldelser med en{" "}
                <span className="text-secondary">reviewstander</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-white/70">
                Gør det nemt for dine kunder at dele deres oplevelse. De holder
                mobilen hen til standeren eller scanner QR-koden — og kommer
                direkte videre på deres telefon.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink
                  variant="secondary"
                  href="/produkter/reviewstander"
                  size="lg"
                >
                  Bestil reviewstander
                </ButtonLink>
                <ButtonLink href="#saadan" variant="outline-invert" size="lg">
                  Se hvordan den virker
                </ButtonLink>
              </div>
              {/* Platformene står her, fordi det er det første spørgsmål fra
                  en besøgende, der kom for Trustpilot. Stod det kun i en FAQ
                  langt nede, konkluderede de, at produktet var Google-only. */}
              <p className="mt-5 text-sm text-white/50">
                Google, Trustpilot eller Facebook · QR og NFC i samme stander ·
                ingen app for dine kunder
              </p>
            </div>

            {/* Skærmen kunden lander på — samme greb som stempelkortsiden.
                Fotoet bag den bliver stående; kortet har sin egen skygge og
                lægger sig oven på det i stedet for at erstatte det. */}
            <div className="lg:justify-self-end lg:pl-8">
              <div className="relative mx-auto w-full max-w-[23rem]">
                <div className="relative">
                  <AnmeldelseVisual />

                  {/* To emblemer, ét pr. ende af flowet: hvordan kunden
                      kommer ind foroven, og hvad de kan vælge forneden. De
                      peger på hver sin del af kortet.

                      Det øverste er BEIGE og ikke hvidt: et hvidt emblem på
                      et hvidt kort har ingen kant, hvor de overlapper, og
                      læses som en linje inde i kortet. Beige giver 6,79 mod
                      den mørke sektion, petroleum kun 2,44. */}
                  <div className="absolute -top-6 -right-2 sm:-right-7">
                    <div className="btn-shape flex items-center gap-2 bg-secondary px-3 py-2 text-secondary-fg shadow-[0_16px_32px_-16px_rgba(0,0,0,0.6)]">
                      <TapIcon className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-semibold tracking-tight">
                        Ét tap ved disken
                      </span>
                    </div>
                  </div>

                  <div className="absolute -bottom-6 -left-2 sm:-left-8">
                    <div className="btn-shape flex items-center gap-2 bg-dark px-3 py-2 text-white shadow-[0_16px_32px_-16px_rgba(0,0,0,0.6)] ring-1 ring-white/15">
                      <ShareExperienceIcon className="h-4 w-4 shrink-0 text-secondary" />
                      <span className="text-xs font-medium">
                        Du vælger platformene
                      </span>
                    </div>
                  </div>
                </div>

                <p className="mt-10 text-center text-xs text-white/50">
                  Sådan ser kundens skærm ud efter et tap
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- sådan virker den */}
        <section id="saadan" className="bg-background">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Sådan virker den
            </h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <div key={s.title}>
                  <div className="flex items-center gap-3">
                    <div
                      className="btn-shape grid h-10 w-10 shrink-0 place-items-center bg-accent font-bold text-accent-fg"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </div>
                    <s.Icon className="h-10 w-10 text-accent" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold tracking-tight">
                    {s.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- problemet */}
        <section className="border-t border-border bg-muted-bg">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              De fleste tilfredse kunder anmelder dig aldrig
            </h2>
            <p className="mt-4 leading-relaxed text-foreground/90">
              Ikke fordi de ikke vil. De bliver bare aldrig mindet om det. Og
              skal man selv finde forretningen frem på Google, logge ind og
              formulere noget, mens man står med indkøbsposerne, så sker det
              ikke.
            </p>
            <p className="mt-4 leading-relaxed text-foreground/90">
              En stander på disken rammer det ene øjeblik, hvor oplevelsen er
              frisk og telefonen alligevel er fremme.{" "}
              <strong>
                Den gør vejen fra god oplevelse til anmeldelse kortere.
              </strong>
            </p>
            <p className="mt-4 text-sm text-muted">
              Vil du have hele billedet først, så læs guiden til{" "}
              <Link
                href="/blog/saadan-faar-du-flere-google-anmeldelser"
                className="font-medium text-accent"
              >
                hvordan du får flere Google-anmeldelser
              </Link>{" "}
              — inklusive de tre ting, du aldrig skal gøre.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------ google-anmeldelser */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-4xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Gør vejen til din Google-profil kortere
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-foreground/90">
              Kunden skal ikke selv søge din forretning frem, finde den rigtige
              profil og lede efter anmeldelsesknappen. Du sætter linket én gang,
              og kunden lander det rigtige sted efter ét tap.
            </p>
            <p className="mt-4 max-w-2xl leading-relaxed text-foreground/90">
              Anmeldelser på Google er offentlige og skrives af kunden selv — vi
              hverken skriver, redigerer eller udvælger dem. Standeren gør kun
              det ene: at fjerne besværet for den kunde, der gerne vil.
            </p>

            <div className="mt-8 box-shape border border-border bg-card p-6">
              <h3 className="font-bold tracking-tight">
                Feedback du kan handle på
              </h3>
              <p className="mt-2 leading-relaxed text-muted">
                Ved siden af den offentlige anmeldelse kan kunden vælge at sende
                dig feedback direkte. Det er et tilbud til den kunde, der
                hellere vil sige tingene til dig end på nettet — ikke en
                spærring.{" "}
                <strong>
                  Alle kunder har adgang til det offentlige anmeldelseslink,
                  uanset hvad de svarer.
                </strong>{" "}
                Sådan er produktet bygget, og sådan skal det være: at sortere
                kritik fra er i strid med både Googles og Trustpilots regler og
                kan koste dig dine anmeldelser.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- platforme */}
        {/* Egen sektion med ANKER, så Trustpilot-guiden kan sende læseren
            direkte hertil i stedet for til toppen af en side, hvor det første
            afsnit handler om Google. */}
        <section id="platforme" className="border-t border-border bg-muted-bg">
          <div className="mx-auto max-w-4xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Google, Trustpilot eller Facebook — du bestemmer hvor
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-foreground/90">
              Standeren er ikke bundet til én platform. Du sætter selv, hvor
              kunden skal hen. Den enkle Reviewstander sender direkte videre til
              ét link, mens Reviewstander Pro og LoyalSum Komplet giver kunden
              valget mellem de platforme, du har slået til — og lader dig skifte
              dem bagefter uden at trykke standeren om.
            </p>

            {/* KORTENE ER PRIMÆRE, TABELLEN SUPPLERER. Tabellen alene bar
                `min-w-[34rem]` og sin egen vandrette scroll, så man på en
                telefon skulle skubbe den sidelæns for at nå kolonnen om, hvem
                der vælger. Kortene er den udgave, alle kan læse; tabellen er
                den udgave, der kan skimmes — og som Google kan trække ud som
                uddrag på en sammenligningssøgning. */}
            <ul className="mt-10 grid gap-4 md:grid-cols-3">
              {PLATFORM_VALG.map((v) => {
                const vare = getProduct(v.slug);
                if (!vare) return null;
                return (
                  <li
                    key={v.slug}
                    // Fremhævningen følger `featured` i kataloget og er ikke
                    // sat i hånden — flyttes mærkatet "Mest populær" til en
                    // anden vare, flytter kanten med.
                    //
                    // Kraftigere kant og mere højde, ikke en tonet flade:
                    // sektionen står på råhvidt, og accent på 5 % oven på den
                    // blev en grumset grå, så det kort, der skulle stikke
                    // frem, læste som deaktiveret.
                    className={`box-shape flex flex-col border bg-card p-5 ${
                      vare.featured
                        ? "border-accent shadow-[var(--hoejde-2)]"
                        : "border-border shadow-[var(--hoejde-1)]"
                    }`}
                  >
                    {/* Mærkatet står OVER navnet og har fast højde i alle
                        tre kort. Ved siden af navnet skubbede det "LoyalSum
                        Komplet" ned i to linjer, så det kort, der skal stikke
                        frem, fik sine chips og sin mærkat lavere end
                        naboernes. Tom linje frem for skjult tekst: der er
                        ikke noget at læse op for en skærmlæser. */}
                    <p className="etiket h-4 text-accent">
                      {vare.featured ? "Mest populær" : ""}
                    </p>
                    <h3 className="mt-1 font-bold tracking-tight">
                      {vare.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      {prisTekst(v.slug)}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {v.platforme.map((platform) => (
                        <span
                          key={platform}
                          className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>

                    <p className="mt-4 flex items-center gap-2 border-t border-border pt-3.5 text-sm font-medium">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary"
                        aria-hidden="true"
                      />
                      {v.maerke}
                    </p>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                      {v.note}
                    </p>

                    <Link
                      href={`/produkter/${v.slug}`}
                      className="mt-4 text-sm font-medium text-accent hover:underline"
                    >
                      Se {vare.name} →
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Kun fra md og op: på en telefon siger kortene ovenfor præcis
                det samme, og fem kolonner dér ville betyde vandret scroll —
                netop dét, kortene løste. Indholdet er altså ikke skjult for
                nogen, det er vist i den form, skærmen har plads til. */}
            <div className="mt-10 hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-sm">
                <caption className="sr-only">
                  Sammenligning af Reviewstander, Reviewstander Pro og LoyalSum
                  Komplet: platforme, om destinationen kan skiftes bagefter,
                  stempelkort og pris.
                </caption>
                <thead>
                  <tr className="border-b border-border bg-background text-left">
                    <th scope="col" className="etiket px-4 py-3">
                      Løsning
                    </th>
                    <th scope="col" className="etiket px-4 py-3">
                      Platforme
                    </th>
                    <th scope="col" className="etiket px-4 py-3">
                      Kundens vej
                    </th>
                    <th scope="col" className="etiket px-4 py-3">
                      Skift bagefter
                    </th>
                    <th scope="col" className="etiket px-4 py-3">
                      Stempelkort
                    </th>
                    <th scope="col" className="etiket px-4 py-3">
                      Pris
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PLATFORM_VALG.map((v) => {
                    const vare = getProduct(v.slug);
                    if (!vare) return null;
                    return (
                      <tr key={v.slug} className="border-b border-border/60">
                        <th
                          scope="row"
                          className="px-4 py-3 text-left align-top font-medium"
                        >
                          {vare.name}
                        </th>
                        <td className="px-4 py-3 align-top">
                          {v.platformCelle}
                        </td>
                        <td className="px-4 py-3 align-top text-muted">
                          {v.kundenSer}
                        </td>
                        <td className="px-4 py-3 align-top text-muted">
                          {v.skifte}
                        </td>
                        <td className="px-4 py-3 align-top text-muted">
                          {v.stempelkort}
                        </td>
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          {prisTekst(v.slug)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-8 max-w-2xl leading-relaxed text-foreground/90">
              Beslutter du dig undervejs for at satse på Trustpilot i stedet for
              Google, tager det et klik i dashboardet — standeren på disken
              bliver stående.
            </p>

            <p className="mt-4 max-w-2xl text-sm text-muted">
              Er du i tvivl om, hvilken platform der betyder mest for din
              forretning, gennemgår vi det i guiden til{" "}
              <Link
                href="/blog/flere-trustpilot-anmeldelser"
                className="font-medium text-accent"
              >
                flere Trustpilot-anmeldelser
              </Link>{" "}
              — inklusive reglerne, du skal kende, før du spørger.
            </p>
          </div>
        </section>

        {/* --------------------------------------------------------- NFC + QR */}
        <section className="border-t border-border bg-dark text-dark-fg">
          <div className="mx-auto max-w-4xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ét tap. Eller ét scan.
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="box-shape border border-white/10 bg-white/5 p-6">
                <NfcIcon className="h-9 w-9 text-secondary" />
                <h3 className="mt-3 font-bold">Tap med NFC</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  Samme teknologi som kontaktløs betaling. Kunden holder toppen
                  af telefonen mod standeren, og siden åbner af sig selv. Ingen
                  app, ingen parring.
                </p>
              </div>
              <div className="box-shape border border-white/10 bg-white/5 p-6">
                <QrIcon className="h-9 w-9 text-secondary" />
                <h3 className="mt-3 font-bold">Scan QR-koden</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  Har telefonen ikke NFC, peger kunden bare kameraet på
                  QR-koden. Begge dele sidder på standeren, så det virker for
                  alle.
                </p>
              </div>
            </div>
            <p className="mt-6 text-white/70">
              Ingen app. Ingen søgning. Ingen lange links.
            </p>
          </div>
        </section>

        {/* --------------------------------------------------------- placering */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Placér den dér, hvor den gode oplevelse slutter
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {PLACES.map((p) => (
                <div
                  key={p.name}
                  className="box-shape border border-border bg-card p-5"
                >
                  <div className="flex items-center gap-3">
                    <IndustryBadge branche={p.branche} size="md" />
                    <h3 className="font-bold tracking-tight">{p.name}</h3>
                  </div>
                  <p className="mt-3 text-sm text-muted">{p.where}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------ reviewstander + LoyalSum */}
        <section className="border-t border-border bg-muted-bg">
          <div className="mx-auto max-w-4xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Reviewstanderen er kun begyndelsen
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-foreground/90">
              En anmeldelse hjælper dig med at blive valgt af den næste kunde.
              Men kunden, der lige har stået ved disken, kan blive mere værd end
              det — hvis du får en anledning til at se dem igen.
            </p>

            <ol className="mt-8 grid gap-3 sm:grid-cols-4">
              {[
                { label: "Anmeldelse", Icon: NewCustomersIcon },
                { label: "Feedback", Icon: FeedbackIcon },
                { label: "Loyalitet", Icon: ReturningIcon },
                { label: "Genbesøg", Icon: GrowthIcon },
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

            <p className="mt-8 max-w-2xl leading-relaxed text-foreground/90">
              Med <strong>LoyalSum Komplet</strong> kan den samme stander også
              være indgangen til dit{" "}
              <Link href="/stempelkort" className="font-medium text-accent">
                digitale stempelkort
              </Link>
              : kunden tilmelder sig selv, samler stempler og optjener en
              belønning, du selv vælger. Så bliver det fysiske touchpoint ved
              disken til en kunderelation i stedet for et enkelt klik.
            </p>

            <p className="mt-6">
              <Link href="/" className="font-medium text-accent">
                Se hele LoyalSum →
              </Link>
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------- farvevalg */}
        {/*
          SKILTENE HER ER DE RIGTIGE. De tegnes af `/api/skilt`, altså den
          samme funktion, der laver trykfilen — så salgssiden ikke kan komme
          til at vise en stander, der ser anderledes ud end den, kunden får.
          Et mockup ville før eller siden komme bagud, som "sort akryl" gjorde.

          `udsnit="front"` klipper de nederste centimeter væk, fordi de sidder
          i foden og aldrig ses. På en bestilling ville det være forkert — dér
          skal previewet vise hele trykfilen — men her står skiltet på en
          disk, ikke i en godkendelse.

          `loading="lazy"`: hver skabelon er 160 KB, og tre af dem må ikke
          koste noget, før nogen ruller herned.
        */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Sort eller hvid — og din egen farve, hvis du vil
            </h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted">
              Standeren fås i to farver til samme pris, og du vælger ved
              bestillingen. Vil du have den i forretningens egne farver, kan
              både fronten og stjernerne skiftes.
            </p>

            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {FARVEVALG.map((v) => (
                <figure key={v.navn}>
                  <SkiltPreview
                    standerFarve={v.standerFarve}
                    baggrund={v.baggrund}
                    accent={v.accent}
                    visFod={false}
                    udsnit="front"
                    loading="lazy"
                    className="mx-auto w-full max-w-[13rem]"
                  />
                  <figcaption className="mt-4 text-center">
                    <span className="block font-bold tracking-tight">
                      {v.navn}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">
                      {v.pris}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>

            <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-muted">
              {FRONT_TEKSTER.forklaring} {FRONT_TEKSTER.prisNote} Farven på
              stjernerne og teksten er derimod uden beregning — det er den samme
              trykfil med en anden farvekode.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------- produkt og priser */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              To måder at få standeren på
            </h2>
            <p className="mt-3 max-w-2xl text-muted">
              Begge er den samme fysiske stander med QR og NFC. Forskellen er,
              hvad der sker, når kunden har tappet.
            </p>

            <PurchaseNotice className="mt-8" />

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {[basis, pro].map((p) =>
                p ? (
                  <div
                    key={p.slug}
                    className="box-shape flex flex-col overflow-hidden border border-border bg-card"
                  >
                    <StanderPlaceholder
                      className="aspect-[16/9]"
                      iconClassName="h-20 w-20"
                    />
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="text-lg font-bold tracking-tight">
                        {p.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted">{p.tagline}</p>

                      <div className="mt-4">
                        <p className="text-2xl font-bold">
                          {formatCurrency(p.price)}
                        </p>
                        {p.setupPrice ? (
                          <p className="text-sm text-muted">
                            + {formatCurrency(p.setupPrice)} i opsætning
                            (engangs)
                          </p>
                        ) : null}
                        {p.monthlyPrice ? (
                          <p className="text-sm text-muted">
                            + {formatCurrency(p.monthlyPrice)}/md i abonnement
                          </p>
                        ) : (
                          <p className="text-sm text-muted">Intet abonnement</p>
                        )}
                        <p className="mt-1 text-xs text-muted">
                          Priser ex moms · fri fragt i Danmark
                        </p>
                      </div>

                      <ul className="mt-5 flex-1 space-y-2 text-sm text-muted">
                        {p.features.map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>

                      <div className="mt-6">
                        <ButtonLink
                          href={`/produkter/${p.slug}`}
                          size="lg"
                          variant={
                            p.slug === "reviewstander" ? "primary" : "outline"
                          }
                          className="w-full"
                        >
                          Se {p.name}
                        </ButtonLink>
                      </div>
                    </div>
                  </div>
                ) : null,
              )}
            </div>

            <p className="mt-6 text-sm text-muted">
              Vil du også have stempelkort og opslag med, samler{" "}
              <Link
                href="/produkter/loyalsum-komplet"
                className="font-medium text-accent"
              >
                LoyalSum Komplet
              </Link>{" "}
              det hele på én stander. Se{" "}
              <Link href="/produkter" className="font-medium text-accent">
                alle priser
              </Link>
              .
            </p>
          </div>
        </section>

        {/* -------------------------------------------------- produktdetaljer */}
        <section className="border-t border-border bg-muted-bg">
          <div className="mx-auto max-w-4xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Produktdetaljer
            </h2>
            <dl className="mt-8 grid gap-6 sm:grid-cols-2">
              {[
                {
                  t: "Bordstander i sort eller hvid akryl",
                  d: "Du vælger farven ved bestillingen. Står selv på disken, bordet eller i receptionen.",
                },
                {
                  t: "QR-kode og NFC",
                  d: "Begge dele på samme stander, så alle telefoner kan komme videre.",
                },
                {
                  t: "Dit logo trykt på skiltet",
                  d: "Du lægger det op, når du bestiller. Med Pro og Komplet vises det også på anmeldelsessiden.",
                },
                {
                  t: "Klar til brug",
                  d: "Sæt den på disken og den virker — der skal ikke installeres noget.",
                },
              ].map((item) => (
                <div key={item.t}>
                  <dt className="font-bold tracking-tight">{item.t}</dt>
                  <dd className="mt-1 text-sm text-muted">{item.d}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 text-sm text-muted">
              Køber du flere standere, falder prisen pr. stk. — se{" "}
              <Link
                href="/produkter/reviewstander"
                className="font-medium text-accent"
              >
                mængderabatten på produktsiden
              </Link>
              .
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- FAQ */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ofte stillede spørgsmål
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
          </div>
        </section>

        {/* --------------------------------------------------------- final CTA */}
        <section className="border-t border-border bg-dark text-dark-fg">
          <div className="mx-auto max-w-6xl px-4 py-20 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Gør det nemt for kunderne at anmelde dig
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/70">
              Sæt en reviewstander på disken, og giv den tilfredse kunde en
              chance for at sige det højt.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink
                variant="secondary"
                href="/produkter/reviewstander"
                size="lg"
              >
                Bestil reviewstander
              </ButtonLink>
              <ButtonLink href="/signup" variant="outline-invert" size="lg">
                Kom i gang med LoyalSum
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
