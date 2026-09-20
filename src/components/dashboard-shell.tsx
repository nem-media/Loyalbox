import Link from "next/link";
import { Logo } from "@/components/brand";
import { signout } from "@/app/(auth)/actions";
import { lukSupportAdgang } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { SearchIcon } from "@/components/nav-icons";
import { DashboardNav, type NavSection } from "@/components/dashboard-nav";
import { cn } from "@/lib/utils";

export type { NavItem, NavSection } from "@/components/dashboard-nav";

export function DashboardShell({
  sections,
  email,
  roleLabel,
  companyName,
  quickAction,
  support,
  children,
}: {
  sections: NavSection[];
  email: string;
  roleLabel: string;
  companyName?: string | null;
  /** Den daglige handling. Udelades, hvis virksomheden ikke har stempelkort. */
  quickAction?: { href: string; label: string };
  /**
   * Ser en ADMIN på en kundes dashboard?
   *
   * Banneret er ikke pynt. Skærmen er ellers kundens i ét og alt, og den
   * eneste forskel er, hvem der sidder foran den — det er præcis den slags,
   * man glemmer efter to minutter. Advarslen står øverst på HVER side og
   * bærer vejen tilbage, så man ikke skal finde den.
   */
  support?: { companyName: string } | null;
  children: React.ReactNode;
}) {
  const initialer = (companyName ?? email).trim().slice(0, 2).toUpperCase();

  return (
    /* `app-flade` gør panelets neutraler kølige og fjerner den creme grund —
       se globals.css. Den sidder YDERST, så sidebjælken følger med; ligger
       den kun på indholdet, får menuen beige streger ved siden af grå. */
    <div className="app-flade flex min-h-screen flex-col md:flex-row">
      {/*
        MENUEN ER LYS OG IKKE MØRK, OG DET ÆNDRER HVAD DER BÆRER DYBDEN.
        Den mørke menu var det eneste element på skærmen med en grund at stå
        på, og den løste dermed et problem, kortene havde: de lå ikke PÅ
        noget. Det problem er løst et andet sted nu — grunden er råhvid,
        kortene hvide, og højdeskalaen løfter dem fri.

        Tilbage stod en sort spalte ved siden af en lys flade, altså to
        systemer klistret sammen. Menuen er derfor hvid med en fin streg og
        en meget lav skygge indad mod indholdet: den bliver stadig læst som
        et lag foran, men nu i samme materiale som resten.
      */}
      {/*
        MENUEN FØLGER MED NED, OG DEN SKAL DERFOR HAVE SIN EGEN HØJDE.
        Et flex-element strækker sig som udgangspunkt til hele rækkens højde
        — altså hele sidens. `position: sticky` har intet at klæbe med, når
        elementet allerede er lige så højt som det, der rulles: `top-0`
        rammer aldrig. `md:h-screen` er dét, der gør menuen til en spalte på
        skærmhøjde i stedet, og først dér virker klæbningen.

        RULNINGEN LIGGER INDE I MENUEN OG IKKE UDEN OM. Ti punkter, to
        gruppeoverskrifter, logo, genvej og brugerblokken er omkring 750 px.
        Det går på en fuld skærm, men IKKE på en bærbar med 768 px i højden,
        hvor der er cirka 640 px tilbage til siden — og uden `overflow-y-auto`
        ville Log ud og brugerblokken være skåret af med ingen måde at nå dem
        på. Det er den bærbare, personalet står med, ikke skærmen her.

        KUN FRA `md`. På mobil ligger menuen vandret øverst og bærer ALLE
        punkter i en rulbar stribe; klæbede den, ville den tage en tredjedel
        af en telefonskærm på hver eneste side.
      */}
      <aside className="menu-rul flex shrink-0 flex-col border-b border-border bg-card md:sticky md:top-0 md:h-screen md:w-64 md:overflow-y-auto md:border-b-0 md:border-r md:shadow-[1px_0_0_rgba(30,28,26,0.02),4px_0_24px_-12px_rgba(30,28,26,0.08)]">
        <div className="flex items-center justify-between p-4 md:pb-6">
          <Logo image="dark" prioritet className="shrink-0" />

          {/* På mobil er brugerblokken i bunden skjult, og dermed var der
              INGEN vej ud af sin egen konto på en telefon. Niveau og Log ud
              står derfor her, hvor der er plads. */}
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            {/*
              PAKKENAVNET KAN VÆRE LANGT — "LoyalSum Komplet Online" er 23
              tegn, hvor der før stod "Pro". `title` bærer hele navnet, og
              det fulde står under Abonnement; her er pladsen delt med
              logoet og Log ud på en telefonskærm.
            */}
            <Badge tone="accent" className="min-w-0" title={roleLabel}>
              <span className="truncate">{roleLabel}</span>
            </Badge>
            <form action={signout}>
              <button className="btn-shape px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-accent-tint hover:text-accent">
                Log ud
              </button>
            </form>
          </div>
        </div>

        {/* Den hyppigste handling i en travl hverdag: find kunden, giv
            stemplet. Den lå tre klik nede under Stempelkort → Kunder → søg. */}
        {/* Vises OGSÅ på mobil: det er ved disken med en telefon i hånden, at
            personalet skal finde en kunde. Den var skjult netop dér, hvor den
            er mest værd. */}
        {quickAction ? (
          <div className="px-3 pb-2 md:pb-1">
            <Link
              href={quickAction.href}
              className="knap-flade btn-shape flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-accent-fg transition-all duration-200 hover:-translate-y-px"
            >
              <SearchIcon className="h-[18px] w-[18px]" />
              {quickAction.label}
            </Link>
          </div>
        ) : null}

        <DashboardNav sections={sections} />

        {/* LIGGER EFTER SIDSTE MENUPUNKT og ikke i bunden af skærmen.
            Med `mt-auto` blev blokken skubbet helt ned, så der på en høj
            skærm stod et stort tomt felt mellem "Hjælp" og brugeren — og
            afstanden flyttede sig, hver gang menuen skiftede længde. Nu
            følger den menuen.

            Vandret polstring holdes på 3 som menupunkternes, så navnet står
            på linje med dem. Kun luften over og under er øget. */}
        <div className="mt-6 hidden border-t border-border px-3 pb-3 pt-4 md:block">
          <div className="flex items-center gap-2.5 px-1">
            <span
              aria-hidden="true"
              className="ikon-felt grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-accent"
            >
              {initialer}
            </span>
            <div className="min-w-0">
              {companyName ? (
                <p className="truncate text-sm font-medium text-dark">
                  {companyName}
                </p>
              ) : null}
              <p className="truncate text-xs text-muted">{email}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <Badge tone="neutral" className="min-w-0" title={roleLabel}>
              <span className="truncate">{roleLabel}</span>
            </Badge>
            <form action={signout}>
              <button className="btn-shape px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-accent-tint hover:text-accent">
                Log ud
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* `bg-app-bg` og ikke `bg-background`: kortene er hvide, så grunden
          skal være noget andet end hvid, ellers ligger de ikke PÅ noget. */}
      {/*
        `min-w-0` ER DEN ENE KLASSE, DER HOLDER PANELET INDEN FOR SKÆRMEN.
        `<main>` er et flex-element, og et flex-element har `min-width: auto`
        — altså mindst så bredt som sit eget indhold. Indholdet rummer tabeller
        med `min-w-[34rem]`, så hovedspalten voksede til 622 px ved siden af en
        menu på 256, og HELE panelet kunne skubbes vandret ved 768 px (målt i
        produktion: scrollWidth 862 mod 768 — fejlen er ældre end redesignet).

        Med `min-w-0` må spalten blive smallere end sit indhold, og så træder
        tabellens egen vandrette scroll i kraft, præcis som den er bygget til.
        Det er ét sted og gælder hver eneste side i dashboardet.
      */}
      <main id="indhold" className="panel min-w-0 flex-1 bg-app-bg">
        {/*
          SUPPORTBANNERET LIGGER UDEN FOR max-w-5xl og i fuld bredde, så det
          ikke kan forveksles med sidens eget indhold. Det er en advarsel om,
          hvem man er — ikke en besked i dashboardet.
        */}
        {support ? (
          <div className="border-b border-secondary/50 bg-secondary/15 px-4 py-3 md:px-8">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                <strong className="font-bold">
                  Du ser {support.companyName} som ADMIN.
                </strong>{" "}
                <span className="text-muted">
                  Du er stadig dig selv — ikke kunden. Din adgang er noteret i
                  admin-loggen, og de handlinger, du foretager, står med dit
                  navn.
                </span>
              </p>
              <form action={lukSupportAdgang}>
                <button className="btn-shape shrink-0 border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted-bg">
                  Tilbage til admin
                </button>
              </form>
            </div>
          </div>
        ) : null}
        <div className="mx-auto max-w-5xl p-4 md:p-10">{children}</div>
      </main>
    </div>
  );
}

