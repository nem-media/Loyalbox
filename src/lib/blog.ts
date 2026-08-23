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
  /** Nummereret liste. Til trin, der SKAL tages i rækkefølge — ikke til opremsning. */
  | { type: "ol"; items: string[] }
  /**
   * Sammenligningstabel. Findes, fordi Google trækker tabeller ud som uddrag
   * i søgeresultatet, og fordi en sammenligning skrevet som brødtekst tvinger
   * læseren til at holde begge kolonner i hovedet på én gang.
   */
  | { type: "table"; head: string[]; rows: string[][] }
  /** Fremhævet bemærkning — til det, der koster penge eller er ulovligt at overse. */
  | { type: "note"; title: string; html: string }
  /**
   * Ofte stillede spørgsmål.
   *
   * Bliver TIL `FAQPage`-strukturdata på artiklen, så spørgsmålene kan folde
   * sig ud direkte i søgeresultatet. Det er den enkeltstående ændring, der
   * giver mest synlighed pr. arbejdstime — men den koster troværdighed, hvis
   * spørgsmålene er opdigtede. Skriv kun dem, folk faktisk stiller.
   */
  | { type: "faq"; items: { q: string; a: string }[] }
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
  /**
   * Sidst væsentligt opdateret (ISO).
   *
   * Bliver til `dateModified` i strukturdata. Google vejer friskhed på emner
   * som det her, og før stod `dateModified` lig udgivelsesdatoen — altså
   * sagde artiklen "aldrig rørt", uanset hvor meget den var rettet. Sæt den
   * KUN, når indholdet reelt er ændret; en dato, der flyttes uden at teksten
   * gør, er præcis den slags signal, Google straffer.
   */
  updated?: string;
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
  /**
   * Beslægtede artikler (slugs), vist nederst.
   *
   * Sat i hånden og ikke udledt af emneord: den interne linkstruktur er en
   * redaktionel beslutning om, hvilken artikel der skal have styrken videre,
   * og et "beslægtet"-modul, der gætter, sender lige så gerne læseren hen
   * på noget, der ikke besvarer det, de kom efter.
   */
  related?: string[];
  body: BlogBlock[];
}

/**
 * Ankernavn til en overskrift.
 *
 * Giver hver `h2` et `id`, så indholdsfortegnelsen kan hoppe ned til den —
 * og så Google kan bruge afsnittet som direkte svar ("spring til") i
 * søgeresultatet. Uden `id` findes den mulighed slet ikke.
 */
