import { Logo } from "@/components/brand";
import { HeaderKonto } from "@/components/header-konto";
import { HeaderNav } from "@/components/header-nav";
import { type NavLink } from "@/components/mobile-nav";

/**
 * Platform først: LoyalSum er en samlet platform, og reviewstanderen er ét
 * produkt i den — ikke omvendt. Deles med mobilmenuen, så de to navigationer
 * ikke kan komme ud af trit.
 */
const NAV_LINKS: NavLink[] = [
  { href: "/#platform", label: "Platform" },
  { href: "/stempelkort", label: "Stempelkort" },
  /*
   * LOYALITETSPROGRAMMET STÅR VED SIDEN AF STEMPELKORTET, fordi det er de to
   * former, en butik vælger imellem — og kun den ene havde en vej hertil fra
   * menuen. Siden fandtes, men blev kun linket fra footeren og fra brødtekst,
   * så den form, en forretning med sjældne eller ujævne køb skal bruge, lå et
   * klik længere væk end den anden.
   *
   * ETIKETTEN ER SIDENS EGET SØGEORD ("loyalitetsprogram") og ikke det
   * kortere "Pointprogram": menuen står på hver eneste side, så det er den
   * kraftigste interne henvisning, vi har — og den skal pege med det ord,
   * siden gerne vil findes på.
   */
  { href: "/loyalitetsprogram", label: "Loyalitetsprogram" },
  { href: "/reviewstander", label: "Reviewstander" },
  { href: "/produkter", label: "Priser" },
  /*
   * BLOGGEN STÅR KUN I FOOTEREN, og det er et valg om, hvad menuen er til.
   * Hovedmenuen er vejen til det, man kan KØBE — de to loyalitetsformer,
   * standeren, priserne og os. Bloggen er nitten artikler, der skal findes
   * fra en søgning, ikke fra en købers menu, og den lå mellem "Priser" og
   * "Kontakt" og delte dem ad.
   *
   * DEN MISTER INGEN LINKVÆRDI: footeren står på hver eneste side, præcis
   * som menuen, så bloglisten har lige så mange indgående interne links som
   * før — og artiklerne linker indbyrdes (se `blog.test.ts`, hvor ingen
   * artikel må være et blad).
   *
   * DET GIVER OGSÅ LUFTEN TILBAGE: menuen bar syv punkter, og det syvende
   * kostede så meget plads, at LOGOET krympede fra 204 til 86 px mellem
   * 1024 og 1199 px — se AGENTS.md. Seks punkter er under den grænse igen.
   */
  { href: "/kontakt", label: "Kontakt" },
];

/**
 * HEADEREN LÆSER IKKE LÆNGERE SESSIONEN — og det er derfor, ti
 * marketingsider nu kan være statiske. Det ene `getCurrentUser()`, der stod
 * her, gjorde hver eneste side, der bærer headeren, dynamisk og dermed
 * `no-store`. Begrundelsen og de tre valg bag opdelingen står i
 * `HeaderKonto`; her er kun tilbage, at komponenten IKKE er `async` — bliver
 * den det igen, forsvinder gevinsten uden at nogen opdager det, og
 * `statiske-sider.test.ts` er sat til at fejle netop dér.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-dark/90 text-dark-fg backdrop-blur">
      <div className="mx-auto flex h-[90px] max-w-side items-center justify-between px-4">
        <Logo image="light" className="-translate-y-[6px]" prioritet />

        {/* Skiftet sker ved lg, ikke md: logo + links + to knapper kan ikke
            være der på en 768px-tablet uden at brække.

            OG MELLEM lg OG xl ER DER SMALLERE LUFT OG MINDRE SKRIFT. Med
            "Loyalitetsprogram" som syvende punkt rakte bredden ikke længere
            ved 1024-1199: flex krympede LOGOET frem for at bryde, så bomærket
            lå oven i det første menupunkt — en fejl, man kun ser ved at måle
            eller kigge, for ingenting stak uden for headeren. Alternativet var
            at skjule hele menuen indtil 1280 og sende en 13" bærbar over i
            burgeren; det koster mere end to punkter mindre luft. Målt igen ved
            1024, 1100, 1200, 1280, 1440 og 1920. */}
        {/* MENUEN VISER NU, HVOR MAN ER. Den havde ingen markering
            overhovedet, så en besøgende på /stempelkort kunne ikke se sin
            egen placering — samme mangel, dashboardets menu havde, før den
            fik `aria-current`. Markeringen er en svag hvid flade og ikke en
            understregning: en streg på 1-2 px forsvinder mod den lyse hero
            nedenunder. Se `HeaderNav` for hvorfor den må være en
            klientkomponent uden at koste sidens statiske gengivelse. */}
        <HeaderNav links={NAV_LINKS} />

        <HeaderKonto links={NAV_LINKS} />
      </div>
    </header>
  );
}