/**
 * En gruppe indhold med et navn.
 *
 * HVORFOR DEN FINDES: sektionsgrænserne eksisterede allerede — som
 * KOMMENTARER. `admin/page.tsx` skrev "det der kræver dig" og "baggrundstal"
 * i koden, og oversigten viste dem som én flad stak kort i samme vægt.
 * Følte udvikleren behovet for at gruppere, har læseren det også.
 *
 * Etiketstilen frem for en overskrift: en sektion skal kunne SPRINGES OVER
 * med øjet. Blev den sat i samme vægt som sidens h1, ville den konkurrere med
 * det, den grupperer.
 *
 * Den grønne markør er accenten brugt til STRUKTUR. Før bar den kun links og
 * én knap — en brandfarve, der ikke holder nogen flade, læses ikke som en
 * brandfarve, og det er halvdelen af grunden til, at panelet virkede monotont.
 */
export function Sektion({
  titel,
  link,
  id,
  className,
  children,
}: {
  titel: string;
  /** "Se alle"-vejen ud af gruppen. */
  link?: { href: string; label: string };
  /** Ankernavn, så en gammel rute kan sende folk direkte ned til gruppen. */
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("mt-10 scroll-mt-6", className)}>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <h2 className="etiket flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-3.5 w-1 shrink-0 rounded-full bg-gradient-to-b from-accent-lys to-accent"
          />
          {titel}
        </h2>
        {link ? (
          <Link
            href={link.href}
            className="shrink-0 text-xs font-medium text-accent hover:underline"
          >
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    // Stregen under sidehovedet er ikke pynt: uden den startede indholdet
    // koldt, og overskriften flød sammen med det første kort. Nu er der en
    // tydelig zone at læse først.
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div>
        {/* Navy, samme farve som menuen. Se `CardTitle` for hvorfor. */}
        {/* SIDETITLEN SKAL HAVE VÆGT. 2xl/bold ved siden af et nøgletal i
            2,5rem gjorde tallet til sidens overskrift og overskriften til en
            mellemrubrik. 1,75rem og en strammere bogstavafstand giver den
            autoriteten tilbage uden at blive en plakat — det er et panel,
            man arbejder i, ikke en forside. */}
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-dark">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
