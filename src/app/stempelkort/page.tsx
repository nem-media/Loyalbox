import type { Metadata } from "next";
import Image from "next/image";
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
import { ProduktStribe } from "@/components/produkt-stribe";

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
 * Skriv IKKE noget om kassesystem-integration, MobilePay, push-beskeder, SMS,
 * e-mailmarketing, automatisk stempling uden personale eller flere afdelinger
 * pr. konto. Intet af det findes. Apple/Google Wallet nævnes KUN i FAQ'en, og
 * kun som noget kortet IKKE kan — køberne spørger, fordi konkurrenterne
 * sælger på det, og et ærligt nej er bedre end en kunde, der opdager det selv.
 *
 * TRE INDSTILLINGER I WIZARDEN GØR INTET, OG SIDEN MÅ IKKE SÆLGE DEM
 * (gennemgået 12. okt. 2026): `stamps_expire`/`stamp_expiry_days` gemmes, men
 * intet lader stempler udløbe; optjeningsmodellerne `per_amount` og
 * `campaign` er etiketter — beløbet gemmes på transaktionen, men antallet
 * tastes af personalet eller er 1 (`stampByToken`). Bygges de en dag, kan de
 * komme tilbage på siden. Kundens kortside opdaterer heller ikke af sig selv:
 * et nyt stempel ses, når kortet åbnes eller genindlæses.
 */

/*
 * METADATA ER SKREVET TIL SØGERESULTATET (12. okt. 2026). Siden stod i snit
 * på plads 8,2 for "digitalt stempelkort" over 28 dage med 0 klik, mens
 * konkurrenterne omkring den sælger på Wallet og pris. Titlen bærer derfor
 * det, folk spørger om først ("uden app"), og beskrivelsen siger, hvordan
 * stemplet gives, og at pointprogrammet følger med — to ting, de billigste
 * stempelkort ikke har. Titlen er ≤ 65 tegn MED " — LoyalSum.dk".
 */
