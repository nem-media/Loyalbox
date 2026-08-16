/**
 * Blogindhold. Ligger som data i kode (samme mønster som produkter) — en
 * fremtidig planlagt agent kan tilføje nye poster som objekter her.
 *
 * Hver artikel rammer et bestemt søgeord/intentionsniveau og krydslinker til de
 * øvrige + produktsiderne (intern linking styrker SEO).
 */

export type BlogBlock =
  | { type: "p"; html: string } // afsnit — betroet, førstepartsmarkup (links/fed)
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "cta"; text: string; href: string; label: string };

export interface BlogPost {
  slug: string;
  title: string;
  /** Valgfri override til <title>; ellers bruges title. */
  metaTitle?: string;
  description: string;
  /** Primært målsøgeord (intern note). */
  keyword: string;
  date: string; // ISO
  readingMinutes: number;
  excerpt: string;
  /** Artikelbillede under /public. Bruges som topbillede, kort i oversigten og OG-billede. */
  image: string;
  /**
   * Alt-tekst: beskriver hvad billedet VISER, ikke hvad artiklen handler om.
   * Skriv den som du ville forklare billedet i telefonen — det er både det,
   * skærmlæsere oplæser, og det Google bruger i billedsøgning. Ingen søgeord
   * stoppet ind, ingen "billede af".
   */
  imageAlt: string;
  body: BlogBlock[];
}

