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
  body: BlogBlock[];
}

export const POSTS: BlogPost[] = [
  {
    slug: "saadan-faar-du-flere-google-anmeldelser",
    title: "Sådan får du flere Google-anmeldelser (der virker i 2026)",
    metaTitle: "Sådan får du flere Google-anmeldelser — guide 2026",
    description:
      "Vil du have flere Google-anmeldelser? Her er de metoder der faktisk virker for lokale forretninger — og den nemmeste vej til flere 5-stjernede anmeldelser.",
    keyword: "få flere google anmeldelser",
    date: "2026-07-06",
    readingMinutes: 6,
    excerpt:
      "Flere Google-anmeldelser giver mere tillid, bedre lokal placering og flere kunder. Her er de metoder der virker — og den nemmeste af dem alle.",
    body: [
      {
        type: "p",
        html: "Næsten alle tjekker anmeldelser, før de vælger en lokal forretning. Undersøgelser viser, at op mod 86&nbsp;% af forbrugerne læser anmeldelser af lokale virksomheder, og blandt de 18-34-årige stoler 91&nbsp;% lige så meget på online anmeldelser som på en personlig anbefaling. Flere gode Google-anmeldelser betyder derfor både mere tillid, en bedre placering i den lokale Google-søgning — og i sidste ende flere kunder.",
      },
      {
        type: "p",
        html: "Alligevel kæmper de fleste forretninger med at få dem. Her er hvorfor — og hvad du kan gøre ved det.",
      },
      { type: "h2", text: "Derfor anmelder dine kunder ikke" },
      {
        type: "p",
        html: "Det handler sjældent om, at kunderne er utilfredse. De tre reelle årsager er næsten altid de samme:",
      },
      {
        type: "ul",
        items: [
          "De <strong>glemmer det</strong>, når de er kommet hjem.",
          "Det er <strong>for besværligt</strong> at finde frem til anmeldelsessiden.",
          "De <strong>bliver ikke spurgt</strong> på det rigtige tidspunkt.",
        ],
      },
      {
        type: "p",
        html: "Løser du de tre ting, stiger antallet af anmeldelser markant. Her er fem konkrete måder.",
      },
      { type: "h2", text: "1. Spørg mens oplevelsen er frisk" },
      {
        type: "p",
        html: "Det bedste tidspunkt er lige efter et godt køb eller måltid — mens kunden stadig er i lokalet og har den positive følelse. En dag senere er momentet væk.",
      },
      { type: "h2", text: "2. Fjern al friktion" },
      {
        type: "p",
        html: "Hvert ekstra klik koster anmeldelser. Send kunden <strong>direkte</strong> til anmeldelsesfeltet — ikke til din forside. En QR-kode eller et NFC-tap, der åbner Google-anmeldelsen med det samme, gør det til en 10-sekunders opgave.",
      },
      { type: "h2", text: "3. Gør det synligt ved kassen" },
      {
        type: "p",
        html: "En lille skiltevenlig stander ved kassen eller på bordet minder kunden om at anmelde — uden at personalet skal spørge hver gang. Det er præcis dét, en <a href=\"/produkter\">anmeldelsesstander</a> er lavet til.",
      },
      { type: "h2", text: "4. Fang kritik privat først" },
      {
        type: "p",
        html: "Utilfredse kunder skal helst fanges internt, før de skriver en offentlig 1-stjerne. Et smart flow sender glade kunder videre til Google, mens kritik lander privat hos dig, så du kan rette op. Læs mere i vores guide om <a href=\"/blog/google-review-stander-guide\">Google review-standere</a>.",
      },
      { type: "h2", text: "5. Køb aldrig anmeldelser" },
      {
        type: "p",
        html: "Det er fristende, men falske anmeldelser er i strid med Googles retningslinjer og kan koste dig hele din profil. Byg ægte anmeldelser fra rigtige kunder — det holder i længden.",
      },
      { type: "h2", text: "Den nemmeste metode samlet" },
      {
        type: "p",
        html: "Vil du kombinere det hele — rigtigt tidspunkt, nul friktion, synlighed ved kassen og privat feedback — så er en fysisk anmeldelsesstander med QR og NFC den enkleste vej. Kunden scanner eller tapper, giver sin vurdering på sekunder, og du får flere anmeldelser uden at løfte en finger.",
      },
      {
        type: "cta",
        text: "Se hvordan LoyalBox-standeren giver dig flere Google-anmeldelser automatisk.",
        href: "/produkter",
        label: "Se produkterne",
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
          "<strong>Privat feedback</strong>, så kritik fanges internt før den bliver offentlig.",
          "<strong>Eget design/logo</strong>, så standeren matcher din forretning.",
          "<strong>Statistik</strong>, så du kan se scanninger og effekt.",
        ],
      },
      { type: "h2", text: "Hvad koster en review-stander?" },
      {
        type: "p",
        html: "Der findes to modeller: en <strong>engangspris</strong> for selve standeren, og et <strong>abonnement</strong>, hvis du vil have dashboard, statistik og dynamiske links oveni. Hos LoyalBox starter en stander ved en enkel engangspris, og du kan opgradere til abonnement, når du vil have fuld indsigt. Se de tre niveauer på <a href=\"/produkter\">produktsiden</a>.",
      },
      {
        type: "p",
        html: "Vil du selv lave en gratis QR-kode først for at teste? Så læs vores <a href=\"/blog/qr-kode-til-google-anmeldelser\">guide til QR-kode til Google-anmeldelser</a> — og se hvor grænserne går.",
      },
      {
        type: "cta",
        text: "Klar til flere anmeldelser? Se LoyalBox-standerne.",
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