export function overskriftId(tekst: string): string {
  return tekst
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const POSTS: BlogPost[] = [
  {
    slug: "flere-anmeldelser-restaurant",
    title: "Flere anmeldelser til din restaurant: timingen, gruppen og svaret",
    metaTitle:
      "Flere anmeldelser til restauranten — hvornår du spørger og hvordan",
    description:
      "En restaurant får flere kritiske anmeldelser end de fleste brancher, og de ældes hurtigere. Her er det rigtige øjeblik at spørge, gruppen du overser, og hvordan du svarer.",
    keyword: "flere anmeldelser restaurant",
    date: "2026-08-23",
    readingMinutes: 8,
    excerpt:
      "Fire gæster spiste, én betalte — og du bad kun om én anmeldelse. Her er de tre, du lod ligge på bordet, og hvorfor en restaurants anmeldelser forældes hurtigere end andres.",
    image: "/blog/anmeldelser-restaurant.svg",
    imageAlt:
      "Regningsmappe på et restaurantbord med et lille kort med QR-kode, ved siden af to vinglas og en telefon med stjernebedømmelse",
    related: [
      "saadan-faar-du-flere-google-anmeldelser",
      "stempelkort-til-cafe",
    ],
    body: [
      {
        type: "p",
        html: "Ingen anden branche bliver valgt så hårdt på anmeldelser som restauranter. Folk står på gaden med telefonen og vælger mellem to steder, de kan se herfra — og stjernerne afgør det på fem sekunder.",
      },
      {
        type: "p",
        html: "Samtidig er restauranten den branche, der har sværest ved at holde et pænt gennemsnit. Det er ikke fordi maden er dårligere end andre branchers produkter. Det er, fordi oplevelsen består af så mange dele.",
      },

      { type: "h2", text: "Derfor får restauranter mere kritik end andre" },
      {
        type: "p",
        html: "Et besøg hos frisøren er én ting, der går godt eller skidt. Et restaurantbesøg er <strong>otte</strong>: bordbestillingen, modtagelsen, ventetiden på menukortet, drikkevarerne, maden, tempoet, støjniveauet og regningen.",
      },
      {
        type: "p",
        html: "Går syv af dem perfekt og én galt, skriver gæsten om den ene. Det er ikke urimeligt — det er bare matematik. Og det betyder, at du ikke kan undgå kritiske anmeldelser ved at være god nok. Du kan kun sørge for, at der er nok almindelige omkring dem.",
      },
      {
        type: "note",
        title: "Mængde er forsvar",
        html: "Får du to anmeldelser om måneden, flytter en enkelt etter dit gennemsnit synligt. Får du tredive, gør den ingenting. Det er den vigtigste grund til at gøre indsamlingen til en rutine frem for noget, man tager fat på, når gennemsnittet er faldet.",
      },

      {
        type: "h2",
        text: "Gruppen ved bordet: tre anmeldelser du ikke beder om",
      },
      {
        type: "p",
        html: "Her er det, der adskiller restauranten fra næsten alle andre brancher: <strong>fire mennesker spiste, men kun én betalte</strong>.",
      },
      {
        type: "p",
        html: "Spørger du kun ved kassen eller i betalingsøjeblikket, beder du om én anmeldelse ud af fire mulige. De tre andre havde nøjagtig samme oplevelse, har nøjagtig samme telefon i lommen — og bliver aldrig spurgt.",
      },
      {
        type: "p",
        html: "Løsningen er, at opfordringen skal ligge <strong>på bordet</strong> og ikke kun ved betalingen. Et lille kort i regningsmappen eller en holder på bordet ses af alle, der sidder der, ikke kun af den, der har kortet fremme.",
      },
      {
        type: "table",
        head: ["Placering", "Hvem ser den", "Bedst til"],
        rows: [
          [
            "<strong>I regningsmappen</strong>",
            "Alle ved bordet, mens regningen går rundt",
            "Det stærkeste enkeltsted — timingen og publikum passer",
          ],
          [
            "<strong>Holder på bordet</strong>",
            "Alle, hele måltidet igennem",
            "Steder uden regningsmappe; risikerer at blive tapet væk",
          ],
          [
            "<strong>Ved kassen</strong>",
            "Kun den, der betaler",
            "Take-away og barer, hvor der ikke sidder en gruppe",
          ],
          [
            "<strong>På kvitteringen</strong>",
            "Kun betaleren, og først bagefter",
            "Bedre end ingenting; svageste timing",
          ],
        ],
      },

      { type: "h2", text: "Det rigtige øjeblik" },
      {
        type: "p",
        html: "Det bedste tidspunkt er, mens gæsterne <strong>stadig sidder ned</strong> og har spist færdigt — altså i den rolige periode mellem sidste tallerken og overtøjet. Der er de mætte, tilfredse og har hænderne fri.",
      },
      {
        type: "p",
        html: "Spørg ikke, mens de spiser: du afbryder præcis dét, de kom efter. Og spørg ikke, når de rejser sig — så er jakken på, og telefonen er i lommen.",
      },
      {
        type: "p",
        html: "Personalet skal ikke skulle huske en tale. Det eneste, der skal siges, når regningen leveres, er én sætning om, at man må scanne, hvis man vil sige noget om aftenen. Resten gør kortet.",
      },

      { type: "h2", text: "En restaurants anmeldelser ældes hurtigere" },
      {
        type: "p",
        html: "Det her overses næsten altid. En anmeldelse af en frisør fra 2023 beskriver sandsynligvis stadig den samme frisør. En anmeldelse af en restaurant fra 2023 beskriver <strong>et andet køkken</strong>: menuen er skiftet, kokken er måske skiftet, og halvdelen af personalet er nye.",
      },
      {
        type: "p",
        html: "Både Google og forbrugerne vægter nye anmeldelser højere end gamle. For en restaurant er det ikke bare en algoritme-detalje — det er reelt: de gamle anmeldelser beskriver et sted, der ikke findes længere. Skifter du menukort, bør du regne med, at anmeldelserne skal skiftes med.",
      },
      {
        type: "p",
        html: 'Derfor er en jævn strøm vigtigere her end nogen andre steder. <a href="/blog/saadan-faar-du-flere-google-anmeldelser">Metoden er den samme som i andre brancher</a>, men frekvensen betyder mere.',
      },

      { type: "h2", text: "Svaret på den dårlige anmeldelse" },
      {
        type: "p",
        html: "Restaurantsvar er dem, folk læser flittigst — blandt andet fordi de så tit er dårlige. Et defensivt svar om, at gæsten tog fejl af, hvordan en bearnaise skal smage, koster flere gæster end anmeldelsen gjorde.",
      },
      {
        type: "ol",
        items: [
          "<strong>Svar på det konkrete.</strong> Var maden kold, så nævn maden. Et standardsvar om at &quot;vi sætter altid gæsten højest&quot; læses som en skabelon, fordi det er en.",
          "<strong>Fortæl hvad du gør ved det.</strong> &quot;Vi har ændret rækkefølgen i udleveringen&quot; er stærkere end en undskyldning, fordi det viser et køkken, der lytter.",
          "<strong>Diskutér aldrig regningen offentligt.</strong> Uenighed om, hvad der stod på kortet, hører til i en mail. Offentligt taber du, uanset hvem der har ret.",
          "<strong>Svar også på de gode.</strong> To linjer er nok, og det gør profilen levende. En profil, hvor kun de sure får svar, ser ud som en, der brandslukker.",
        ],
      },

      { type: "h2", text: "Genbesøget: stempelkort i en restaurant" },
      {
        type: "p",
        html: "Anmeldelser skaffer nye gæster. Stamgæsten er dén, der betaler huslejen — og her ligner restauranten cafeen, bare i langsommere tempo.",
      },
      {
        type: "p",
        html: "En gæst, der kommer en til to gange om måneden, fylder <strong>otte felter</strong> på et halvt til et helt år. Ti ville være for langt. Belønningen bør være noget, der trækker et <em>nyt</em> besøg med sig: en dessert eller en velkomstdrink koster dig lidt i indkøb og kræver, at gæsten kommer og spiser.",
      },
      {
        type: "note",
        title: "Bland aldrig de to ting sammen",
        html: "Giv aldrig et stempel, en dessert eller en rabat for en anmeldelse. Det er forbudt efter både Googles og Trustpilots regler og efter markedsføringslovens bilag 1 — og konsekvensen rammer restauranten. Du må belønne genbesøg. Bare ikke det, gæsten skriver.",
      },
      {
        type: "faq",
        items: [
          {
            q: "Hvornår skal jeg bede gæsterne om en anmeldelse?",
            a: "Mens de stadig sidder ned og har spist færdigt — i den rolige periode mellem sidste tallerken og overtøjet. Der er de mætte og har hænderne fri. Spørg ikke mens de spiser, og ikke når de rejser sig, hvor jakken er på og telefonen i lommen.",
          },
          {
            q: "Hvor skal QR-koden sidde i en restaurant?",
            a: "I regningsmappen er stærkest, fordi den ses af alle ved bordet, mens regningen går rundt. Sidder opfordringen kun ved kassen, beder du reelt kun om én anmeldelse ud af fire mulige, selvom alle fire havde samme oplevelse.",
          },
          {
            q: "Hvorfor får restauranter flere dårlige anmeldelser end andre?",
            a: "Fordi oplevelsen består af mange dele: bordbestilling, modtagelse, ventetid, drikkevarer, mad, tempo, støj og regning. Går syv godt og én galt, skriver gæsten om den ene. Du kan ikke undgå kritik ved at være god nok — kun sørge for, at der er nok almindelige anmeldelser omkring den.",
          },
          {
            q: "Skal jeg svare på alle anmeldelser?",
            a: "Ja, også de gode — to linjer er nok. En profil, hvor kun de kritiske får svar, ser ud som en, der brandslukker. På de kritiske: svar på det konkrete, fortæl hvad du gør ved det, og diskutér aldrig regningen offentligt.",
          },
          {
            q: "Hvor mange felter skal et stempelkort til en restaurant have?",
            a: "Otte. En gæst, der kommer en til to gange om måneden, er så et halvt til et helt år om at fylde kortet. Ti felter ville være for langt, og så begynder de fleste ikke at samle.",
          },
          {
            q: "Bliver gamle anmeldelser mindre værd?",
            a: "Ja, og hurtigere for en restaurant end for de fleste. En anmeldelse fra for tre år siden beskriver et andet menukort, ofte en anden kok og halvt nyt personale. Både Google og gæsterne vægter friske anmeldelser højere, så skifter du menu, bør anmeldelserne følge med.",
          },
        ],
      },
      {
        type: "cta",
        text: "Gør det nemt for hele bordet at anmelde jer — ikke kun den, der betaler.",
        href: "/reviewstander",
        label: "Se reviewstanderen",
      },
    ],
  },
  {
    slug: "anmeldelser-klinik",
    title:
      "Anmeldelser til klinikker: tavshedspligten, reglerne og det rigtige svar",
    metaTitle:
      "Anmeldelser til klinikker — hvad du må svare, og hvad du ikke må",
    description:
      "Et venligt svar på en anmeldelse kan bekræfte, at personen var patient — og det er fortroligt. Her er tavshedspligten, de særlige markedsføringsregler og hvordan du svarer alligevel.",
    keyword: "anmeldelser klinik",
    date: "2026-08-23",
    readingMinutes: 9,
    excerpt:
      "Klinikker er underlagt regler, ingen andre brancher har: tavshedspligt, særlige markedsføringsregler og helbredsoplysninger. Det ændrer både hvad du må skrive, og hvem der fører tilsyn.",
    image: "/blog/anmeldelser-klinik.svg",
    imageAlt:
      "Behandlerbriks og en journalmappe i en klinik ved siden af en telefon, der viser en anmeldelse med stjerner",
    related: [
      "saadan-faar-du-flere-google-anmeldelser",
      "flere-anmeldelser-frisor",
    ],
    body: [
      {
        type: "p",
        html: "Anmeldelser betyder meget for en klinik. Folk vælger fysioterapeut, kiropraktor eller tandlæge på tillid, og de kan ikke vurdere fagligheden selv — så de læser, hvad andre skriver.",
      },
      {
        type: "p",
        html: "Men klinikken er den eneste af de her brancher, der er underlagt <strong>tre regelsæt, ingen andre har</strong>: tavshedspligt efter sundhedsloven, en selvstændig lov om markedsføring af sundhedsydelser, og GDPR's skærpede regler for helbredsoplysninger.",
      },
      {
        type: "p",
        html: "Det ændrer ikke, at du skal have anmeldelser. Det ændrer, hvad du må skrive — og hvem der fører tilsyn med dig.",
      },

      { type: "h2", text: "Fælden: et venligt svar kan bryde tavshedspligten" },
      {
        type: "p",
        html: "Det her er den vigtigste del af artiklen, og det er en fejl, mange klinikker begår i god tro.",
      },
      {
        type: "p",
        html: "En patient skriver en anmeldelse. Du svarer venligt: <em>&quot;Tak fordi du kom forbi til din behandling — dejligt at høre, at ryggen har det bedre.&quot;</em>",
      },
      {
        type: "p",
        html: "Du har netop <strong>offentligt bekræftet</strong>, at personen er patient hos dig, og hvad de blev behandlet for. Tavshedspligten efter sundhedslovens kapitel 9 dækker ikke kun journalen — den dækker også <strong>selve det forhold, at nogen er patient</strong>.",
      },
      {
        type: "note",
        title: "At de selv har skrevet det, er ikke et samtykke",
        html: "Fordi patienten selv har lagt anmeldelsen op, kan det virke som om oplysningen allerede er offentlig. Men patienten har afgivet oplysningen om <em>sig selv</em>. Du er underlagt tavshedspligt, og den ophæves ikke af, at patienten selv har sagt noget — der skal et samtykke til, og en anmeldelse er ikke et samtykke.",
      },
      {
        type: "p",
        html: "Anmeldelsen indeholder samtidig helbredsoplysninger om personen, og det er en særlig kategori af personoplysninger efter GDPR. Bekræfter eller uddyber du dem, behandler du dem.",
      },

      { type: "h2", text: "Sådan svarer du alligevel" },
      {
        type: "p",
        html: "Du skal svare — et ubesvaret svar ser sløset ud. Du skal bare svare <strong>uden at bekræfte noget som helst</strong> om personen.",
      },
      {
        type: "ol",
        items: [
          "<strong>Skriv generelt, ikke personligt.</strong> &quot;Tak for din tilbagemelding. Vi er glade for, når et forløb hjælper&quot; siger det samme uden at bekræfte, at netop denne person har været her.",
          "<strong>Nævn aldrig behandlingen, diagnosen eller forløbet.</strong> Heller ikke for at rette en misforståelse, og heller ikke hvis anmelderen selv har skrevet det.",
          "<strong>Flyt det ud af tråden.</strong> &quot;Vil du kontakte klinikken direkte, så vi kan tale om det?&quot; er både det rigtige svar fagligt og det eneste sted, du overhovedet må gå i detaljer.",
          "<strong>Brug samme svar til kritik.</strong> Fristelsen til at forklare, at patienten ikke fulgte anvisningerne, er stor. Det er også dét, der gør mest skade — både juridisk og over for de læsere, der overvejer at ringe.",
        ],
      },
      {
        type: "p",
        html: "Kort sagt: et klinikkens svar må ikke kunne læses som en bekræftelse af, at anmelderen er patient. Det lyder stift, men det bliver hurtigt naturligt — og det er langt bedre end alternativet.",
      },

      { type: "h2", text: "Markedsføring af sundhedsydelser er sin egen lov" },
      {
        type: "p",
        html: "De fleste virksomheder skal forholde sig til markedsføringsloven. Klinikker skal forholde sig til <strong>lov om markedsføring af sundhedsydelser</strong> oveni — og tilsynet ligger hos <strong>Styrelsen for Patientsikkerhed</strong>, ikke hos Forbrugerombudsmanden.",
      },
      {
        type: "p",
        html: "Hovedreglen er <strong>saglighed</strong>: markedsføring af sundhedsydelser må ikke være så sælgende som markedsføring af andre varer. Konkret betyder det blandt andet:",
      },
      {
        type: "ul",
        items: [
          "Oplysninger skal være <strong>korrekte, fyldestgørende og dokumenterbare</strong>. Kan du ikke dokumentere en påstand om virkning, må den ikke stå der.",
          "Ingen <strong>overdrevne udsagn</strong> om helbredelse, og ingen skræmmende beskrivelser af, hvad der sker, hvis man ikke bliver behandlet.",
          "Reglerne rækker ind på <strong>sociale medier</strong>, hvor der er skærpede begrænsninger for, hvordan sundhedsydelser må markedsføres.",
        ],
      },
      {
        type: "note",
        title: "Læs vejledningen, før du laver kampagner",
        html: "Styrelsen for Patientsikkerhed har en vejledning om markedsføring af sundhedsydelser, og reglerne er strammere, end de fleste regner med — også for det, der bare virker som en glad opdatering på Facebook. Det er billigere at bruge en time på den end at få en tilsynssag.",
      },

      { type: "h2", text: "Anmeldelser du bruger i din egen markedsføring" },
      {
        type: "p",
        html: "Her mødes de to regelsæt, og det fanger mange.",
      },
      {
        type: "p",
        html: "Tager du en rosende patientanmeldelse og sætter den på din forside, er det ikke længere bare en anmeldelse — det er <strong>markedsføring af en sundhedsydelse</strong>. Så gælder saglighedskravet: står der i citatet, at behandlingen kurerede noget, skal den påstand kunne dokumenteres.",
      },
      {
        type: "p",
        html: "Oveni gælder markedsføringslovens bilag 1, nr. 23c, som forbyder at give et fordrejet billede af forbrugeranmeldelser. Viser du kun de bedste uden at oplyse det, er det en overtrædelse — uanset branche.",
      },
      {
        type: "p",
        html: "Det enkleste og sikreste er at <strong>henvise til profilen frem for at citere</strong>: link til dine anmeldelser i stedet for at klippe de pæneste ud. Så viser du et retvisende billede, og du kommer ikke til at markedsføre en behandlingspåstand, du skal kunne dokumentere.",
      },

      { type: "h2", text: "Sådan spørger du — og hvad du ikke må" },
      {
        type: "p",
        html: "Selve indsamlingen følger de almindelige regler, og de er de samme som for alle andre:",
      },
      {
        type: "ul",
        items: [
          "<strong>Spørg alle ens.</strong> Du må ikke vælge, hvem der bliver spurgt, ud fra hvordan forløbet gik.",
          "<strong>Beløn aldrig.</strong> Ingen rabat på næste behandling, ingen gratis produkter, ingen lodtrækning.",
          "<strong>Bed ikke om positive anmeldelser.</strong> &quot;Er du glad, så giv os fem stjerner&quot; er i strid med reglerne.",
        ],
      },
      {
        type: "p",
        html: "Det praktiske råd er det samme som i de andre brancher: gør det synligt ved udgangen eller ved betalingen, og gør vejen ét tap lang. Forskellen er, at <strong>opfordringen skal være neutral og lavmælt</strong> — en klinik, der beder om stjerner i store bogstaver, får et sagligheds-problem oveni.",
      },
      {
        type: "note",
        title: "Vær varsom med hvem der spørger",
        html: "Behandleren bør ikke selv bede patienten om en anmeldelse umiddelbart efter en behandling. Der er en ubalance i forholdet — patienten kan føle, at det er svært at sige nej til den, der lige har behandlet dem. Et skilt ved udgangen løser det: opfordringen kommer fra klinikken, ikke fra behandleren i rummet.",
      },

      { type: "h2", text: "Genbesøg og forløb" },
      {
        type: "p",
        html: "Klinikken kommer sjældnest af alle fire brancher: typisk hver anden til tredje måned. Det betyder <strong>fem felter</strong> på et stempelkort — mere ville tage over et år, og så begynder ingen.",
      },
      {
        type: "p",
        html: "Men vær opmærksom på noget vigtigere: et loyalitetsprogram må aldrig kunne læses som en tilskyndelse til <em>flere behandlinger, end der er brug for</em>. Det er dårlig faglighed, og det kolliderer med saglighedskravet. En belønning, der er knyttet til antallet af behandlinger, er problematisk i en branche, hvor det ikke er patienten, der afgør behovet.",
      },
      {
        type: "p",
        html: "Vil du alligevel have et kort, så lad belønningen være noget, der ikke er en behandling — et produkt, en træningsseance eller en rabat på noget frivilligt. Så belønner du troskab uden at belønne forbrug af sundhedsydelser.",
      },
      {
        type: "faq",
        items: [
          {
            q: "Må jeg svare på en anmeldelse fra en patient?",
            a: "Ja, men svaret må ikke bekræfte, at personen er eller har været patient hos dig, og det må ikke nævne behandling, diagnose eller forløb. Tavshedspligten efter sundhedslovens kapitel 9 dækker også selve det forhold, at nogen er patient. Svar generelt, og bed dem kontakte klinikken direkte, hvis der skal tales om noget konkret.",
          },
          {
            q: "Patienten har jo selv skrevet det offentligt — gælder tavshedspligten stadig?",
            a: "Ja. Patienten har afgivet oplysningen om sig selv, men du er fortsat underlagt tavshedspligt. Den ophæves ikke af, at patienten selv har sagt noget offentligt — der skal et samtykke til, og en anmeldelse er ikke et samtykke.",
          },
          {
            q: "Må jeg vise patientanmeldelser på min hjemmeside?",
            a: "Så bliver de til markedsføring af en sundhedsydelse, og saglighedskravet gælder: påstande om virkning skal kunne dokumenteres. Samtidig forbyder markedsføringslovens bilag 1, nr. 23c, at man giver et fordrejet billede ved kun at vise de bedste. Det sikreste er at linke til profilen frem for at citere udvalgte anmeldelser.",
          },
          {
            q: "Hvem fører tilsyn med en kliniks markedsføring?",
            a: "Styrelsen for Patientsikkerhed fører tilsyn med markedsføring af sundhedsydelser. Det er altså ikke kun Forbrugerombudsmanden, du skal forholde dig til, og reglerne er strammere end for andre brancher — markedsføringen skal være saglig og må ikke være så sælgende som for almindelige varer.",
          },
          {
            q: "Må jeg give rabat på næste behandling for en anmeldelse?",
            a: "Nej. Belønninger knyttet til anmeldelser er forbudt efter både Googles og Trustpilots regler og efter markedsføringslovens bilag 1. I en klinik er det ekstra problematisk, fordi en rabat på en behandling også kan læses som en tilskyndelse til mere behandling, end der er brug for.",
          },
          {
            q: "Giver et stempelkort mening i en klinik?",
            a: "Det kan det, men med forbehold. Patienterne kommer sjældent, så fem felter er typisk grænsen. Vigtigere er det, at belønningen ikke må tilskynde til flere behandlinger end nødvendigt — lad den derfor være noget andet end en behandling, for eksempel et produkt eller noget frivilligt.",
          },
        ],
      },
      {
        type: "cta",
        text: "Gør det nemt og lavmælt for patienterne at anmelde klinikken.",
        href: "/reviewstander",
        label: "Se reviewstanderen",
      },
    ],
  },
  {
    slug: "stempelkort-til-cafe",
    title: "Stempelkort til café: sådan får du gæsterne til at komme oftere",
    metaTitle: "Stempelkort til café — antal, belønning og regnestykket",
    description:
      "Caféen er den branche, stempelkort passer allerbedst til. Her er det rigtige antal felter, hvad belønningen må koste, og den fælde i morgenrykket, der koster flest tilmeldinger.",
    keyword: "stempelkort til café",
    date: "2026-08-23",
    readingMinutes: 8,
    excerpt:
      "Hyppige, billige køb er præcis det, et stempelkort er bygget til. Men de fleste caféer taber tilmeldingerne i det travleste kvarter af dagen — her er hvorfor, og hvad du gør ved det.",
    image: "/blog/stempelkort-cafe.svg",
    imageAlt:
      "Kaffekop på en cafédisk ved siden af et lille skilt med QR-kode og en telefon, der viser et stempelkort med ti felter",
    related: [
      "hvor-mange-stempler-stempelkort",
      "stempelkort-app-eller-papkort",
    ],
    body: [
      {
        type: "p",
        html: "Hvis der findes én branche, hvor et stempelkort er oplagt, er det caféen. Køb er små, de gentages ofte, og de er allerede en vane — kunden skulle alligevel have kaffe. Kortet skal bare gøre, at vanen lander hos dig i stedet for hos naboen.",
      },
      {
        type: "p",
        html: "Netop derfor er det ærgerligt, hvor mange caféer får det halvt til at virke. Ikke fordi mekanikken er forkert, men fordi tilmeldingen skal ske i det travleste kvarter af dagen.",
      },

      {
        type: "h2",
        text: "Hvorfor caféen er den bedste branche til et stempelkort",
      },
      {
        type: "p",
        html: "Et stempelkort virker, når tre ting er opfyldt: kunden kommer <strong>ofte</strong>, hvert køb er <strong>lille</strong>, og valget er <strong>vanemæssigt</strong>. En café rammer alle tre.",
      },
      {
        type: "p",
        html: "Sammenlign med en klinik, hvor kunden kommer hver tredje måned til en dyr behandling. Her ville ti felter tage over to år, og belønningen skulle være så stor, at den æder fortjenesten. Cafeens gæst når ti besøg på en måned.",
      },
      {
        type: "p",
        html: "Det betyder også, at du har råd til at være generøs på antallet, hvor andre brancher må være forsigtige.",
      },

      { type: "h2", text: "Det rigtige antal felter" },
      {
        type: "p",
        html: "<strong>Ti er standarden for en café</strong>, og det er ikke tilfældigt. Regn baglæns fra, hvor lang tid der må gå: en gæst, der kommer to-tre gange om ugen, fylder ti felter på cirka en måned. Det er kort nok til at føles opnåeligt og langt nok til, at belønningen ikke gives væk hver uge.",
      },
      {
        type: "p",
        html: 'Kommer dine gæster sjældnere — en café i et kontorområde med kun hverdagsgæster, for eksempel — så sæt det ned til otte. <a href="/blog/hvor-mange-stempler-stempelkort">Regnemetoden bag tallet</a> er den samme uanset branche.',
      },
      {
        type: "note",
        title: "Tjek det efter et kvartal",
        html: "Kig på, hvor mange af de tilmeldte der faktisk <em>når</em> belønningen. Er det under en femtedel, er kortet for langt, og du har lovet en rabat, du aldrig kommer til at betale — hvilket lyder billigt, men er den dyreste variant: gæsten opgav undervejs og fik en dårlig oplevelse ud af dit loyalitetsprogram.",
      },

      { type: "h2", text: "Hvad belønningen skal være" },
      {
        type: "p",
        html: "Den vigtigste regel: belønningen koster dig din <strong>indkøbspris</strong>, ikke det, der står på skiltet. En gratis kaffe koster bønner, mælk og en kop — kald det seks kroner. Ikke de fyrre, gæsten ellers ville have betalt.",
      },
      {
        type: "p",
        html: "Det er derfor et gratis produkt næsten altid er billigere for dig end en procentrabat på hele regningen. Og det er derfor, den bedste belønning som regel er <strong>mere af dét, gæsten allerede kommer efter</strong>.",
      },
      {
        type: "table",
        head: ["Belønning", "Koster dig", "Virker fordi"],
        rows: [
          [
            "<strong>Gratis kaffe</strong>",
            "Lavt — råvarepris",
            "Er præcis det, gæsten kom efter i forvejen",
          ],
          [
            "<strong>Gratis bagværk</strong>",
            "Middel",
            "Føles som en større gave end den koster; kan sælge en kaffe med",
          ],
          [
            "<strong>20 % på hele regningen</strong>",
            "Højt — rammer din avance direkte",
            "Sjældent bedre end de to ovenfor, og svært at regne på",
          ],
          [
            "<strong>Gratis opgradering</strong>",
            "Meget lavt",
            "Sirup eller havremælk koster ører og opleves som noget værd",
          ],
        ],
      },

      { type: "h2", text: "Regnestykket for en café" },
      {
        type: "p",
        html: "Tag en café med omkring 40 gæster om dagen og en kaffe til 45 kr. med en råvarepris på 8 kr.:",
      },
      {
        type: "ol",
        items: [
          "<strong>Dækningsbidrag pr. besøg:</strong> 45 − 8 = <strong>37 kr.</strong>",
          "<strong>Ti besøg giver dig:</strong> 370 kr. i dækningsbidrag.",
          "<strong>Belønningen koster dig:</strong> cirka 6 kr. i råvarer.",
          "<strong>Konklusion:</strong> kortet skal blot flytte ét enkelt ekstra besøg pr. gæst, før det er tjent hjem mange gange. Alt derover er gevinst.",
        ],
      },
      {
        type: "p",
        html: "Det er derfor stempelkort næsten altid regner hjem i en café — og hvorfor du ikke behøver at være nærig med belønningen for at det hænger sammen.",
      },

      { type: "h2", text: "Fælden: morgenrykket" },
      {
        type: "p",
        html: "Her er det, der reelt afgør, om det lykkes. Din travleste time er også den, hvor flest nye gæster er inde — og det er præcis dér, personalet <strong>ikke</strong> har tid til at forklare et loyalitetsprogram.",
      },
      {
        type: "p",
        html: "Beder du baristaen om at fortælle om kortet ved hver ekspedition, sker to ting: det bliver droppet, når køen er lang, og gæsterne bagi bliver utålmodige. Programmet bliver dermed noget, kun de stille timer bidrager til.",
      },
      {
        type: "p",
        html: "Løsningen er, at <strong>skiltet gør arbejdet</strong>. Et lille skilt ved betalingen, som gæsten selv scanner, mens kortet trækkes. Ingen samtale, ingen forsinkelse, ingen der skal huske noget. Personalet skal kun kunne sige én sætning: &quot;scan den, hvis du vil have stempler&quot;.",
      },
      {
        type: "note",
        title: "Placeringen betyder mere end du tror",
        html: "Skiltet skal stå dér, hvor gæsten <em>står stille med telefonen i hånden</em> — altså ved betalingen. Et skilt ved indgangen ses, mens folk går forbi. Et skilt på bordene ses, når betalingen er overstået og gæsten er i gang med noget andet. Ved terminalen er timingen rigtig hver eneste gang.",
      },

      { type: "h2", text: "Anmeldelser: caféens anden løftestang" },
      {
        type: "p",
        html: "Stempelkortet får dem, der allerede har fundet dig, til at komme igen. Anmeldelser afgør, om nye gæster overhovedet finder dig — særligt i en by, hvor folk søger &quot;café i nærheden&quot; på telefonen.",
      },
      {
        type: "p",
        html: 'De to ting kan sidde på det samme skilt, men de skal holdes adskilt i det, du beder om. <a href="/blog/saadan-faar-du-flere-google-anmeldelser">Metoden til flere Google-anmeldelser</a> er den samme som i alle andre brancher: spørg alle, spørg mens oplevelsen er frisk, og fjern klikkene.',
      },
      {
        type: "note",
        title: "Bland dem aldrig sammen",
        html: "Giv aldrig et stempel for en anmeldelse. Det er forbudt efter både Googles og Trustpilots regler og efter markedsføringslovens bilag 1 — og konsekvensen rammer caféen, ikke leverandøren. Du må belønne genbesøg. Bare ikke det, gæsten skriver.",
      },
      {
        type: "faq",
        items: [
          {
            q: "Hvor mange stempler skal et stempelkort til en café have?",
            a: "Ti er standarden og passer til en gæst, der kommer to-tre gange om ugen — så er kortet fyldt på cirka en måned. Har du primært hverdagsgæster i et kontorområde, er otte ofte mere realistisk.",
          },
          {
            q: "Hvad koster en gratis kaffe mig som belønning?",
            a: "Din indkøbspris, ikke din salgspris. Bønner, mælk og kop løber typisk op i omkring seks kroner. Det er derfor et gratis produkt næsten altid er billigere for dig end en procentrabat på hele regningen.",
          },
          {
            q: "Skal gæsterne hente en app?",
            a: "Nej, og de fleste vil heller ikke. Et digitalt stempelkort kan ligge i gæstens browser: de scanner en QR-kode ved betalingen, og kortet er der. Ingen download, ingen konto — hvilket er afgørende, når der står folk i kø bagved.",
          },
          {
            q: "Hvordan får jeg gæsterne tilmeldt, når der er travlt?",
            a: "Ved at lade skiltet gøre arbejdet. Et lille skilt ved betalingsterminalen, som gæsten selv scanner, mens kortet trækkes, koster ingen tid i køen. Beder du personalet om at forklare programmet ved hver ekspedition, bliver det droppet netop i myldretiden.",
          },
          {
            q: "Kan jeg ændre antallet af felter senere?",
            a: "Med et digitalt kort ja — du kan sætte programmet på pause og starte et nyt med andre tal. Med trykte papkort står du med et oplag, hvor der er trykt et antal, du ikke længere vil have.",
          },
          {
            q: "Må jeg give et ekstra stempel, hvis gæsten anmelder caféen?",
            a: "Nej. Både Google og Trustpilot forbyder belønninger knyttet til anmeldelser, og i Danmark er det samtidig i strid med markedsføringslovens bilag 1. Du må gerne give stempler for køb og genbesøg — bare ikke for det, gæsten skriver om jer.",
          },
        ],
      },
      {
        type: "cta",
        text: "Vil du se, hvordan et stempelkort uden app fungerer i en café?",
        href: "/stempelkort",
        label: "Se stempelkortet",
      },
    ],
  },
  {
    slug: "flere-anmeldelser-frisor",
    title: "Flere anmeldelser som frisør: sådan bliver du valgt af nye kunder",
    metaTitle:
      "Flere anmeldelser til frisører — hvornår du spørger, og hvad du må",
    description:
      "En ny kunde vælger frisør på anmeldelser, fordi de ikke kan prøve sig frem. Her er det rigtige øjeblik at spørge, hvad du aldrig må gøre, og hvordan du svarer på kritik af en klipning.",
    keyword: "flere anmeldelser frisør",
    date: "2026-08-23",
    readingMinutes: 8,
    excerpt:
      "For en frisør er anmeldelser ikke pynt — de er hele grundlaget for at blive valgt første gang. Her er øjeblikket, reglerne og svaret på den dårlige anmeldelse.",
    image: "/blog/anmeldelser-frisor.svg",
    imageAlt:
      "Frisørstol foran et spejl med en saks og en kam, ved siden af en telefon der viser en anmeldelse med stjerner",
    related: [
      "saadan-faar-du-flere-google-anmeldelser",
      "flere-trustpilot-anmeldelser",
    ],
    body: [
      {
        type: "p",
        html: "At vælge ny frisør er et af de køb, folk er mest nervøse for. Man kan ikke prøve sig frem, man kan ikke fortryde, og resultatet sidder på hovedet i seks uger.",
      },
      {
        type: "p",
        html: "Derfor gør de fleste det samme: de søger, og de læser anmeldelser. For en salon er anmeldelser derfor ikke markedsføring ved siden af det egentlige — det <strong>er</strong> det, der afgør, om telefonen ringer.",
      },

      { type: "h2", text: "Hvorfor anmeldelser vejer tungere for en frisør" },
      {
        type: "p",
        html: "Tre ting adskiller salonen fra en café eller en butik:",
      },
      {
        type: "ul",
        items: [
          "<strong>Kunden kan ikke prøve billigt først.</strong> En dårlig kop kaffe koster fyrre kroner. En dårlig klipning koster flere hundrede og skal vokse ud.",
          "<strong>Valget er personligt.</strong> Man vælger ikke en salon, man vælger en person med en saks. Anmeldelser, der nævner navne, vejer særligt tungt.",
          "<strong>Skiftet er sjældent.</strong> Har kunden først fundet en frisør, de er glade for, bliver de i årevis. Den nye kunde er derfor meget mere værd end ét besøg.",
        ],
      },
      {
        type: "p",
        html: "Sidste punkt er hele forretningsargumentet: en anmeldelse, der giver dig én ny fast kunde, betaler sig hjem mange gange over.",
      },

      { type: "h2", text: "Det rigtige øjeblik at spørge" },
      {
        type: "p",
        html: "Timingen er mere kritisk i en salon end de fleste steder, og de fleste rammer den forkert.",
      },
      {
        type: "p",
        html: "<strong>Spørg ikke i stolen.</strong> Kunden sidder med våd nakke og har ikke set resultatet endnu — og de kan ikke sige nej uden at det bliver akavet, fordi du står bag dem med en saks. Det er hverken behageligt eller et ærligt spørgsmål.",
      },
      {
        type: "p",
        html: "<strong>Spørg ikke en uge senere i en mail.</strong> Da er begejstringen væk, og mailen bliver ikke åbnet.",
      },
      {
        type: "p",
        html: "Det rigtige øjeblik er <strong>ved betalingen</strong> — efter spejlet, efter kunden har set resultatet og sagt noget om det, mens frakken stadig hænger på krogen. Der står de stille med telefonen i hånden, og oplevelsen er lige sket.",
      },
      {
        type: "note",
        title: "Lad skiltet spørge i stedet for dig",
        html: "De fleste frisører har det ubehageligt med selv at bede om en anmeldelse — det føles som at bede om ros for noget, man lige har lavet. Et lille skilt ved betalingen fjerner det: kunden ser det selv, og du behøver ikke sige andet end &quot;den må du meget gerne scanne&quot;. Det bliver også gjort ensartet, hver gang, i stedet for kun når du har overskuddet.",
      },

      { type: "h2", text: "Det du aldrig må gøre" },
      {
        type: "p",
        html: "To udbredte råd er direkte forbudte, og de kan koste dig hele profilen:",
      },
      {
        type: "ul",
        items: [
          "<strong>Beløn aldrig en anmeldelse.</strong> Rabat på næste klip, gratis produkter eller lodder i en konkurrence er alle forbudt, når de knyttes til det at skrive. Du må gerne belønne et genbesøg — bare ikke det, kunden skriver.",
          "<strong>Spørg ikke kun de glade.</strong> At sende tilfredse kunder til Google og utilfredse til en kontaktformular er udtrykkeligt forbudt hos både Google og Trustpilot — og i Danmark er det samtidig en overtrædelse af markedsføringslovens bilag 1, nr. 23c.",
        ],
      },
      {
        type: "p",
        html: 'Det rigtige alternativ er ikke at sortere, men at <strong>tilbyde begge veje samtidig</strong> og lade kunden vælge selv. <a href="/blog/flere-trustpilot-anmeldelser">Reglerne er gennemgået i detaljer her</a>.',
      },

      { type: "h2", text: "Sådan svarer du på kritik af en klipning" },
      {
        type: "p",
        html: "Den dårlige anmeldelse er uundgåelig i en salon, fordi resultatet er en smagssag, og fordi kunden nogle gange bad om noget andet, end de troede. Svaret er det, alle kommende kunder læser.",
      },
      {
        type: "p",
        html: "Tre regler, og den sidste er den vigtigste:",
      },
      {
        type: "ol",
        items: [
          "<strong>Anerkend oplevelsen, ikke skylden.</strong> &quot;Det er ærgerligt, at du ikke blev glad for resultatet&quot; er både ærligt og imødekommende, uden at du erklærer dig enig i kritikken.",
          "<strong>Tilbyd at rette op.</strong> En invitation til at komme forbi og få det justeret siger mere om salonen end nogen beskrivelse af, hvad der egentlig skete.",
          "<strong>Skriv aldrig detaljer om kunden.</strong> Ikke hvad de bad om, ikke hvad deres hår kunne holde til, ikke hvor mange gange de har fortrudt før. Det er personoplysninger, det er ulovligt at dele offentligt, og det får dig til at se ud som den, man ikke skal gå til.",
        ],
      },
      {
        type: "p",
        html: "Og husk: den bedste beskyttelse mod en enkelt dårlig anmeldelse er en jævn strøm af almindelige. Får du to om året, fylder én etter alt.",
      },

      { type: "h2", text: "Genbesøget: den anden halvdel" },
      {
        type: "p",
        html: "Anmeldelser skaffer den nye kunde. Genbesøget er dét, der gør dem til en fast indtægt — og her er salonen anderledes end de fleste brancher.",
      },
      {
        type: "p",
        html: "Den stærkeste loyalitetsmekanisme i en frisørsalon er <strong>at booke næste tid, før kunden går</strong>. Ingen rabat slår en aftale i kalenderen. Et stempelkort erstatter ikke det — men det virker godt oveni, fordi det giver en grund til at booke hos <em>dig</em> frem for et andet sted, når kunden alligevel skal.",
      },
      {
        type: "table",
        head: ["", "Frisør", "Café til sammenligning"],
        rows: [
          [
            "<strong>Hvor tit kommer kunden?</strong>",
            "Hver 6.-8. uge",
            "2-3 gange om ugen",
          ],
          ["<strong>Antal felter</strong>", "5-6", "10"],
          [
            "<strong>Tid til belønning</strong>",
            "Cirka et år",
            "Cirka en måned",
          ],
          [
            "<strong>Belønning der passer</strong>",
            "20 % på et klip eller et produkt med hjem",
            "Gratis kaffe",
          ],
        ],
      },
      {
        type: "p",
        html: 'Læg mærke til, hvorfor frisøren skal have færre felter: seks besøg er allerede næsten et år. Ti ville være halvandet, og så begynder ingen. <a href="/blog/hvor-mange-stempler-stempelkort">Regnemetoden bag tallet står her</a>.',
      },
      {
        type: "faq",
        items: [
          {
            q: "Hvornår skal jeg spørge kunden om en anmeldelse?",
            a: "Ved betalingen — efter kunden har set resultatet i spejlet og sagt noget om det. Spørg ikke mens de sidder i stolen: de har ikke set resultatet endnu og kan ikke sige nej uden at det bliver akavet. Og vent ikke til en mail en uge senere; da er begejstringen væk.",
          },
          {
            q: "Må jeg give rabat på næste klip for en anmeldelse?",
            a: "Nej. Både Google og Trustpilot forbyder belønninger knyttet til anmeldelser, og i Danmark er det samtidig i strid med markedsføringslovens bilag 1. Du må gerne belønne et genbesøg — belønningen må bare ikke være knyttet til, at kunden skriver.",
          },
          {
            q: "Hvordan svarer jeg på en anmeldelse om en dårlig klipning?",
            a: "Anerkend oplevelsen uden at erklære dig enig i kritikken, tilbyd at rette op, og skriv aldrig detaljer om kunden eller deres hår i et offentligt svar. Svaret læses af alle kommende kunder — de leder ikke efter, hvem der havde ret, men efter om du er til at gå til, når noget går skævt.",
          },
          {
            q: "Hvor mange stempler skal et stempelkort til en frisør have?",
            a: "Fem til seks. En frisørkunde kommer typisk hver sjette til ottende uge, så seks besøg er allerede næsten et år. Ti felter ville tage halvandet år, og så begynder de fleste slet ikke at samle.",
          },
          {
            q: "Er anmeldelser vigtigere for en frisør end for andre?",
            a: "Ja, af tre grunde: kunden kan ikke prøve billigt først, valget er personligt frem for et produktvalg, og den nye kunde bliver ofte i årevis, hvis de bliver glade. En anmeldelse, der skaffer én fast kunde, betaler sig hjem mange gange over.",
          },
          {
            q: "Skal jeg spørge om Google eller Trustpilot?",
            a: "For en salon med lokale kunder er Google klart vigtigst — det er dér, folk søger efter en frisør i nærheden. Trustpilot vejer tungest for virksomheder, der sælger på tværs af landet, og er sjældent første prioritet for en enkelt salon.",
          },
        ],
      },
      {
        type: "cta",
        text: "Gør det nemt for kunderne at anmelde salonen — uden at du skal spørge.",
        href: "/reviewstander",
        label: "Se reviewstanderen",
      },
    ],
  },
  {
    slug: "flere-trustpilot-anmeldelser",
    title:
      "Flere Trustpilot-anmeldelser: sådan får du dem uden at bryde reglerne",
    metaTitle: "Flere Trustpilot-anmeldelser — guide til virksomheder (2026)",
    description:
      "Trustpilot afviser ikke bare belønnede anmeldelser — de straffer profilen. Her er reglerne, den fælde de fleste danske virksomheder falder i, og de metoder der faktisk giver flere anmeldelser.",
    keyword: "flere trustpilot anmeldelser",
    date: "2026-08-23",
    readingMinutes: 9,
    excerpt:
      "De fleste råd om Trustpilot-anmeldelser er i strid med Trustpilots egne regler — og med dansk lov. Her er hvad du faktisk må, hvad der virker, og hvad der kan koste dig hele profilen.",
    image: "/blog/trustpilot-anmeldelser.svg",
    imageAlt:
      "Anmeldelsesprofil med stjernebedømmelse ved siden af en stander med QR-kode på en disk",
    related: [
      "saadan-faar-du-flere-google-anmeldelser",
      "google-review-stander-guide",
    ],
    body: [
      {
        type: "p",
        html: "Trustpilot er dansk, og danske forbrugere bruger det. Alligevel håndterer et overraskende stort antal virksomheder platformen på en måde, der i bedste fald ikke virker — og i værste fald koster dem deres profil.",
      },
      {
        type: "p",
        html: "Problemet er sjældent ond vilje. Det er, at de mest udbredte råd — &quot;giv en rabat for en anmeldelse&quot;, &quot;spørg dem der er glade&quot; — begge er <strong>direkte forbudt</strong>. Ikke bare imod god skik: forbudt efter Trustpilots retningslinjer og efter dansk markedsføringslov.",
      },
      {
        type: "p",
        html: "Denne guide gennemgår, hvad du faktisk må, hvad der virker, og hvorfor den mest fristende genvej er den, der gør mest skade.",
      },

      {
        type: "h2",
        text: "Trustpilot eller Google — hvad skal du prioritere?",
      },
      {
        type: "p",
        html: "Det korte svar for de fleste lokale forretninger: <strong>Google først</strong>. Men det afhænger af, hvordan kunderne finder dig.",
      },
      {
        type: "table",
        head: ["", "Google-anmeldelser", "Trustpilot"],
        rows: [
          [
            "<strong>Ses hvor</strong>",
            "I Google Maps og i søgeresultatet, når nogen søger på din branche i dit område",
            "På trustpilot.com og i widgets på dit eget website",
          ],
          [
            "<strong>Stærkest for</strong>",
            "Fysiske forretninger med lokale kunder — café, frisør, værksted, klinik",
            "Webshops og virksomheder, der sælger på tværs af landet",
          ],
          [
            "<strong>Påvirker</strong>",
            "Din placering i det lokale søgeresultat",
            "Tillid på selve købstidspunktet",
          ],
          [
            "<strong>Koster</strong>",
            "Gratis",
            "Gratis at have en profil; indsamlingsværktøjer koster",
          ],
        ],
      },
      {
        type: "p",
        html: "Har du en fysisk butik, hvor folk går ind fra gaden, er Google klart vigtigst — der er selve søgningen. Sælger du online, hvor kunden skal turde lægge kortnummeret hos et navn, de ikke kender, vejer Trustpilot tungere. Mange har brug for begge dele, og så er den gode nyhed, at <strong>arbejdet er det samme</strong>: du skal spørge alle kunder, på samme tidspunkt, uden at love noget for det.",
      },
      {
        type: "p",
        html: 'Vil du have hele metoden til Google, har vi den <a href="/blog/saadan-faar-du-flere-google-anmeldelser">i en guide for sig</a>.',
      },

      { type: "h2", text: "Sådan beregnes din TrustScore" },
      {
        type: "p",
        html: "Det her ændrer din strategi, så det er værd at forstå: <strong>din TrustScore er ikke et simpelt gennemsnit</strong> af dine stjerner.",
      },
      {
        type: "p",
        html: "Trustpilot vægter anmeldelserne. Nye anmeldelser tæller mere end gamle, og hvor <em>jævnt</em> der kommer anmeldelser ind, indgår også. Samtidig er der indbygget en modvægt, der gør, at en helt ny profil ikke kan få topkarakter på tre anmeldelser — netop for at forhindre, at en score kan købes billigt.",
      },
      {
        type: "note",
        title: "Hvad det betyder i praksis",
        html: "En kampagne, der giver dig fyrre anmeldelser på en uge og derefter ingenting, er <strong>dårligere</strong> end tre anmeldelser om ugen året rundt. Og dine gode anmeldelser fra 2023 holder ikke din score oppe for evigt — de falmer. Derfor er anmeldelser ikke en opgave, du bliver færdig med, men noget der skal køre af sig selv.",
      },
      {
        type: "p",
        html: "Det er hele argumentet for at gøre indsamlingen til en fast del af hverdagen frem for et projekt. Et skilt på disken spørger hver eneste kunde, hver eneste dag, uden at nogen skal huske det.",
      },

      { type: "h2", text: "Reglerne du skal kende, før du spørger" },
      {
        type: "p",
        html: "Trustpilots retningslinjer for virksomheder er korte og ret klare. Fire ting betyder mest:",
      },
      {
        type: "ul",
        items: [
          "<strong>Du må gerne invitere.</strong> Både automatisk og manuelt — mail, sms, link eller QR-kode er alle tilladte metoder.",
          "<strong>Du skal invitere alle ens.</strong> Samme måde, samme sted i kundeforløbet, uanset om kunden virkede glad eller sur.",
          "<strong>Du må ikke belønne.</strong> Rabat, rabatkode, konkurrencelodder, refusion, gaver — intet må knyttes til det at skrive en anmeldelse.",
          "<strong>Du må ikke bede om positive anmeldelser.</strong> Selv en formulering som &quot;kan du lide os, så giv os fem stjerner&quot; er i strid med reglerne.",
        ],
      },
      {
        type: "p",
        html: "Bryder du dem, er konsekvensen ikke bare, at de pågældende anmeldelser fjernes. Trustpilot kan <strong>lukke funktioner i din konto, skjule din TrustScore og sætte en offentlig advarsel på din profil</strong>. En advarsel, alle dine kommende kunder kan se.",
      },

      { type: "h2", text: "Fælden: at spørge de glade først" },
      {
        type: "p",
        html: "Det her er den vigtigste del af guiden, fordi det er den fejl, flest begår — og den, der ligner en god idé.",
      },
      {
        type: "p",
        html: "Mønsteret ser sådan ud: kunden bliver først spurgt, hvor tilfreds de er. Svarer de fire eller fem stjerner, sendes de videre til Trustpilot. Svarer de lavere, sendes de til en kontaktformular i stedet. Det sælges tit som &quot;vi fanger utilfredse kunder, før de skriver offentligt&quot;.",
      },
      {
        type: "p",
        html: "Trustpilot nævner mønsteret <strong>eksplicit som forbudt</strong>. Det gælder også de mere subtile varianter: at lade invitationen gå ud på et tidspunkt i forløbet, som kun tilfredse kunder når frem til, tæller som det samme.",
      },
      {
        type: "note",
        title: "Hvorfor det også er en dårlig forretning",
        html: "Selv hvis ingen opdagede det, virker det ikke. En profil med udelukkende femstjernede anmeldelser <strong>ser falsk ud</strong> — forbrugere er blevet gode til at genkende det, og mange læser bevidst de kritiske anmeldelser først for at finde ud af, om profilen er ægte. Et par velbesvarede treere gør din profil mere troværdig, ikke mindre.",
      },
      {
        type: "p",
        html: "Det rigtige alternativ er ikke at sortere, men at <strong>tilbyde begge veje samtidig</strong>: kunden vælger selv, om de vil skrive offentligt eller sende dig en besked direkte. Forskellen er afgørende — valget ligger hos kunden i stedet for hos dig, og det offentlige link står åbent for alle uanset, hvad de mener.",
      },
      {
        type: "p",
        html: "Det er også sådan, LoyalSums flow er bygget: funktionen, der vælger, hvad kunden får at se, <strong>får aldrig bedømmelsen at vide</strong>. Den kan ikke sortere efter noget, den ikke kender — heller ikke hvis nogen senere skulle få den idé.",
      },

      { type: "h2", text: "Hvad dansk lov siger oveni" },
      {
        type: "p",
        html: "Trustpilots regler er husregler. Men i Danmark er der lovgivning oveni, og den er skarpere, end mange tror.",
      },
      {
        type: "p",
        html: "Markedsføringslovens <strong>bilag 1</strong> er en liste over former for markedsføring, der <em>altid</em> er ulovlige — der skal ikke foretages nogen vurdering af, om det var slemt nok. To punkter handler direkte om anmeldelser:",
      },
      {
        type: "ul",
        items: [
          "<strong>Nr. 23b:</strong> Oplyser du, at anmeldelser kommer fra kunder, der faktisk har brugt produktet, skal du have taget rimelige skridt for at sikre, at det er tilfældet.",
          "<strong>Nr. 23c:</strong> Det er forbudt at give et fordrejet billede af forbrugeranmeldelser. At vise kun de positive — uden at oplyse det — er netop dét.",
        ],
      },
      {
        type: "p",
        html: "Med andre ord: den sortering, Trustpilot forbyder i sine retningslinjer, er i Danmark også en overtrædelse af markedsføringsloven. Reglerne stammer fra EU-direktivet om urimelig handelspraksis og gælder tilsvarende i resten af EU.",
      },
      {
        type: "note",
        title: "Gælder også dine egne anmeldelser på dit website",
        html: "Viser du udvalgte anmeldelser i en karrusel på din forside, gælder nr. 23c også dér. Enten viser du et retvisende udsnit, eller også skal det fremgå, at der er tale om et udvalg.",
      },

      { type: "h2", text: "Seks metoder der faktisk virker" },
      {
        type: "p",
        html: "Når sorteringen og belønningen er ude, står du tilbage med det, der reelt flytter tallet: at spørge flere, på det rigtige tidspunkt, med færre klik.",
      },
      {
        type: "ol",
        items: [
          "<strong>Spørg mens oplevelsen er frisk.</strong> Ved afhentning, ved betaling, eller lige efter leveringen er landet. En uge senere er lysten væk.",
          "<strong>Fjern hvert eneste klik.</strong> Send kunden direkte til skrivefeltet — ikke til din Trustpilot-forside, og ikke til en søgning på dit navn. Hvert ekstra trin koster anmeldelser.",
          "<strong>Gør det synligt dér hvor kunden er.</strong> Et skilt ved disken spørger alle, hver gang, uden at personalet skal huske det — og uden den akavethed, de fleste har ved at bede om det.",
          "<strong>Sæt det ind i en fast rutine.</strong> Et link i ordrebekræftelsen eller i den mail, der alligevel sendes, rammer alle kunder ens. Det er både det mest effektive og det, der bedst opfylder kravet om at invitere ensartet.",
          "<strong>Skriv en neutral opfordring.</strong> &quot;Fortæl hvordan det gik&quot; er både lovligt og mere ærligt end &quot;giv os fem stjerner&quot;. Neutrale formuleringer giver også mere brugbar feedback.",
          "<strong>Svar på dem, du får.</strong> Et sagligt svar på en kritisk anmeldelse læses af alle fremtidige kunder og vejer tungere, end anmeldelsen gør alene.",
        ],
      },

      { type: "h2", text: "Hvad gør du ved en dårlig anmeldelse?" },
      {
        type: "p",
        html: "Først: du kan ikke få den fjernet, fordi du er uenig. Trustpilot fjerner anmeldelser, der bryder retningslinjerne — ikke anmeldelser, der er ubehagelige.",
      },
      {
        type: "p",
        html: "Du kan <strong>flage</strong> en anmeldelse, hvis du har en reel grund: den handler ikke om din virksomhed, den indeholder personoplysninger, den er tydeligvis falsk, eller den er skrevet af en konkurrent. Men flag med omtanke — Trustpilot advarer eksplicit mod at flage for hurtigt eller på et løst grundlag, og det tæller imod dig.",
      },
      {
        type: "p",
        html: "Det, der virker, er svaret. Hold det <strong>kort, sagligt og uden personoplysninger</strong>: anerkend problemet, forklar hvad der er sket, og tilbyd at ordne det. Du skriver ikke til anmelderen — du skriver til de hundrede mennesker, der læser med bagefter.",
      },
      {
        type: "p",
        html: "Og husk regnestykket ovenfor: den bedste beskyttelse mod en enkelt dårlig anmeldelse er en jævn strøm af almindelige. Får du to anmeldelser om året, fylder en enkelt etter alt. Får du tre om ugen, er den et støjsignal.",
      },

      { type: "h2", text: "Sådan kommer du i gang" },
      {
        type: "p",
        html: "Skal du kun gøre to ting, så gør disse: <strong>gør det synligt, hvor kunden står</strong>, og <strong>gør vejen ét tap lang</strong>. Resten — tidspunktet, tonen, mængden — følger af sig selv, når barrieren er væk.",
      },
      {
        type: "p",
        html: 'En <a href="/reviewstander">reviewstander</a> løser begge dele på én gang: kunden scanner eller holder telefonen mod skiltet og er inde på anmeldelsessiden med det samme. Du kan sætte den til Trustpilot, Google eller Facebook — eller lade kunden vælge selv — og linket kan ændres bagefter uden at genoptrykke noget.',
      },
      {
        type: "faq",
        items: [
          {
            q: "Må jeg give rabat for en Trustpilot-anmeldelse?",
            a: "Nej. Trustpilot forbyder enhver form for belønning knyttet til at skrive en anmeldelse — rabat, rabatkode, konkurrencelodder, refusion eller gaver. Du må gerne belønne et genbesøg eller et køb, så længe belønningen ikke er knyttet til det, kunden skriver.",
          },
          {
            q: "Må jeg kun spørge de kunder, jeg ved er tilfredse?",
            a: "Nej. Trustpilot kræver, at du inviterer alle kunder på samme måde og på samme tidspunkt i forløbet, uanset om oplevelsen var god eller dårlig. At sende tilfredse kunder til Trustpilot og utilfredse til en kontaktformular er udtrykkeligt forbudt — og i Danmark er det samtidig en overtrædelse af markedsføringslovens bilag 1, nr. 23c.",
          },
          {
            q: "Må jeg bruge en QR-kode til Trustpilot-anmeldelser?",
            a: "Ja. Trustpilot tillader både automatiske og manuelle invitationer, herunder links og QR-koder, så længe indsamlingen er fair og neutral. Det afgørende er ikke metoden, men at alle kunder får den samme invitation.",
          },
          {
            q: "Kan jeg få en dårlig anmeldelse slettet?",
            a: "Ikke fordi du er uenig i den. Du kan flage en anmeldelse, hvis den bryder retningslinjerne — for eksempel hvis den ikke handler om din virksomhed, indeholder personoplysninger eller tydeligvis er falsk. Flager du for hurtigt eller uden reel grund, tæller det imod dig.",
          },
          {
            q: "Hvor mange Trustpilot-anmeldelser bør jeg have?",
            a: "Der findes ikke et fast tal. Fordi din TrustScore vægter nye anmeldelser højere end gamle og også ser på, hvor jævnt de kommer ind, betyder en stabil strøm mere end et højt samlet antal. Tre om ugen året rundt er bedre end fyrre på en uge og ingenting bagefter.",
          },
          {
            q: "Tæller Trustpilot-anmeldelser med i Google?",
            a: "De påvirker ikke din placering i Google Maps — det gør kun anmeldelser på din Google Virksomhedsprofil. Din Trustpilot-profil kan derimod optræde i almindelige søgeresultater på dit firmanavn, og stjernerne kan vises i annoncer og på dit eget website.",
          },
        ],
      },
      {
        type: "cta",
        text: "Gør det nemt for kunderne at anmelde dig — på Trustpilot, Google eller begge dele.",
        href: "/reviewstander#platforme",
        label: "Se reviewstanderen",
      },
    ],
  },
  {
    slug: "stempelkort-app-eller-papkort",
    title: "Stempelkort til din forretning: papkort, app eller digitalt kort?",
    metaTitle:
      "Stempelkort app, papkort eller digitalt kort — hvad skal du vælge?",
    description:
      "Papkortet bliver væk, appen bliver aldrig hentet. Her er den reelle forskel på de tre slags stempelkort, hvad de koster i drift, og hvornår et stempelkort tjener sig hjem.",
    keyword: "stempelkort app",
    date: "2026-08-23",
    readingMinutes: 9,
    excerpt:
      "De fleste vælger stempelkort efter, hvad der er billigst at starte. Det er sjældent det billigste at drive. Her er regnestykket og de tre løsningers reelle styrker.",
    image: "/blog/stempelkort-tre-slags.svg",
    imageAlt:
      "Tre stempelkort side om side: et slidt papkort, en telefon med et app-ikon og en telefon der viser et stempelkort i browseren",
    related: ["hvor-mange-stempler-stempelkort", "kundeklub-uden-app-guide"],
    body: [
      {
        type: "p",
        html: "Et stempelkort er en af de få loyalitetsmekanismer, der stadig virker, fordi den er til at forstå: køb ti, få den ellevte. Ingen point, ingen niveauer, ingen forklaring nødvendig.",
      },
      {
        type: "p",
        html: "Spørgsmålet er ikke <em>om</em> det virker, men <strong>hvilken form</strong> du skal vælge. Og her vælger de fleste efter, hvad der er billigst at komme i gang med — hvilket sjældent er det billigste at drive.",
      },

      { type: "h2", text: "De tre måder at lave et stempelkort på" },
      {
        type: "table",
        head: ["", "Papkort", "App", "Digitalt kort uden app"],
        rows: [
          [
            "<strong>Kunden skal</strong>",
            "Huske at have kortet med",
            "Hente app og oprette konto",
            "Scanne én QR-kode",
          ],
          [
            "<strong>Opstart</strong>",
            "Tryk af kort",
            "Udvikling eller abonnement",
            "Abonnement",
          ],
          [
            "<strong>Løbende</strong>",
            "Genoptryk, svind, snyd",
            "Vedligehold og opdateringer",
            "Fast pris",
          ],
          ["<strong>Du kan se</strong>", "Ingenting", "Alt", "Alt"],
          [
            "<strong>Kan rettes bagefter</strong>",
            "Nej — kortene er trykt",
            "Ja",
            "Ja",
          ],
          [
            "<strong>Typisk tilslutning</strong>",
            "Høj i starten, falder hurtigt",
            "Lav — de fleste henter ikke",
            "Høj og stabil",
          ],
        ],
      },

      { type: "h2", text: "Papkortet: billigst at starte, dyrest at drive" },
      {
        type: "p",
        html: "Papkortet har én stor fordel: det virker med det samme, og alle forstår det. Du kan have det kørende i morgen for prisen af et tryk.",
      },
      {
        type: "p",
        html: "Omkostningerne kommer bagefter, og de er ikke dem, folk regner med:",
      },
      {
        type: "ul",
        items: [
          "<strong>Kortene bliver væk.</strong> Kunden mister kortet med syv stempler og starter ikke forfra — de holder op med at samle. Din belønning er nu en irritation.",
          "<strong>Du kan ikke se noget.</strong> Hvor mange kort er i omløb? Hvor mange når frem til belønningen? Kommer folk oftere? Du har ingen anelse, og du kan derfor ikke vurdere, om det tjener sig hjem.",
          "<strong>Det kan snydes.</strong> Et almindeligt stempel kan købes på nettet. Det er sjældent et stort problem i praksis, men det er et problem, du ikke kan opdage.",
          "<strong>Du kan ikke rette.</strong> Viser det sig, at ti stempler er for mange, står du med et oplag trykte kort, hvor der står ti.",
        ],
      },
      {
        type: "p",
        html: 'Det sidste punkt er det dyreste. De fleste rammer ikke det rigtige antal i første forsøg — <a href="/blog/hvor-mange-stempler-stempelkort">og det er svært at regne sig frem til</a>. Med papkort koster en fejl et nyt oplag; digitalt koster den et klik.',
      },

      { type: "h2", text: "Appen: den løsning, ingen henter" },
      {
        type: "p",
        html: "En app lyder som den professionelle løsning. For en kæde med hundredtusind kunder er den det også. For en enkelt café, frisør eller klinik er den næsten altid en fejl — og grunden er ikke prisen.",
      },
      {
        type: "p",
        html: "Grunden er, at <strong>du beder kunden om noget stort</strong>. De skal finde appen i en butik med to millioner andre, hente den over butikkens dårlige wifi, oprette en konto med adgangskode og acceptere notifikationer — alt sammen mens der står folk bag dem i køen. Til gengæld for en gratis kaffe om en måned.",
      },
      {
        type: "p",
        html: "De fleste siger nej. Og de, der siger ja, sletter appen igen efter et par uger, fordi de har den ene forretning i den ene app. Resultatet er et loyalitetsprogram, som kun dine allermest loyale kunder bruger — altså præcis dem, der var kommet igen alligevel.",
      },
      {
        type: "note",
        title: "Undtagelsen",
        html: "Har du i forvejen en app, kunderne bruger til noget andet — bestilling, betaling, booking — så hører stempelkortet naturligt hjemme dér. Barrieren er allerede betalt. Det er kun appen, der findes <em>udelukkende</em> for stempelkortets skyld, der sjældent giver mening.",
      },

      { type: "h2", text: "Det digitale kort uden app" },
      {
        type: "p",
        html: "Den tredje mulighed fjerner appens barriere og papkortets blindhed på én gang: kortet lever i kundens <strong>browser</strong>. De scanner en QR-kode på disken, og kortet er der. Ingen download, ingen konto, ingen adgangskode.",
      },
      {
        type: "p",
        html: "Kunden kan lægge siden på hjemmeskærmen, hvis de vil, men de behøver ikke — de kan altid scanne skiltet igen for at finde kortet. Det er den samme mekanik som papkortet, blot uden at noget kan blive væk.",
      },
      {
        type: "p",
        html: "Og du får det, papkortet aldrig kunne give dig: hvor mange der er tilmeldt, hvor mange stempler der gives, hvor mange der når belønningen, og om folk faktisk kommer oftere. Det er de tal, der afgør, om programmet skal justeres eller droppes.",
      },

      { type: "h2", text: "Hvad koster det — og hvornår tjener det sig hjem?" },
      {
        type: "p",
        html: "Her er regnestykket, de fleste springer over. Tag en café med omkring 40 kunder om dagen:",
      },
      {
        type: "ol",
        items: [
          "<strong>Hvad koster belønningen dig?</strong> En gratis kaffe koster din <em>indkøbspris</em> — bønner, mælk, kop. Kald det 6 kr. Ikke de 40 kr., der står på skiltet. Det er den vigtigste skelnen i hele regnestykket, og den, folk oftest får galt.",
          "<strong>Hvad tjener du på et besøg?</strong> Sælger du for 45 kr. med en råvarepris på 8 kr., er dækningsbidraget cirka 37 kr.",
          "<strong>Hvad koster ét fyldt kort dig?</strong> Ti besøg giver ti stempler og én gratis kaffe: 6 kr. i belønning mod ti besøgs dækningsbidrag.",
          "<strong>Hvor mange ekstra besøg skal der til?</strong> Kortet skal blot flytte <strong>ét</strong> ekstra besøg pr. kunde, for at 37 kr. dækker de 6 kr. mange gange. Resten er gevinst.",
        ],
      },
      {
        type: "p",
        html: "Det er derfor stempelkort næsten altid regner hjem for forretninger med hyppige, billige køb — og hvorfor de skal designes anderledes, når hvert besøg er dyrt og sjældent.",
      },
      {
        type: "note",
        title: "Den udgift, der ikke står i regnearket",
        html: "Det er ikke belønningen, der koster mest. Det er de kunder, der samler syv stempler og aldrig kommer tilbage, fordi kortet blev væk, eller fordi målet var for langt væk. Hver af dem er en kunde, du har brugt rabat på uden at få genbesøget. Det er præcis den udgift, du ikke kan se med papkort.",
      },
      {
        type: "p",
        html: 'Til sammenligning ligger et digitalt stempelkort typisk på et fast månedligt beløb uafhængigt af, hvor mange kunder der tilmelder sig. Se niveauerne på <a href="/produkter">produktsiden</a>.',
      },

      { type: "h2", text: "Hvad må du gemme om kunderne?" },
      {
        type: "p",
        html: "Så snart kortet er digitalt, behandler du personoplysninger, og så gælder GDPR. Det er ikke kompliceret, men der er tre ting, du skal have styr på:",
      },
      {
        type: "ul",
        items: [
          "<strong>Gem kun det, du bruger.</strong> Et stempelkort har brug for at kunne genkende kunden — ikke for deres fødselsdato eller adresse. Jo mindre du gemmer, jo mindre kan gå galt.",
          "<strong>Hav en frist.</strong> Data må ikke ligge for evigt. Beslut, hvornår en inaktiv kunde slettes, skriv det ned, og sørg for at det rent faktisk sker.",
          "<strong>Du skal have en databehandleraftale</strong> med den leverandør, der opbevarer oplysningerne for dig. Den skal være på plads, før I går i gang — ikke bagefter.",
        ],
      },
      {
        type: "p",
        html: "Bruger du en færdig løsning, bør de tre ting følge med. Gør de ikke det, er det dig som virksomhed, der hæfter — ikke leverandøren.",
      },

      { type: "h2", text: "Sådan vælger du" },
      {
        type: "p",
        html: "Beslutningen kan koges ned til tre spørgsmål:",
      },
      {
        type: "ul",
        items: [
          "<strong>Kommer dine kunder tit?</strong> Ja, og køb er små: stempelkort passer godt. Nej, og hvert besøg er dyrt: brug færre felter, eller vælg en anden belønningsform.",
          "<strong>Har du brug for at vide, om det virker?</strong> Hvis ja, er papkortet ude — det kan ikke fortælle dig noget.",
          "<strong>Har du allerede en app, kunderne bruger?</strong> Hvis ja, læg kortet dér. Hvis nej, så byg ikke en.",
        ],
      },
      {
        type: "p",
        html: "For langt de fleste lokale forretninger ender svaret det samme sted: et digitalt kort uden app. Det har papkortets enkelhed og appens indsigt, uden at have nogen af de to ting, der får dem til at fejle.",
      },
      {
        type: "note",
        title: "Én ting du aldrig skal gøre",
        html: 'Knyt aldrig stempler eller belønninger til, at kunden skriver en anmeldelse. Det er forbudt både efter Googles og Trustpilots regler og efter markedsføringslovens bilag 1 — og konsekvensen rammer din forretning, ikke din leverandør. <a href="/blog/flere-trustpilot-anmeldelser">Læs mere om reglerne for anmeldelser her</a>. Du må gerne belønne genbesøg. Bare ikke det, kunden skriver.',
      },
      {
        type: "faq",
        items: [
          {
            q: "Skal kunden hente en app for at bruge et digitalt stempelkort?",
            a: "Nej. Et digitalt stempelkort kan ligge i kundens browser: de scanner en QR-kode, og kortet åbner med det samme. Ingen download og ingen konto. Kunden kan lægge siden på hjemmeskærmen, hvis de vil, men behøver det ikke.",
          },
          {
            q: "Hvad koster et stempelkort til en lille forretning?",
            a: "Papkort koster et tryk plus de belønninger, du giver væk. Digitale kort ligger typisk på et fast månedligt beløb uafhængigt af antal kunder. Den udgift, der oftest overses, er hverken af delene: det er de kunder, der samler halvdelen af et kort og aldrig kommer tilbage.",
          },
          {
            q: "Hvor mange stempler skal der være på kortet?",
            a: "Det afhænger af, hvor tit kunden kommer, og hvad belønningen koster dig i indkøb. En tommelfingerregel er at vælge et antal, der svarer til cirka to måneders besøg for en typisk kunde. Vi har en regnemetode i en guide for sig.",
          },
          {
            q: "Kan kunderne snyde med et digitalt stempelkort?",
            a: "Det er sværere end med papkort, fordi stemplet gives af personalet i systemet og ikke af et fysisk stempel, der kan købes på nettet. Vigtigere er det, at du kan se, hvad der sker: usædvanlige mønstre er synlige, hvilket de aldrig er på papir.",
          },
          {
            q: "Må jeg give et stempel for en anmeldelse?",
            a: "Nej. Både Google og Trustpilot forbyder belønninger knyttet til anmeldelser, og i Danmark er det samtidig i strid med markedsføringslovens bilag 1. Du må gerne give stempler for køb og genbesøg — bare ikke for det, kunden skriver om dig.",
          },
          {
            q: "Hvad sker der med kundernes data, hvis jeg stopper?",
            a: "Det skal fremgå af din aftale med leverandøren. Du bør kunne få dine data udleveret, og der bør være en klar frist for, hvornår de slettes. Er det ikke skrevet ned nogen steder, er det dig som virksomhed, der hæfter over for kunderne.",
          },
        ],
      },
      {
        type: "cta",
        text: "Vil du se, hvordan et digitalt stempelkort uden app fungerer i praksis?",
        href: "/stempelkort",
        label: "Se stempelkortet",
      },
    ],
  },
  {
    slug: "hvor-mange-stempler-stempelkort",
    title: "Hvor mange stempler bør et stempelkort have?",
    metaTitle: "Hvor mange stempler bør et stempelkort have?",
    description:
      "10 stempler til en café, 6 til en frisør — men hvorfor? Sådan finder du det rigtige antal stempler ud fra, hvor tit dine kunder kommer, og hvad belønningen koster dig.",
    keyword: "hvor mange stempler stempelkort",
    date: "2026-07-22",
    updated: "2026-08-23",
    readingMinutes: 6,
    excerpt:
      "Sætter du tallet for højt, giver kunden op. Sætter du det for lavt, forærer du penge væk. Her er den regnemetode, der giver dig det rigtige antal stempler til netop din forretning.",
    image: "/blog/stempelkort-antal-stempler.svg",
    imageAlt:
      "Digitalt stempelkort med ti felter, hvor syv er stemplet og det tiende felt er belønningen",
    related: ["stempelkort-app-eller-papkort", "kundeklub-uden-app-guide"],
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
        html: 'Så retter du det. Et <a href="/stempelkort">digitalt stempelkort</a> er ikke trykt i tusind eksemplarer — du kan sætte et program på pause og starte et nyt med andre tal, uden at nogen står med et forældet papkort i hånden. Det er en af de mere undervurderede fordele ved at gøre kortet digitalt.',
      },
      {
        type: "p",
        html: "Et godt sted at begynde: vælg det tal, der svarer til cirka to måneders besøg for en typisk kunde. Kig på det igen efter et kvartal, og se på, hvor mange der rent faktisk når belønningen. Når næsten ingen frem, er tallet for højt.",
      },
      { type: "h2", text: "Fire brancher, fire tal" },
      {
        type: "table",
        head: [
          "Branche",
          "Hvor tit kommer kunden?",
          "Antal stempler",
          "Belønning",
        ],
        rows: [
          ["<strong>Café</strong>", "2-3 gange om ugen", "10", "Gratis kaffe"],
          [
            "<strong>Restaurant</strong>",
            "1-2 gange om måneden",
            "8",
            "Gratis dessert",
          ],
          ["<strong>Frisør</strong>", "Hver 6.-8. uge", "6", "20 % rabat"],
          ["<strong>Klinik</strong>", "Hver 2.-3. måned", "5", "Valgfri bonus"],
        ],
      },
      {
        type: "p",
        html: "Mønsteret er hele logikken på én linje: <strong>jo sjældnere kunden kommer, og jo dyrere hvert besøg er, jo færre stempler</strong>. Cafeen kan tillade sig ti, fordi ti besøg er en måned. Klinikken kan ikke, fordi ti besøg ville være to år.",
      },
      { type: "h2", text: "Tre fejl, der gør kortet virkningsløst" },
      {
        type: "ul",
        items: [
          "<strong>For mange felter.</strong> Kunden regner ubevidst efter, hvor lang tid der går. Er svaret &quot;næste år&quot;, begynder de ikke.",
          "<strong>En belønning, ingen vil have.</strong> Rabat på noget, kunden ikke plejer at købe, motiverer ikke. Den bedste belønning er som regel mere af dét, de allerede kommer efter.",
          "<strong>Ingen synlig fremgang.</strong> Kan kunden ikke se, hvor tæt de er, glemmer de det. Det er derfor et kort med felter slår et pointtal — felterne <em>viser</em> afstanden til målet.",
        ],
      },
      {
        type: "faq",
        items: [
          {
            q: "Hvor mange stempler er det mest normale?",
            a: "Ti er det mest udbredte, men det passer primært til forretninger med hyppige, billige køb som en café. Kommer dine kunder sjældnere, er 5-8 typisk mere realistisk. Det afgørende er, hvor lang tid der går, før kortet kan fyldes.",
          },
          {
            q: "Skal belønningen være gratis, eller kan det være en rabat?",
            a: "Et gratis produkt er som regel billigere for dig end en procentrabat, fordi det koster din indkøbspris og ikke din salgspris. En gratis kaffe koster bønner og mælk — ikke de fyrre kroner på skiltet.",
          },
          {
            q: "Kan jeg ændre antallet af stempler senere?",
            a: "Med et digitalt kort ja — du kan sætte et program på pause og starte et nyt med andre tal. Med trykte papkort står du med et oplag, hvor der er trykt et antal, du ikke længere vil have.",
          },
          {
            q: "Hvad gør jeg, hvis næsten ingen når frem til belønningen?",
            a: "Så er tallet for højt. Kig på det efter et kvartal: når under en femtedel af de tilmeldte i mål, bør du sætte antallet ned eller gøre belønningen større. Et kort, ingen fylder, er en rabat, du har lovet uden at få genbesøget.",
          },
          {
            q: "Må jeg give stempler for at kunden anmelder mig?",
            a: "Nej. Både Google og Trustpilot forbyder belønninger knyttet til anmeldelser, og det er samtidig i strid med markedsføringslovens bilag 1. Du må gerne give stempler for køb og genbesøg — bare ikke for det, kunden skriver om dig.",
          },
        ],
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
    updated: "2026-08-23",
    readingMinutes: 7,
    excerpt:
      "De store kæder har kundeklubber med apps og point. Men som lokal forretning har du en fordel, de ikke har — og du behøver hverken app eller stort budget. Her er guiden.",
    image: "/blog/kundeklub-uden-app.svg",
    imageAlt:
      "Skilt med QR-kode på en disk ved siden af en telefon, der viser kundens stempelkort i browseren",
    related: [
      "stempelkort-app-eller-papkort",
      "hvor-mange-stempler-stempelkort",
    ],
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
        html: 'Den bedste belønning er <strong>konkret, opnåelig og relevant</strong>. "10. kop kaffe er gratis" slår "spar op til rabatter", fordi kunden kan se målet. Hold det enkelt — én klar belønning er stærkere end et kompliceret pointsystem.',
      },
      { type: "h2", text: "Kom i gang uden teknisk bøvl" },
      {
        type: "p",
        html: 'Du behøver ikke bygge noget selv. Med et <a href="/stempelkort">digitalt stempelkort</a> fra LoyalSum har du en kundeklub kørende samme dag: sæt skiltet på disken, vælg din belønning, og lad kunderne tilmelde sig selv. Vil du også have flere anmeldelser med i samme skilt, kan du <a href="/produkter/loyalsum-komplet">se hele platformen her</a>.',
      },
      { type: "h2", text: "Hvad du skal måle på" },
      {
        type: "p",
        html: "En kundeklub, du ikke måler på, er en rabat, du giver væk i blinde. Fire tal fortæller, om den virker:",
      },
      {
        type: "ul",
        items: [
          "<strong>Tilmeldte pr. uge.</strong> Falder tallet, er skiltet flyttet, blevet væk eller står et sted, ingen kigger.",
          "<strong>Hvor mange når belønningen.</strong> Er det under en femtedel, er målet sat for langt væk.",
          "<strong>Hvor tit de aktive kommer.</strong> Det er hele pointen — kommer medlemmerne ikke oftere end resten, betaler du for noget, du fik i forvejen.",
          "<strong>Hvor mange der falder fra undervejs.</strong> Kunder, der samler halvdelen og forsvinder, er den dyreste gruppe: rabat lovet, genbesøg udeblevet.",
        ],
      },
      {
        type: "p",
        html: "Ingen af de fire tal kan aflæses af et papkort. Det er den reelle grund til at gøre klubben digital — ikke at det er moderne, men at du ellers ikke kan vide, om den skal justeres eller droppes.",
      },
      { type: "h2", text: "Hvad reglerne kræver af dig" },
      {
        type: "p",
        html: "Så snart du gemmer noget om dine medlemmer, behandler du personoplysninger. Det er til at håndtere, men tre ting skal være på plads:",
      },
      {
        type: "ul",
        items: [
          "<strong>Gem kun det, klubben har brug for</strong> — et navn eller en telefon til at genkende kunden. Ikke fødselsdato og adresse, fordi feltet var der.",
          "<strong>Hav en slettefrist</strong>, skriv den ned, og sørg for at den faktisk bliver håndhævet.",
          "<strong>Få en databehandleraftale</strong> med den leverandør, der opbevarer oplysningerne. Den skal være på plads, før I går i gang.",
        ],
      },
      {
        type: "note",
        title: "Bland aldrig klub og anmeldelser sammen",
        html: 'Det er fristende at give et ekstra stempel for en anmeldelse. Det er forbudt — både efter Googles og Trustpilots regler og efter markedsføringslovens bilag 1 — og konsekvensen rammer din forretning, ikke din leverandør. <a href="/blog/flere-trustpilot-anmeldelser">Læs mere om reglerne her</a>. Du må belønne genbesøg. Bare ikke det, kunden skriver.',
      },
      {
        type: "faq",
        items: [
          {
            q: "Kan man lave en kundeklub uden en app?",
            a: "Ja, og for de fleste lokale forretninger er det den bedste løsning. Kunden scanner en QR-kode, og kortet ligger i deres browser — ingen download og ingen konto. Barrieren ved at hente en app er den enkeltstående største grund til, at loyalitetsprogrammer i små forretninger ikke bliver brugt.",
          },
          {
            q: "Hvad koster det at have en kundeklub?",
            a: "Udgiften har to dele: hvad systemet koster, og hvad belønningerne koster dig i indkøb. Den tredje udgift, folk glemmer, er de kunder, der samler halvdelen af et kort og aldrig kommer igen — der er rabatten lovet uden at genbesøget kom.",
          },
          {
            q: "Hvor mange kunder skal jeg have, før det giver mening?",
            a: "Det handler mindre om antallet af kunder end om, hvor tit de kommer. Har du hyppige, billige køb, giver en klub mening selv med en lille kundekreds. Kommer folk to gange om året, skal belønningen tænkes anderledes.",
          },
          {
            q: "Skal kunderne oprette en konto?",
            a: "Nej. Kortet kan tilgås via en hemmelig adresse, kunden får ved at scanne skiltet. En konto kan tilbydes frivilligt til dem, der vil kunne finde kortet igen på tværs af flere telefoner — men det må ikke være et krav for at deltage.",
          },
          {
            q: "Hvad sker der med medlemmernes data, hvis jeg lukker klubben?",
            a: "Det skal fremgå af aftalen med din leverandør. Du bør kunne få dine data udleveret, og der bør være en klar frist for, hvornår de slettes. Er det ikke skrevet ned, er det dig som virksomhed, der hæfter over for kunderne.",
          },
        ],
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
    metaTitle:
      "Sådan får du flere Google-anmeldelser — guide til lokale forretninger",
    description:
      "Dine tilfredse kunder anmelder dig sjældent — de bliver ikke mindet om det. Her er de metoder der virker for en lokal forretning, og de tre ting du aldrig må gøre.",
    keyword: "få flere google anmeldelser",
    date: "2026-07-06",
    updated: "2026-08-23",
    readingMinutes: 8,
    excerpt:
      "Det handler sjældent om, at kunderne er utilfredse. De glemmer det, det er besværligt, og de bliver ikke spurgt på det rigtige tidspunkt. Her er hvad du gør ved det.",
    image: "/blog/flere-google-anmeldelser.svg",
    imageAlt:
      "Kunde ved disken der giver fem stjerner på sin telefon efter at have scannet en stander",
    related: ["flere-trustpilot-anmeldelser", "google-review-stander-guide"],
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
        html: 'Personalet glemmer at spørge, når der er travlt — og de fleste har det akavet med at bede om det. Et skilt gør det for dem, hver eneste gang, uden at nogen skal sige noget. Det er præcis dét, en <a href="/reviewstander">reviewstander</a> er lavet til: kunden tapper eller scanner ved disken og er inde på din anmeldelsesside med det samme.',
      },
      {
        type: "h2",
        text: "4. Giv kunden et alternativ til den offentlige anmeldelse",
      },
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
      { type: "h2", text: "Svar på dem, du får" },
      {
        type: "p",
        html: "Det her overses næsten altid, og det er billigere end at skaffe nye anmeldelser: <strong>svar på dem, du allerede har</strong>. Et svar læses af alle de kunder, der kommer efter — ikke kun af anmelderen.",
      },
      {
        type: "p",
        html: "På de gode anmeldelser er to linjer nok. På de kritiske gælder tre ting: svar <strong>sagligt</strong>, svar <strong>hurtigt</strong>, og skriv <strong>aldrig personoplysninger</strong> om kunden i et offentligt svar — heller ikke for at forsvare dig. En kunde, der føler sig hængt ud, skriver en ny anmeldelse, og den bliver værre end den første.",
      },
      {
        type: "p",
        html: "Anerkend problemet, forklar kort hvad der skete, og tilbyd at ordne det uden for tråden. Læseren leder ikke efter, hvem der havde ret. De leder efter, om du er til at regne med, når noget går galt.",
      },
      {
        type: "h2",
        text: "Hvad betyder anmeldelser for din placering i Google?",
      },
      {
        type: "p",
        html: "Anmeldelser indgår i, hvordan Google rangerer lokale virksomheder — men ikke kun som et gennemsnit. Tre ting tæller: <strong>hvor mange</strong> du har, <strong>hvor nye</strong> de er, og om der kommer nogle ind <strong>løbende</strong>.",
      },
      {
        type: "p",
        html: "Det betyder i praksis, at en jævn strøm slår en kampagne. Tredive anmeldelser på en uge og ingenting i et halvt år ser mistænkeligt ud og holder ikke din profil frisk. To om ugen året rundt gør begge dele.",
      },
      {
        type: "note",
        title: "Det er ikke kun Googles regler — det er også loven",
        html: 'I Danmark er det efter markedsføringslovens <strong>bilag 1, nr. 23b og 23c</strong> altid ulovligt at give et fordrejet billede af forbrugeranmeldelser eller at oplyse, at anmeldelser kommer fra rigtige kunder uden at have sikret sig, at de gør. At sortere de kritiske fra er derfor ikke bare imod Googles retningslinjer — det er en overtrædelse. <a href="/blog/flere-trustpilot-anmeldelser">Reglerne er de samme på Trustpilot</a>.',
      },
      {
        type: "faq",
        items: [
          {
            q: "Må jeg give rabat eller en gratis kaffe for en Google-anmeldelse?",
            a: "Nej. Google forbyder belønninger knyttet til anmeldelser, og i Danmark er det samtidig i strid med markedsføringsloven. Du må gerne belønne et genbesøg eller et køb — belønningen må bare ikke være knyttet til, at kunden skriver eller til hvad de skriver.",
          },
          {
            q: "Må jeg spørge mine kunder direkte om en anmeldelse?",
            a: "Ja. Det er både tilladt og den mest effektive metode. Det, du ikke må, er at vælge hvem du spørger ud fra, hvor tilfredse de er, eller at bede specifikt om en positiv anmeldelse.",
          },
          {
            q: "Hvor lang tid går der, før jeg kan se en effekt?",
            a: "De første anmeldelser kommer typisk inden for få dage, når barrieren først er væk. Effekten på din placering i det lokale søgeresultat tager længere — regn med nogle måneder med en jævn strøm, før billedet flytter sig mærkbart.",
          },
          {
            q: "Hvad gør jeg ved en falsk anmeldelse?",
            a: "Rapportér den til Google med en konkret begrundelse — for eksempel at anmelderen aldrig har været kunde, at anmeldelsen handler om en anden virksomhed, eller at den indeholder personangreb. Svar samtidig sagligt og offentligt, for behandlingstiden kan være lang, og svaret er det, kommende kunder ser i mellemtiden.",
          },
          {
            q: "Er det et problem kun at have femstjernede anmeldelser?",
            a: "Ja, det kan det være. Forbrugere er blevet gode til at genkende profiler, der ser for pæne ud, og mange læser bevidst de kritiske anmeldelser først. Et par velbesvarede treere gør din profil mere troværdig, ikke mindre.",
          },
          {
            q: "Hvor mange anmeldelser skal jeg have for at være konkurrencedygtig?",
            a: "Der findes ikke et fast tal — det afhænger af, hvad dine nærmeste konkurrenter har. Slå tre af dem op i Google Maps og se på både antal og dato for den seneste. Ofte er det friskheden, du hurtigst kan slå dem på.",
          },
        ],
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
    updated: "2026-08-23",
    readingMinutes: 7,
    excerpt:
      "En review-stander gør det nemt for kunder at anmelde din forretning med et enkelt tap eller scan. Her er alt du skal vide, før du vælger en.",
    image: "/blog/review-stander-qr-nfc.svg",
    imageAlt:
      "Reviewstander med QR-kode og NFC-felt, mens en telefon holdes hen til NFC-feltet",
    related: [
      "qr-kode-til-google-anmeldelser",
      "saadan-faar-du-flere-google-anmeldelser",
    ],
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
        html: 'At bede personalet spørge hver kunde er ustabilt: det bliver glemt i en travl periode, og mange kunder siger ja men gør det aldrig. En stander står der altid, ser professionel ud og virker på det rigtige tidspunkt — lige når kunden betaler. Vil du have flere metoder, så læs <a href="/blog/saadan-faar-du-flere-google-anmeldelser">sådan får du flere Google-anmeldelser</a>.',
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
        html: 'Der findes to modeller: en <strong>engangspris</strong> for selve standeren, og et <strong>abonnement</strong>, hvis du vil have dashboard, statistik og dynamiske links oveni. Hos LoyalSum starter en stander ved en enkel engangspris, og du kan opgradere til abonnement, når du vil have fuld indsigt. Se de tre niveauer på <a href="/produkter">produktsiden</a>.',
      },
      {
        type: "p",
        html: 'Vil du selv lave en gratis QR-kode først for at teste? Så læs vores <a href="/blog/qr-kode-til-google-anmeldelser">guide til QR-kode til Google-anmeldelser</a> — og se hvor grænserne går.',
      },
      {
        type: "h2",
        text: "Stander, klistermærke eller kort — hvad virker hvor?",
      },
      {
        type: "p",
        html: "En stander er ikke altid det rigtige. Formatet skal passe til, hvor kunden faktisk står stille:",
      },
      {
        type: "table",
        head: ["Format", "Bedst til", "Ulempe"],
        rows: [
          [
            "<strong>Stander</strong>",
            "Disken, receptionen, bordet — dér hvor kunden venter eller betaler",
            "Fylder plads og kan flyttes af personalet",
          ],
          [
            "<strong>Klistermærke</strong>",
            "Ruden, betalingsterminalen, et bord med lidt plads",
            "Overses let, ser hurtigt slidt ud",
          ],
          [
            "<strong>Kort i posen</strong>",
            "Take-away og webshop-ordrer, hvor kunden ikke står ved en disk",
            "Ses først hjemme, hvor øjeblikket er væk",
          ],
        ],
      },
      {
        type: "p",
        html: "Har du både en disk og take-away, virker de to godt sammen: standeren fanger dem, der venter, og kortet fanger dem, der går direkte ud ad døren.",
      },
      {
        type: "note",
        title: "Et krav der ikke må vælges fra",
        html: "Standeren må aldrig sortere kunderne efter tilfredshed — altså sende de glade til Google og de sure til en formular. Det er i strid med Googles og Trustpilots regler og med markedsføringslovens bilag 1. Det er tilladt at <em>tilbyde</em> begge veje samtidig og lade kunden vælge selv. Forskellen er, hvem der træffer valget.",
      },
      {
        type: "faq",
        items: [
          {
            q: "Virker NFC på alle telefoner?",
            a: "Næsten. Alle iPhones fra XR og frem samt langt de fleste Android-telefoner kan læse NFC uden at man skal åbne noget først. Derfor bør en stander altid have QR-kode også — så er der ingen kunder, der falder fra på teknikken.",
          },
          {
            q: "Hvad er forskellen på en statisk og en dynamisk QR-kode?",
            a: "En statisk kode indeholder selve linket, så skifter destinationen, skal alt genoptrykkes. En dynamisk kode peger på en adresse, du selv styrer, så du kan ændre hvor den fører hen — for eksempel fra Google til Trustpilot — uden at røre skiltet.",
          },
          {
            q: "Kan jeg lave en review-stander selv?",
            a: "Ja. Du kan lave en gratis QR-kode til din Google-profil og sætte den i en holder. Du får bare hverken NFC, statistik, mulighed for at ændre linket eller privat feedback. Til at teste, om kunderne overhovedet scanner, er det et fint sted at starte.",
          },
          {
            q: "Hvor skal standeren stå?",
            a: "Dér hvor kunden står stille med telefonen i hånden — typisk ved betalingen eller mens de venter. En stander på et bord, ingen sidder ved, eller ved udgangen, hvor folk er på vej ud, scannes stort set ikke.",
          },
          {
            q: "Skal jeg have en stander pr. afdeling?",
            a: "Ja, hvis du vil vide, hvor anmeldelserne kommer fra. Hver stander kan have sit eget link og sin egen statistik, så du kan se, om den ene butik samler anmeldelser og den anden ikke gør.",
          },
        ],
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
    updated: "2026-08-23",
    readingMinutes: 6,
    excerpt:
      "Du kan lave en gratis QR-kode til dine Google-anmeldelser på få minutter. Her er trinene — og de vigtige begrænsninger du bør kende.",
    image: "/blog/qr-kode-anmeldelser.svg",
    imageAlt:
      "QR-kode der scannes med en telefons kamera og fører direkte til virksomhedens anmeldelsesside",
    related: [
      "google-review-stander-guide",
      "saadan-faar-du-flere-google-anmeldelser",
    ],
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
        html: 'Vil du have QR + NFC, dynamiske links, statistik og privat feedback i én pæn stander, så tager en <a href="/blog/google-review-stander-guide">Google review-stander</a> over, hvor den gratis kode stopper. Og vil du have flere metoder til at få anmeldelser, så læs <a href="/blog/saadan-faar-du-flere-google-anmeldelser">sådan får du flere Google-anmeldelser</a>.',
      },
      { type: "h2", text: "Test koden, før du trykker den" },
      {
        type: "p",
        html: "Den dyreste fejl med en printet QR-kode er, at den er trykt i to hundrede eksemplarer, før nogen opdager, at den ikke virker. Fem minutters test sparer det:",
      },
      {
        type: "ol",
        items: [
          "Scan koden med <strong>både en iPhone og en Android</strong>. Kameraappen skal åbne linket direkte, uden at man skal trykke sig videre.",
          "Tjek at du lander i <strong>selve skrivefeltet</strong> — ikke på din profil, hvor kunden selv skal finde knappen.",
          "Print den i den <strong>faktiske størrelse</strong> og scan igen på afstand. En kode, der virker på skærmen, kan være for lille på et skilt.",
          "Scan den under den <strong>belysning, den kommer til at hænge i</strong>. Blank laminering under et spotlys kan gøre en kode ulæselig.",
        ],
      },
      {
        type: "note",
        title: "Undgå en genvej, der koster dig senere",
        html: "Nogle gratis generatorer laver koder, der peger på <em>deres</em> domæne og videresender derfra. Lukker tjenesten, eller begynder de at tage betaling, holder alle dine trykte koder op med at virke. Peger koden direkte på Google, kan det ikke ske — til gengæld kan linket så ikke ændres senere.",
      },
      {
        type: "faq",
        items: [
          {
            q: "Er det gratis at lave en QR-kode til Google-anmeldelser?",
            a: "Ja. Linket får du gratis i din Google Virksomhedsprofil, og der findes gratis generatorer, der laver koden. Vær opmærksom på, om generatoren laver en statisk kode eller en, der videresender via deres eget domæne — det sidste kan holde op med at virke.",
          },
          {
            q: "Hvor finder jeg mit Google-anmeldelseslink?",
            a: "Log ind på din Google Virksomhedsprofil og vælg &quot;Få flere anmeldelser&quot;. Google laver linket for dig, og det fører direkte til skrivefeltet. Du skal ikke selv bygge en adresse.",
          },
          {
            q: "Kan jeg ændre, hvor QR-koden fører hen, efter den er trykt?",
            a: "Kun hvis koden er dynamisk. En statisk kode indeholder selve linket og kan ikke ændres — skifter destinationen, skal alt genoptrykkes. En dynamisk kode peger på en adresse, du styrer, så du kan ændre målet uden at røre skiltet.",
          },
          {
            q: "Hvor stor skal QR-koden være?",
            a: "En tommelfingerregel er, at koden skal være mindst en tiendedel så bred som den afstand, den skal scannes fra. Til et skilt på en disk er 3-4 cm rigeligt. Test altid i den faktiske størrelse, før du trykker et oplag.",
          },
          {
            q: "Hvad skal der stå ved siden af koden?",
            a: "En kort, neutral opfordring, der siger hvad der sker, og hvor lang tid det tager — for eksempel &quot;Fortæl hvordan det gik — scan her&quot;. Undgå formuleringer, der beder om en positiv anmeldelse; det er i strid med både Googles regler og markedsføringsloven.",
          },
        ],
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

/** Artiklens overskrifter, til indholdsfortegnelsen. */
export function overskrifter(post: BlogPost): { id: string; text: string }[] {
  return post.body
    .filter((b): b is { type: "h2"; text: string } => b.type === "h2")
    .map((b) => ({ id: overskriftId(b.text), text: b.text }));
}

/**
 * Alle FAQ-spørgsmål i artiklen, samlet.
 *
 * Trækkes UD af brødteksten frem for at stå i et selvstændigt felt, så
 * strukturdataene ikke kan komme til at love Google noget, siden ikke viser.
 * Google betragter det som spam, hvis `FAQPage` beskriver spørgsmål,
 * læseren ikke kan finde på siden.
 */
export function faqItems(post: BlogPost): { q: string; a: string }[] {
  return post.body.flatMap((b) => (b.type === "faq" ? b.items : []));
}

/** Beslægtede artikler, opslået og renset for slugs der ikke findes. */
export function relaterede(post: BlogPost): BlogPost[] {
  return (post.related ?? [])
    .map((s) => getPost(s))
    .filter((p): p is BlogPost => Boolean(p) && p!.slug !== post.slug);
}

/** Formatér ISO-dato som dansk dato, fx "6. juli 2026". */
export function formatBlogDate(iso: string): string {
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