export const POSTS: BlogPost[] = [
  {
    slug: "hvor-mange-stempler-stempelkort",
    title: "Hvor mange stempler bør et stempelkort have?",
    metaTitle: "Hvor mange stempler bør et stempelkort have?",
    description:
      "10 stempler til en café, 6 til en frisør — men hvorfor? Sådan finder du det rigtige antal stempler ud fra, hvor tit dine kunder kommer, og hvad belønningen koster dig.",
    keyword: "hvor mange stempler stempelkort",
    date: "2026-07-22",
    readingMinutes: 4,
    excerpt:
      "Sætter du tallet for højt, giver kunden op. Sætter du det for lavt, forærer du penge væk. Her er den regnemetode, der giver dig det rigtige antal stempler til netop din forretning.",
    image: "/blog/stempelkort-antal-stempler.svg",
    imageAlt:
      "Digitalt stempelkort med ti felter, hvor syv er stemplet og det tiende felt er belønningen",
    body: [
      {
        type: "p",
        html: "Det er det første spørgsmål, der melder sig, når man skal lave et stempelkort: <strong>hvor mange stempler skal der til?</strong> Sætter du tallet for højt, opgiver kunden undervejs og kortet bliver ligegyldigt. Sætter du det for lavt, forærer du fortjeneste væk til folk, der alligevel var kommet igen.",
      },
      {
        type: "p",
        html: "Der findes ikke ét rigtigt tal. Men der findes en enkel måde at finde dit på — og den bygger på to ting, du allerede kender: hvor tit dine kunder kommer, og hvad belønningen koster dig.",
      },
      { type: "h2", text: "Start med hvor tit kunden kommer" },
      {
        type: "p",
        html: "Et stempelkort skal kunne fyldes inden for et tidsrum, kunden kan overskue. En kaffekunde, der kommer to-tre gange om ugen, når 10 stempler på en måned — det føles opnåeligt. En frisørkunde, der kommer hver ottende uge, ville være næsten et år om det samme. Derfor har frisøren typisk et kort med langt færre felter.",
      },
      {
        type: "p",
        html: "Regn baglæns: hvor lang tid vil du have, der går, før kunden når belønningen? For de fleste forretninger er svaret et sted mellem <strong>en måned og et halvt år</strong>. Divider med hvor tit kunden kommer, og du har dit tal.",
      },
      { type: "h2", text: "Tjek derefter hvad belønningen koster dig" },
      {
        type: "p",
        html: "Belønningen skal koste dig mindre end det, du tjener på de besøg, der går forud. Bemærk at den koster dig <strong>din indkøbspris, ikke din salgspris</strong> — en gratis kaffe koster bønner og mælk, ikke de fyrre kroner på skiltet. Det er derfor gratis-produkt-belønninger næsten altid er billigere for dig end en procentrabat på et helt køb.",
      },
      {
        type: "p",
        html: "Er belønningen dyr, skal antallet op. Er den billig, kan du sætte det ned og gøre kortet mere motiverende.",
      },
      { type: "h2", text: "De tal andre bruger" },
      {
        type: "p",
        html: "Til at komme i gang har LoyalSum fire færdige skabeloner, som rammer det, der typisk fungerer i de fire brancher:",
      },
      {
        type: "ul",
        items: [
          "<strong>Café:</strong> 1 køb = 1 stempel · 10 stempler = gratis kaffe",
          "<strong>Restaurant:</strong> 1 besøg = 1 stempel · 8 stempler = gratis dessert",
          "<strong>Frisør:</strong> 1 besøg = 1 stempel · 6 stempler = 20 % rabat",
          "<strong>Klinik:</strong> 1 behandling = 1 stempel · 5 stempler = valgfri bonus",
        ],
      },
      {
        type: "p",
        html: "Læg mærke til mønsteret: jo sjældnere kunden kommer, og jo dyrere hvert besøg er, jo færre stempler. Det er hele logikken på fire linjer.",
      },
      { type: "h2", text: "Hvad hvis du gætter forkert?" },
      {
        type: "p",
        html: "Så retter du det. Et <a href=\"/stempelkort\">digitalt stempelkort</a> er ikke trykt i tusind eksemplarer — du kan sætte et program på pause og starte et nyt med andre tal, uden at nogen står med et forældet papkort i hånden. Det er en af de mere undervurderede fordele ved at gøre kortet digitalt.",
      },
      {
        type: "p",
        html: "Et godt sted at begynde: vælg det tal, der svarer til cirka to måneders besøg for en typisk kunde. Kig på det igen efter et kvartal, og se på, hvor mange der rent faktisk når belønningen. Når næsten ingen frem, er tallet for højt.",
      },
      {
        type: "cta",
        text: "Klar til at lave dit eget stempelkort?",
        href: "/stempelkort",
        label: "Se hvordan stempelkortet virker",
      },
    ],
  },
  {
    slug: "kundeklub-uden-app-guide",
    title: "Kundeklub uden app: Guide til lokale forretninger",
    metaTitle: "Kundeklub uden app — guide til lokale forretninger",
    description:
      "En kundeklub behøver ikke en app. Sådan laver du et enkelt loyalitetsprogram, kunderne faktisk bruger — og som får dem til at handle hos dig igen.",
    keyword: "kundeklub",
    date: "2026-07-21",
    readingMinutes: 6,
    excerpt:
      "De store kæder har kundeklubber med apps og point. Men som lokal forretning har du en fordel, de ikke har — og du behøver hverken app eller stort budget. Her er guiden.",
    image: "/blog/kundeklub-uden-app.svg",
    imageAlt:
      "Skilt med QR-kode på en disk ved siden af en telefon, der viser kundens stempelkort i browseren",
    body: [
      {
        type: "p",
        html: "En <strong>kundeklub</strong> handler om én ting: at give dine bedste kunder en grund til at blive ved med at vælge dig. De store kæder gør det med apps, point og nyhedsbreve. Men som lokal forretning behøver du hverken app eller stort budget — faktisk har du en fordel, kæderne ikke har: den personlige relation.",
      },
      { type: "h2", text: "Hvorfor apps sjældent virker for små forretninger" },
      {
        type: "p",
        html: "En app lyder som den professionelle løsning, men den er også den største barriere. Kunden skal finde den, hente den, oprette en konto og huske at bruge den. For en enkelt café eller klinik er det for meget besvær — og resultatet er en app, ingen bruger.",
      },
      {
        type: "p",
        html: "Løsningen er en <strong>kundeklub uden app</strong>: al værdien af et loyalitetsprogram, uden barrieren.",
      },
      { type: "h2", text: "Sådan ser en enkel kundeklub ud" },
      {
        type: "ul",
        items: [
          "Kunden tilmelder sig ved at <strong>scanne et skilt</strong> — ingen app, ingen konto.",
          "De samler stempler eller point på deres telefon ved hvert køb.",
          "De optjener belønninger, der får dem tilbage — og du ser det hele i ét dashboard.",
        ],
      },
      { type: "h2", text: "Design en belønning der virker" },
      {
        type: "p",
        html: "Den bedste belønning er <strong>konkret, opnåelig og relevant</strong>. \"10. kop kaffe er gratis\" slår \"spar op til rabatter\", fordi kunden kan se målet. Hold det enkelt — én klar belønning er stærkere end et kompliceret pointsystem.",
      },
      { type: "h2", text: "Kom i gang uden teknisk bøvl" },
      {
        type: "p",
        html: "Du behøver ikke bygge noget selv. Med et <a href=\"/stempelkort\">digitalt stempelkort</a> fra LoyalSum har du en kundeklub kørende samme dag: sæt skiltet på disken, vælg din belønning, og lad kunderne tilmelde sig selv. Vil du også have flere anmeldelser med i samme skilt, kan du <a href=\"/produkter/loyalsum-komplet\">se hele platformen her</a>.",
      },
      {
        type: "cta",
        text: "Start din kundeklub i dag",
        href: "/produkter/loyalsum-komplet",
        label: "Se LoyalSum Komplet",
      },
    ],
  },
  {
    slug: "saadan-faar-du-flere-google-anmeldelser",
    title: "Sådan får du flere Google-anmeldelser",
    metaTitle: "Sådan får du flere Google-anmeldelser — guide til lokale forretninger",
    description:
      "Dine tilfredse kunder anmelder dig sjældent — de bliver ikke mindet om det. Her er de metoder der virker for en lokal forretning, og de tre ting du aldrig må gøre.",
    keyword: "få flere google anmeldelser",
    date: "2026-07-06",
    readingMinutes: 6,
    excerpt:
      "Det handler sjældent om, at kunderne er utilfredse. De glemmer det, det er besværligt, og de bliver ikke spurgt på det rigtige tidspunkt. Her er hvad du gør ved det.",
    image: "/blog/flere-google-anmeldelser.svg",
    imageAlt:
      "Kunde ved disken der giver fem stjerner på sin telefon efter at have scannet en stander",
    body: [
      {
        type: "p",
        html: "De fleste tjekker anmeldelser, før de vælger en café, en frisør eller et værksted, de ikke har prøvet før. Har du fem anmeldelser og konkurrenten hundrede, taber du valget, før nogen har smagt din kaffe.",
      },
      {
        type: "p",
        html: "Alligevel kæmper næsten alle lokale forretninger med at få dem. Det handler sjældent om utilfredse kunder — det handler om, at ingen nogensinde bad dem om det på det rigtige tidspunkt.",
      },
      { type: "h2", text: "Derfor anmelder dine kunder ikke" },
      {
        type: "p",
        html: "Tre årsager går igen, og de har alle en praktisk løsning:",
      },
      {
        type: "ul",
        items: [
          "De <strong>glemmer det</strong>, så snart de er ude ad døren.",
          "Det er <strong>for besværligt</strong> at finde din profil frem og navigere til anmeldelsesfeltet.",
          "De <strong>bliver aldrig spurgt</strong> — eller de bliver spurgt en uge senere i en mail, de ikke åbner.",
        ],
      },
      { type: "h2", text: "1. Spørg mens oplevelsen er frisk" },
      {
        type: "p",
        html: "Det bedste tidspunkt er, mens kunden stadig står i lokalet med den gode følelse i behold. En dag senere er momentet væk, og med det også lysten til at skrive noget pænt.",
      },
      { type: "h2", text: "2. Fjern hvert eneste klik" },
      {
        type: "p",
        html: "Hvert ekstra trin koster anmeldelser. Send kunden <strong>direkte</strong> til anmeldelsesfeltet — ikke til din forside, og ikke til en Google-søgning på dit navn. Kan kunden skrive og sende på under et minut, gør mange det. Skal de først lede, gør næsten ingen det.",
      },
      { type: "h2", text: "3. Gør det synligt dér hvor kunden betaler" },
      {
        type: "p",
        html: "Personalet glemmer at spørge, når der er travlt — og de fleste har det akavet med at bede om det. Et skilt gør det for dem, hver eneste gang, uden at nogen skal sige noget. Det er præcis dét, en <a href=\"/reviewstander\">reviewstander</a> er lavet til: kunden tapper eller scanner ved disken og er inde på din anmeldelsesside med det samme.",
      },
      { type: "h2", text: "4. Giv kunden et alternativ til den offentlige anmeldelse" },
      {
        type: "p",
        html: "Nogle kunder vil hellere sige tingene til dig end på nettet. Får de muligheden for at sende dig feedback direkte, hører du om problemet, mens du stadig kan nå at rette op — og kunden føler sig hørt. Men det offentlige link skal stå åbent for alle uanset hvad de mener. At sortere kritik fra er i strid med Googles retningslinjer, og det er en dårlig forretning: en profil uden en eneste kritisk anmeldelse ser falsk ud.",
      },
      { type: "h2", text: "5. Tre ting du aldrig skal gøre" },
      {
        type: "ul",
        items: [
          "<strong>Køb aldrig anmeldelser.</strong> Falske anmeldelser er i strid med Googles retningslinjer og kan koste dig hele profilen — ikke bare de købte.",
          "<strong>Beløn aldrig en anmeldelse.</strong> Rabat eller gratis kaffe mod en anmeldelse er ikke tilladt. Du må gerne belønne et genbesøg — bare ikke det, kunden skriver.",
          "<strong>Spørg ikke kun de glade.</strong> Vurderer du på forhånd, hvem der må anmelde dig, bryder du reglerne, og resultatet holder ikke.",
        ],
      },
      { type: "h2", text: "Hvor mange anmeldelser skal du have?" },
      {
        type: "p",
        html: "Der findes ikke et magisk tal, men to ting betyder mere end mængden: at anmeldelserne er <strong>nye</strong>, og at der kommer nogle ind <strong>løbende</strong>. Halvtreds anmeldelser fra i år vejer tungere hos en kunde end to hundrede fra 2019. Derfor er en fast, lille strøm bedre end en kampagne, der giver tredive på en uge og ingenting bagefter.",
      },
      { type: "h2", text: "Den nemmeste måde at få det til at ske" },
      {
        type: "p",
        html: "Skal du kun gøre én ting, så gør det synligt ved kassen og fjern klikkene. En stander med QR og NFC løser begge dele på én gang: kunden ser den i det rigtige øjeblik og er ét tap fra at kunne skrive. Resten — tidspunktet, tonen, opfølgningen — kommer af sig selv, når vejen er kort nok.",
      },
      {
        type: "cta",
        text: "Gør det nemt for kunderne at anmelde dig.",
        href: "/reviewstander",
        label: "Se reviewstanderen",
      },
    ],
  },
  {
    slug: "google-review-stander-guide",
    title: "Google review-stander: Hvad er det, og virker det?",
    metaTitle: "Google review-stander — guide, pris og sådan virker det",
    description:
      "Alt om Google review-standere: hvordan NFC og QR virker, hvorfor de slår at spørge manuelt, hvad du skal kigge efter, og hvad de koster.",
    keyword: "google review stander",
    date: "2026-07-04",
    readingMinutes: 5,
    excerpt:
      "En review-stander gør det nemt for kunder at anmelde din forretning med et enkelt tap eller scan. Her er alt du skal vide, før du vælger en.",
    image: "/blog/review-stander-qr-nfc.svg",
    imageAlt:
      "Reviewstander med QR-kode og NFC-felt, mens en telefon holdes hen til NFC-feltet",
    body: [
      {
        type: "p",
        html: "En <strong>Google review-stander</strong> (også kaldet anmeldelsesstander) er en lille fysisk stander til kassen eller bordet, der lader dine kunder anmelde forretningen med et enkelt scan eller tap. Den fjerner besværet ved at finde frem til din Google-profil — og det er netop besværet, der ellers koster dig de fleste anmeldelser.",
      },
      { type: "h2", text: "Sådan virker NFC og QR" },
      {
        type: "p",
        html: "Standeren bruger to teknologier: en <strong>QR-kode</strong>, kunden scanner med kameraet, og <strong>NFC</strong> — samme trådløse teknologi, du bruger, når du betaler med telefonen. Kunden holder blot telefonen mod standeren, og anmeldelsessiden åbner automatisk. NFC understøttes af alle iPhones fra XR og frem samt cirka 90&nbsp;% af Android-telefoner.",
      },
      { type: "h2", text: "Hvorfor det slår at spørge manuelt" },
      {
        type: "p",
        html: "At bede personalet spørge hver kunde er ustabilt: det bliver glemt i en travl periode, og mange kunder siger ja men gør det aldrig. En stander står der altid, ser professionel ud og virker på det rigtige tidspunkt — lige når kunden betaler. Vil du have flere metoder, så læs <a href=\"/blog/saadan-faar-du-flere-google-anmeldelser\">sådan får du flere Google-anmeldelser</a>.",
      },
      { type: "h2", text: "Hvad du skal kigge efter" },
      {
        type: "ul",
        items: [
          "<strong>Både QR og NFC</strong> — så alle kunder kan bruge den.",
          "<strong>Dynamisk link</strong> du kan ændre uden at genoptrykke standeren.",
          "<strong>Privat feedback</strong> som et alternativ, kunden selv kan vælge — så du hører om en dårlig oplevelse og kan rette op.",
          "<strong>Eget design/logo</strong>, så standeren matcher din forretning.",
          "<strong>Statistik</strong>, så du kan se scanninger og effekt.",
        ],
      },
      { type: "h2", text: "Hvad koster en review-stander?" },
      {
        type: "p",
        html: "Der findes to modeller: en <strong>engangspris</strong> for selve standeren, og et <strong>abonnement</strong>, hvis du vil have dashboard, statistik og dynamiske links oveni. Hos LoyalSum starter en stander ved en enkel engangspris, og du kan opgradere til abonnement, når du vil have fuld indsigt. Se de tre niveauer på <a href=\"/produkter\">produktsiden</a>.",
      },
      {
        type: "p",
        html: "Vil du selv lave en gratis QR-kode først for at teste? Så læs vores <a href=\"/blog/qr-kode-til-google-anmeldelser\">guide til QR-kode til Google-anmeldelser</a> — og se hvor grænserne går.",
      },
      {
        type: "cta",
        text: "Klar til flere anmeldelser? Se LoyalSum-standerne.",
        href: "/produkter",
        label: "Se produkterne",
      },
    ],
  },
  {
    slug: "qr-kode-til-google-anmeldelser",
    title: "QR-kode til Google-anmeldelser: Sådan laver du en",
    metaTitle: "QR-kode til Google-anmeldelser — gratis guide (2026)",
    description:
      "Sådan laver du en gratis QR-kode til dine Google-anmeldelser trin for trin — og hvornår det bedre kan betale sig med en færdig anmeldelsesstander.",
    keyword: "qr kode til google anmeldelser",
    date: "2026-07-02",
    readingMinutes: 5,
    excerpt:
      "Du kan lave en gratis QR-kode til dine Google-anmeldelser på få minutter. Her er trinene — og de vigtige begrænsninger du bør kende.",
    image: "/blog/qr-kode-anmeldelser.svg",
    imageAlt:
      "QR-kode der scannes med en telefons kamera og fører direkte til virksomhedens anmeldelsesside",
    body: [
      {
        type: "p",
        html: "En QR-kode, der sender kunder direkte til din Google-anmeldelse, er en af de billigste måder at få flere anmeldelser på. Du kan lave en gratis på få minutter. Her er hvordan — og hvornår en færdig løsning er pengene værd.",
      },
      { type: "h2", text: "Trin 1: Find dit Google-anmeldelseslink" },
      {
        type: "p",
        html: "Log ind på din <strong>Google Virksomhedsprofil</strong>, vælg &quot;Få flere anmeldelser&quot;, og kopiér linket. Google laver det hele for dig — du skal ikke selv bygge noget.",
      },
      { type: "h2", text: "Trin 2: Lav QR-koden" },
      {
        type: "p",
        html: "Indsæt linket i en gratis QR-generator og download billedet. Test altid koden med din egen telefon, før du printer — den skal åbne anmeldelsesfeltet direkte.",
      },
      { type: "h2", text: "Trin 3: Placér den, hvor kunderne er" },
      {
        type: "ul",
        items: [
          "Ved <strong>kassen</strong> eller receptionen.",
          "På <strong>bordene</strong> i en café eller restaurant.",
          "På <strong>kvitteringen</strong> eller i pakken ved webshop-ordrer.",
        ],
      },
      {
        type: "p",
        html: "Tilføj en kort tekst som &quot;Giv os en vurdering på 10 sekunder — scan her&quot;. Jo enklere og mere synlig beskeden er, jo flere scanner.",
      },
      { type: "h2", text: "Begrænsningerne ved en gratis QR-kode" },
      {
        type: "p",
        html: "En printet QR-kode virker — men den er statisk og &quot;dum&quot;. Den kan ikke ret meget:",
      },
      {
        type: "ul",
        items: [
          "Den <strong>kan ikke ændres</strong> — skifter linket, skal alt genoptrykkes.",
          "Ingen <strong>NFC</strong>, så kunder skal aktivt åbne kameraet.",
          "Ingen <strong>statistik</strong> på scanninger og effekt.",
          "Ingen <strong>privat feedback</strong> — utilfredse kunder ryger direkte offentligt.",
        ],
      },
      {
        type: "p",
        html: "Vil du have QR + NFC, dynamiske links, statistik og privat feedback i én pæn stander, så tager en <a href=\"/blog/google-review-stander-guide\">Google review-stander</a> over, hvor den gratis kode stopper. Og vil du have flere metoder til at få anmeldelser, så læs <a href=\"/blog/saadan-faar-du-flere-google-anmeldelser\">sådan får du flere Google-anmeldelser</a>.",
      },
      {
        type: "cta",
        text: "Spring besværet over — få en færdig stander med QR og NFC.",
        href: "/produkter",
        label: "Se produkterne",
      },
    ],
  },
];

/** Poster sorteret nyeste først (til blogoversigten). */
export const POSTS_BY_DATE = [...POSTS].sort((a, b) =>
  a.date < b.date ? 1 : -1,
);

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

/** Formatér ISO-dato som dansk dato, fx "6. juli 2026". */
export function formatBlogDate(iso: string): string {
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