const title = "Digitalt stempelkort til virksomheder – uden app";
const description =
  "Digitalt stempelkort uden app: kunden samler stempler på mobilen, og personalet stempler med ét scan. Pointprogram følger med i prisen. Ingen binding.";

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
    title: "Digitalt stempelkort til virksomheder — få kunderne til at komme igen",
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
    body: "Gæsten scanner QR-koden på din stander og opretter kortet på få sekunder. Kortet er en helt almindelig webside — der er ingen app at hente og ingen konto, kunden skal oprette først. Kortet hænger på kundens e-mail eller telefonnummer, så kunden kan få det tilbage med alle stempler, hvis linket bliver væk.",
  },
  {
    Icon: StampIcon,
    title: "Personalet giver et stempel",
    body: "Kunden viser QR-koden på sit kort. Personalet scanner den med kameraet på sin egen telefon og trykker én gang — eller finder kunden på navn eller telefonnummer. Stemplet er registreret med det samme, og kunden ser det næste gang, kortet åbnes. Kun personale med adgang til din forretning kan stemple.",
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

/**
 * KUN DE MODELLER, DER GØR NOGET. Wizarden viser også `per_amount` og
 * `campaign`, men ingen af dem ændrer antallet af stempler — se hovedet
 * øverst. De tre her svarer til, hvad stemplingen faktisk gør: ét tryk = ét
 * stempel (pr. køb eller pr. besøg), eller et antal, personalet selv taster.
 */
const EARN_MODELS: EarnModel[] = ["per_purchase", "per_visit", "manual"];

/**
 * Spærrerne mod misbrug. Alle fem håndhæves i `src/lib/loyalty/service.ts`
 * (`giveStamp`) og ved indløsningen — ikke kun gemt i et felt. Stempeludløb
 * stod her før og er taget ud: indstillingen findes, men intet håndhæver den.
 */
const REGLER = [
  "Højst et bestemt antal stempler pr. køb",
  "Højst et bestemt antal stempler pr. kunde pr. dag",
  "En mindste tid mellem to stempler",
  "Kun personale med adgang kan give stempler",
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

/**
 * Brancheeksempler. Tallene er de faktiske skabeloner i produktet.
 *
 * `guide` peger på blogguiden for branchen, hvor der findes en. Siden er den
 * kommercielle side for "digitalt stempelkort"; guiderne tager det
 * branchespecifikke ("stempelkort til café" osv.), og linket herfra er det,
 * der binder de to sammen i stedet for at lade dem konkurrere. Ankerteksterne
 * er bevidst forskellige og ikke "digitalt stempelkort" igen.
 */
const INDUSTRIES: {
  name: string;
  branche: Branche;
  body: string;
  template: string;
  guide?: { href: string; label: string };
}[] = [
  {
    name: "Café og kaffebar",
    branche: "cafe",
    body: "Et køb giver et stempel, og det tiende er gratis. Den klassiske kaffeaftale, bare uden papkort der falder fra hinanden i lommen.",
    template: "1 køb = 1 stempel · 10 stempler = gratis kaffe",
    guide: {
      href: "/blog/stempelkort-til-cafe",
      label: "Guide: stempelkort til café",
    },
  },
  {
    name: "Restaurant og takeaway",
    branche: "restaurant",
    body: "Et besøg giver et stempel. Efter otte besøg står der en dessert eller en ret klar til gæsten.",
    template: "1 besøg = 1 stempel · 8 stempler = gratis dessert",
    guide: {
      href: "/blog/stempelkort-til-takeaway",
      label: "Sådan bruger takeaway og pizzeria kortet",
    },
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
    body: "Beløn dem, der handler hos dig igen og igen: et stempel pr. køb eller pr. besøg. Svinger kurven meget i størrelse, kan pointprogrammet køre ved siden af.",
    template: "Du sætter selv antal og belønning",
  },
  {
    name: "Bilvask, værksted og fitness",
    branche: "vaerksted",
    body: "Alt hvor den samme kunde kommer tilbage med jævne mellemrum. Er der genbesøg i din forretning, er der en grund til et stempelkort.",
    template: "Du sætter selv antal og belønning",
    guide: {
      href: "/blog/fastholde-medlemmer-fitness",
      label: "Fitness: beløn fremmødet",
    },
  },
];

const FAQ = [
  {
    q: "Hvad er et digitalt stempelkort?",
    a: "Et digitalt stempelkort er den digitale udgave af papkortet med stempler. I stedet for et fysisk kort ligger kundens stempler på telefonen. Når kunden har samlet det antal stempler, du har bestemt, kan de hente den belønning, du har valgt — for eksempel den tiende kaffe gratis.",
  },
  {
    /*
     * MÅ IKKE LOVE, AT KONTOEN ER NØDVENDIG — eller at den er automatisk.
     * Kortet virker uden; kontoen er det frivillige lag ovenpå
     * (`loyalty_members.user_id`, 0007), og den samler på tværs af butikker,
     * fordi `getCardsForUser()` henter alle medlemsrækker for brugeren.
     */
    q: "Kan kunden have stempelkort hos flere butikker?",
    a: "Ja. Hver forretning har sit eget kort med sine egne stempler og sin egen belønning — de blandes ikke sammen. Opretter kunden en gratis konto, ligger alle hendes kort samlet på ét sted og kan åbnes fra enhver telefon. Hun kan også nøjes med linket til det enkelte kort; kontoen er frivillig.",
  },
  {
    /*
     * DET HER SPØRGSMÅL BLIVER STILLET OVER DISKEN, og indtil vi havde
     * /kort/find kunne vi ikke svare ordentligt på det: kortet KUNNE hentes
     * tilbage, men kun ved at stå i butikken. Svaret må sige begge veje — og
     * må ikke love, at et kort uden e-mail kan findes frem, for det kan det
     * ikke. Se `selfEnroll()` og `findMitKort()`.
     */
    q: "Hvad hvis kunden mister linket til sit kort?",
    a: "Så er stemplerne der stadig. Kortet hænger på kundens e-mail eller telefonnummer, ikke på linket: hun kan enten scanne koden hos dig igen og taste de samme oplysninger, eller få linket sendt på loyalsum.dk/kort/find. Opretter hun en konto, ligger alle hendes kort samlet og kan åbnes fra enhver telefon.",
  },
  {
    q: "Skal mine kunder hente en app?",
    a: "Nej. Kortet er en almindelig webside, kunden får ved at scanne QR-koden på din stander. Der er ingen app at downloade og ingen App Store. Kunden kan lægge kortet på telefonens hjemmeskærm, så det ligner en app og er lige ved hånden næste gang.",
  },
  {
    /*
     * ÆRLIGT NEJ — og ikke solgt som en fordel. Der findes ingen pkpass- eller
     * Wallet-kode (efterprøvet 12. okt. 2026). Svaret beskriver de veje,
     * kortet FAKTISK findes frem ad: hjemmeskærmen (`PwaInstall`), den
     * frivillige konto (`/mine-kort`) og `/kort/find`. Kommer Wallet en dag,
     * skal svaret skrives om samme dag.
     */
    q: "Kan kortet ligge i Apple Wallet eller Google Wallet?",
    a: "Nej, ikke i dag. LoyalSums stempelkort er en webside og kan ikke lægges i Apple Wallet eller Google Wallet. Kunden åbner kortet fra sit link, og kortet kan lægges på telefonens hjemmeskærm, så det åbner med ét tryk ligesom en app. Opretter kunden en gratis konto, ligger kortene samlet under Mine fordele og kan åbnes fra enhver telefon. Et mistet link kan kunden få tilsendt på loyalsum.dk/kort/find.",
  },
  {
    /*
     * SPØRGSMÅLET KOM MED DEN DIGITALE UDGAVE. Stempelkortet har aldrig
     * KRÆVET en stander — kortet er en webside — men indtil LoyalSum Komplet
     * Online fandtes, var standeren den eneste vej ind, og teksten her lovede
     * derfor implicit, at man skulle have en.
     */
    q: "Kræver et digitalt stempelkort en fysisk stander?",
    a: "Nej. Stempelkortet er en webside, og kunden kan komme ind ad enhver vej: en QR-kode på standeren, et link på din hjemmeside eller i din webshop, en mail eller et opslag. Med LoyalSum Komplet får du standeren med; med LoyalSum Komplet Online får du den samme platform uden — og deler selv dit link. Bruger du WooCommerce, kan webshoppen også forbindes med LoyalSum, så hver betalt ordre giver ét stempel. Stempelkortets belønning indløses i butikken; i webshoppen kan kunden kun bruge pointbelønninger.",
  },
  {
    q: "Hvordan får kunden sit stempelkort?",
    a: "Kunden scanner QR-koden på standeren og opretter kortet på få sekunder. Du kan også oprette en kunde manuelt fra dit dashboard, hvis det passer bedre til situationen — for eksempel når nogen står ved disken uden telefonen fremme.",
  },
  {
    /*
     * SÅDAN SOM DET FAKTISK FOREGÅR (efterprøvet i koden 12. okt. 2026):
     * kortet viser en QR-kode, personalet scanner den med telefonens
     * kamera — der er ingen indbygget scanner — og er de logget ind med
     * stempelret, åbner kortet i personaletilstand med en stempelknap
     * (`stampByToken`, altid 1). Uden telefon: søgning på navn eller telefon
     * på /personale. Flere stempler på én gang kun fra ejerens dashboard.
     */
    q: "Hvordan giver jeg et stempel?",
    a: "Kunden viser QR-koden på sit kort. Du scanner den med kameraet på din egen telefon, og fordi du er logget ind med adgang til butikken, åbner kortet med en stempelknap: ét tryk giver ét stempel. Har kunden ikke telefonen fremme, finder du kortet ved at søge på navn eller telefonnummer. Der skal ikke bruges en scanner, en tablet eller et kassesystem. Kun personale med adgang til din forretning kan give stempler — kunden kan altså ikke stemple sig selv.",
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
    a: "Du sætter reglerne: hvor mange stempler der højst må gives pr. køb, hvor mange en kunde kan få på én dag, og hvor lang tid der mindst skal gå mellem to stempler. Og kun personale, der er logget ind med adgang til din forretning, kan stemple. Reglerne håndhæves af systemet, ikke af hukommelsen hos den, der står ved kassen.",
  },
  {
    q: "Hvad sker der, når stempelkortet er fuldt?",
    a: "Belønningen står klar på kundens kort, og personalet indløser den, når kunden bruger den. Derefter starter kortet forfra efter de regler, du har valgt — enten på nul eller med de stempler, kunden har samlet ud over det krævede antal.",
  },
  {
    q: "Kan jeg have flere stempelkort samtidig?",
    a: "Ja. Du kan oprette flere stempelkort i din forretning og sætte dem aktive eller på pause hver for sig. Kunder, der tilmelder sig på standeren, kommer på dit første aktive stempelkort; på et ekstra kort tilmelder du dem fra dit dashboard.",
  },
  {
    q: "Hvad sker der, hvis kunden skifter telefon?",
    a: "Kortet kan altid åbnes fra sit eget link. Vil kunden være sikker på at finde det igen på en ny telefon, kan de gratis oprette en konto fra kortet og samle alle deres kort ét sted.",
  },
  {
    /*
     * SVARET ER SKREVET OM, FORDI PRODUKTET HAR ÆNDRET SIG. Før pegede det på
     * rabatter; nu findes der et rigtigt pointprogram ved siden af, og det er
     * dét, spørgsmålet i virkeligheden handler om.
     */
    q: "Hvad er forskellen på et stempelkort og et loyalitetsprogram?",
    a: "Et stempelkort er den enkleste form for loyalitetsprogram: besøg tæller op mod én belønning, du selv har valgt. LoyalSum har også et pointprogram, hvor kunden i stedet samler point og selv vælger mellem flere belønninger — det passer bedre, når regningerne er meget forskellige. De to kan køre samtidig, og begge dele er med i LoyalSum Komplet.",
  },
  {
    q: "Hvad koster et digitalt stempelkort?",
    a: "Stempelkortet er en del af LoyalSum Komplet og LoyalSum Komplet Online — og pointprogrammet følger med i samme pris, så du kan køre den ene form, den anden eller begge. Med Komplet betaler du for standeren én gang og et fast månedligt abonnement; Komplet Online er kun abonnementet, uden stander. Reviewstander og Reviewstander Pro har ikke stempelkort. Se de aktuelle priser i prisafsnittet ovenfor. Der er ingen binding: du kan opsige når som helst fra dit dashboard.",
  },
];

/* ------------------------------------------------------------------- page */

export default function StempelkortPage() {
  const komplet = getProduct("loyalsum-komplet");
  const online = getProduct("loyalsum-komplet-online");
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

      <main id="indhold">
        {/* ---------------------------------------------------------- hero */}
        {/* `overflow-hidden` er IKKE pynt: skæret bag kortet er et absolut
            felt, der stikker 4 rem ud til hver side. På en telefon ligger
            spalten allerede ude ved kanten, og uden klipningen ville siden
            kunne scrolles til højre — samme fejl som cookielinket i footeren. */}
        <section className="overflow-hidden border-b border-border bg-dark text-dark-fg">
          {/*
            sm:pr-10 ER TIL EMBLEMERNE, IKKE TIL LUFT.
            Kortet i højre spalte bærer to emblemer, der med vilje hænger ud
            over kanten (`sm:-right-7` = 28 px). Så længe rammen var 1152 px,
            lå der 64 px slæk ud til vinduet på en 1280-skærm, og overhænget
            landede i slækket. Med rammen på 1352 er slækket 16 px, og MÅLT
            ved 1280 blev emblemet klippet 12 px af sektionens
            `overflow-hidden`.

            Padding KUN i højre side: en `px-8` ville rykke H1 ind og gøre
            heroens tekstkant ulig med sektionerne nedenunder. Højre spalte er
            et billede, så dér ses de 40 px ikke — og 40 > 28 med luft til
            rest. Ændres overhænget, skal denne padding følge med.
          */}
          <div className="mx-auto grid max-w-side gap-12 px-4 py-16 sm:py-24 sm:pr-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
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
                <span className="text-secondary">faste kunder</span>{" "}
                {/* Mellemrummet er ikke til øjet — den anden linje er `block`
                    og står i forvejen for sig selv. Det er til TEKSTEN: uden
                    det læser Google og en skærmlæser overskriften som
                    "faste kundermed et digitalt stempelkort", altså et ord,
                    der ikke findes, midt i sidens vigtigste signal. */}
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
              {/* FØRTE TIL /signup. En gratis konto giver et dashboard, hvor
                  Stempelkort er LÅST — funktionen hører til LoyalSum Komplet.
                  Heroen lover altså et stempelkort og sendte læseren et sted
                  hen, hvor de ikke kan få et.

                  Samme opbygning som /reviewstander, hvor heroen leder med
                  varen og ikke med en tilmelding. /signup findes stadig i
                  headeren og i den afsluttende opfordring, hvor der også står
                  hvad det koster. */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink
                  variant="secondary"
                  href={komplet ? `/produkter/${komplet.slug}` : "/produkter"}
                  size="lg"
                >
                  {komplet ? `Se ${komplet.name}` : "Se priser"}
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
                {/*
                  TELEFONEN FØRST, SKILTET BAGVED.
                  Siden sælger en MOBIL oplevelse — "på mobilen, ingen app" —
                  så det tegnede kort er og bliver motivet. Men stempelkortet
                  fås kun med LoyalSum Komplet, og dét er en æske med et
                  skilt i: `reviewstander-cafe-komplet.jpg` er netop den vare
                  på en cafédisk, med mærkatet, der siger "indeholder
                  stempelkort". Fotoet er derfor ikke stemning, det er varen.

                  Det ligger BAGVED og mindre, fordi rækkefølgen i billedet
                  skal være den samme som i overskriften: telefonen er
                  løftet, skiltet er dét, man får med.

                  `hero-cafe.jpg` og `stempelkort-app.webp` blev fravalgt og
                  må ikke komme ind: det første viser en stander af den GAMLE
                  sorte model med et andet logo, det andet er et skærmbillede
                  i den forrige GRØNNE brandfarve med demo-data. Begge ville
                  være en designø fra et tidligere LoyalSum.
                */}
                <div className="absolute -left-14 top-24 z-0 w-[52%] overflow-hidden rounded-[var(--radius-shape)] shadow-[var(--hoejde-3)] ring-1 ring-white/15 sm:-left-24">
                  <Image
                    src="/reviewstander-cafe-komplet.jpg"
                    alt=""
                    aria-hidden="true"
                    width={1000}
                    height={1250}
                    sizes="(min-width: 1024px) 13rem, 38vw"
                    className="h-auto w-full"
                  />
                </div>

                <div className="relative z-10 w-full">
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
                    <div className="absolute -top-6 right-3 lg:-right-7">
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

                    <div className="absolute -bottom-6 left-3 lg:-left-8">
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

        {/* ------------------------------------------- produkterne, lige her */}
        {/* Den købeklare skal ikke lede. Se ProduktStribe for hvorfor det er
            en stribe og ikke kataloggitteret. */}
        <ProduktStribe aktuel="loyalsum-komplet" />

        {/* ------------------------------------- hvad er et digitalt stempelkort */}
        <section className="bg-background">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hvad er et digitalt stempelkort?
            </h2>
            <p className="mt-4 leading-relaxed text-foreground/90">
              Et <strong>digitalt stempelkort</strong> er den digitale udgave af
              det klassiske papstempelkort. Det kaldes også et{" "}
              <strong>elektronisk stempelkort</strong>, et bonuskort eller et
              digitalt loyalitetskort — det er det samme. I stedet for et fysisk
              kort, kunden skal huske at have med, registreres stemplerne
              digitalt og ligger på kundens telefon. Når kunden har samlet det
              antal stempler, du har bestemt, kan de hente den belønning, du har
              valgt.
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
        <section className="sektion-skaer border-t border-border bg-muted-bg">
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

            {/* Den, der lige har læst de fem trin, vil vide hvad det koster
                — ikke oprette en konto uden stempelkort i. */}
            <div className="mt-10">
              <ButtonLink
                href={komplet ? `/produkter/${komplet.slug}` : "/produkter"}
                size="lg"
              >
                {komplet ? `Se ${komplet.name}` : "Se priser"}
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------- digitalt vs. fysisk */}
        <section className="sektion-skaer border-t border-border bg-muted-bg">
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
                  {/* KONTOEN ER FRIVILLIG, og sætningen siger det. Kortet
                      virker uden — men vælger kunden en konto, ligger kortene
                      fra alle hendes butikker samlet, og så overlever de en
                      ny telefon. Det er svaret på papkortets "bliver glemt
                      eller væk" i kolonnen ved siden af. */}
                  <li>
                    Med en gratis konto ligger kundens kort fra alle butikker
                    samlet — også på en ny telefon
                  </li>
                  <li>Ingen tryk, intet oplag, ingen genoptryk</li>
                  <li>Du ændrer belønning og regler ét sted</li>
                  <li>
                    Du kan se aktiviteten og hvem der er tæt på en belønning
                  </li>
                  <li>Kun personale med adgang kan give stempler</li>
                </ul>
              </div>
            </div>

            <p className="mt-6 max-w-2xl text-sm text-muted">
              Har din forretning få genbesøg og ingen interesse i tallene
              bagved, gør papkortet det fint. Det digitale kort betaler sig, når
              kunderne kommer igen — og du vil vide hvor mange. Regnestykket
              står i{" "}
              <Link
                href="/blog/stempelkort-app-eller-papkort"
                className="font-medium text-accent hover:underline"
              >
                sammenligningen af papkort, app og digitalt kort
              </Link>
              .
            </p>

            {/* DEN TREDJE MULIGHED HØRER TIL HER. Afsnittet stiller papkortet
                op mod det digitale kort, og begge dele tæller BESØG. Er
                købene meget forskellige i størrelse, er svaret hverken det
                ene eller det andet, og en fordele/ulemper-oversigt, der ikke
                nævner den udvej, sender en læser videre med et halvt svar.
                Pointprogrammet følger med den samme vare. */}
            <p className="mt-3 max-w-2xl text-sm text-muted">
              Er købene hos dig meget forskellige i størrelse — en kop kaffe den
              ene dag, en hel frokost den næste — passer et stempel pr. besøg
              skævt. Så er et{" "}
              <Link href="/loyalitetsprogram" className="font-medium text-accent">
                pointprogram
              </Link>{" "}
              det rigtige: kunden optjener efter beløb og vælger selv mellem
              dine belønninger. Begge dele følger med samme abonnement.
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
                    <span className="text-xs text-muted">
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

              {/* SVARET PÅ "KAN DET GÅ EFTER BELØB?" — det spørgsmål stiller
                  alle med store og små køb, og siden lovede før en model, der
                  ikke regner noget ud. Beløbet KAN noteres i dashboardet, men
                  antallet vælger personalet; det automatiske svar er point. */}
              <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">
                Stemplerne gives altid af personalet: ét tryk på kundens kort
                giver ét stempel, og fra kundeoversigten i dit dashboard kan du
                give flere på én gang. Købsbeløbet kan noteres, men
                omregnes ikke selv til stempler. Skal belønningen følge beløbet,
                regner pointprogrammet det ud — se,{" "}
                <Link
                  href="/blog/stempelkort-til-bageri"
                  className="font-medium text-accent hover:underline"
                >
                  hvordan et bageri med små og store køb vælger
                </Link>
                .
              </p>
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
              <p className="mt-2 max-w-2xl text-sm leading-relaxed">
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
        <section className="sektion-skaer border-t border-border bg-muted-bg">
          <div className="mx-auto max-w-side px-4 py-16">
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
                  {b.guide ? (
                    <Link
                      href={b.guide.href}
                      className="trykmaal mt-3 self-start text-sm font-medium text-accent hover:underline"
                    >
                      {b.guide.label} →
                    </Link>
                  ) : null}
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
                <h3 className="mt-1 font-bold">Loyalitet og belønninger</h3>
                <p className="mt-2 text-sm text-white/70">
                  Stempelkort, pointprogram, rabatter til udvalgte kunder og
                  overblik over, hvem der er tæt på en belønning.
                </p>
              </div>
            </div>

            <p className="mt-8">
              <Link href="/" className="trykmaal font-medium text-secondary">
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
              {/* HVAD MAN FÅR, HVAD DET KOSTER, OG HVAD DER IKKE ER MED.
                  Stempelkortet sælges ikke alene: det er en del af platformen,
                  og prisen skal læses sådan — ikke sammenlignes med et rent
                  stempelkort til 99 kr. Begge varer med stempelkort står her,
                  og tallene slås op i kataloget og skrives aldrig af. */}
              <p className="mt-4 max-w-2xl leading-relaxed text-foreground/90">
                Stempelkortet får du med <strong>{komplet.name}</strong>, som
                samler stempelkort, pointprogram, feedback og opslag af dine
                bedste anmeldelser — med en stander med QR og NFC til disken.
                Begge loyalitetsformer er med i prisen — du vælger selv den ene,
                den anden eller begge.
              </p>


              <div className="mt-4 box-shape border border-border bg-card p-6">
                <dl className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-sm text-muted">Stander (engangsbeløb)</dt>
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
                {/* "Ingen binding" står HER og ikke kun i FAQ'en: det er ved
                    prisen, spørgsmålet melder sig, og et svar, man skal rulle
                    ned efter, når det ikke. */}
                <p className="mt-4 text-sm text-muted">
                  Alle priser er ex moms. Køber du flere standere, falder prisen
                  pr. stk. Ingen binding.
                </p>
                {online?.monthlyPrice ? (
                  <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed">
                    <strong>Uden stander:</strong>{" "}
                    <Link
                      href={`/produkter/${online.slug}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {online.name}
                    </Link>{" "}
                    har den samme platform for{" "}
                    {formatCurrency(online.monthlyPrice)}/md ex moms og ingen
                    engangsbeløb — du deler selv dit link og din QR-kode.
                  </p>
                ) : null}
                <p className="mt-3 text-sm text-muted">
                  Reviewstander og Reviewstander Pro samler anmeldelser, men har
                  hverken stempelkort eller pointprogram.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href={`/produkter/${komplet.slug}`} size="lg">
                    Se {komplet.name}
                  </ButtonLink>
                  <ButtonLink href="/produkter" variant="outline" size="lg">
                    Sammenlign alle priser
                  </ButtonLink>
                </div>
                {/* Én linje, ikke en sektion: WooCommerce er ikke stempelkortets
                    historie, men en webshop kan give stempler for ordrer. */}
                <p className="mt-4 text-sm text-muted">
                  Driver du også webshop?{" "}
                  <Link
                    href="/woocommerce-loyalitetsprogram"
                    className="font-medium text-accent hover:underline"
                  >
                    Se, hvordan LoyalSum fungerer med WooCommerce
                  </Link>
                  .
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {/* ---------------------------------------------------------------- FAQ */}
        <section className="sektion-skaer border-t border-border bg-muted-bg">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ofte stillede spørgsmål om digitale stempelkort
            </h2>
            <div className="mt-8 divide-y divide-border border-y border-border">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="trykmaal cursor-pointer list-none font-bold tracking-tight marker:content-none">
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
          <div className="mx-auto max-w-side px-4 py-20 text-center">
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

      {/* Sidste sektion er mørk — se `overMoerk` i SiteFooter. */}
      <SiteFooter overMoerk />
    </>
  );
}
