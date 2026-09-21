import Image from "next/image";
import { Stars } from "@/components/ui/stars";
import { cn } from "@/lib/utils";

/**
 * Kundens stempelkort, tegnet.
 *
 * EGEN KOMPONENT, fordi den bruges to steder: i forsidens hero med
 * notifikationerne omkring, og på `/stempelkort` uden dem. Kopieret ind ét
 * sted mere ville betyde, at et rettet kort kun blev rettet det ene sted —
 * samme regel som brancheikonerne.
 *
 * Den er DEKORATION og `aria-hidden`: overskriften ved siden af bærer
 * betydningen, og en skærmlæser skal ikke læse ti tal op.
 *
 * Bemærk `text-foreground`: begge brugssteder er mørke sektioner, der sætter
 * hvid tekst, og uden den arves hvid ned i det hvide kort.
 */
export function StempelkortVisual({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        /*
        KORTET I HEROEN ER DET NÆRMESTE, VI KOMMER PÅ ET PRODUKTFOTO I CSS.
        Ét bredt, sort lag er en drop shadow. I vores eget produktfoto ligger
        den bærbare med en stram kant tæt på bordpladen OG en lang, varm
        skygge under — tre lag, tonet mod #6b5f57 og ikke mod sort, fordi en
        sort skygge på en varm flade bliver grå og beskidt.

        Den lyse inderkant foroven er dét, der gør kortet til et emne med lys
        på: i fotoet fanger skærmens overkant vinduet.
      */
      "box-shape select-none bg-white p-6 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(107,95,87,0.12),0_22px_40px_-16px_rgba(0,0,0,0.45),0_50px_80px_-30px_rgba(0,0,0,0.5)]",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-dark text-sm font-bold text-white">
          CA
        </span>
        <div>
          <p className="text-sm font-bold tracking-tight">Café Aurora</p>
          <p className="text-xs text-muted">Dit stempelkort</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => {
          const filled = i < 7;
          return (
            <div
              key={i}
              className={
                filled
                  ? "grid aspect-square place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg"
                  : "grid aspect-square place-items-center rounded-full border border-border text-[11px] font-medium text-muted"
              }
            >
              {filled ? "★" : i + 1}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs text-muted">7 af 10 stempler</span>
        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
          Gratis kaffe
        </span>
      </div>
    </div>
  );
}

/**
 * Hero-visualisering af HELE platformen — ikke af standeren.
 *
 * Kompositionen er bevidst holdt til ét hovedelement (kundens kort) med to
 * små notifikationer omkring. Det skal aflæses på et sekund som "anmeldelser
 * + loyalitet i ét system", uden at blive et rodet collage.
 */
/**
 * Forsidens hero-visual.
 *
 * DET ER TO RIGTIGE FOTOGRAFIER OG IKKE EN TEGNING — OG DET ER SELVE
 * BUDSKABET. Heroen bar før `StempelkortVisual`, altså husets egen tegning af
 * et stempelkort. Den er præcis og ærlig, men den viser ÉN funktion, mens
 * sætningen ved siden af lover en platform; og en tegning på det første, en
 * besøgende ser, læses som en illustration af et produkt frem for som
 * produktet.
 *
 * Designreferencerne gør det modsatte hele vejen igennem: fotografi af de
 * faktiske ting på et bord — skærm, telefon, skilt — med blødt dagslys.
 * Begge filer her er husets EGNE produktfotos og fandtes i forvejen; der er
 * ikke lavet nye billeder, og der er ikke tegnet en stander.
 *
 * DE TO LAG SIGER HVER SIN HALVDEL AF SÆTNINGEN:
 *   bagest  `loyalsum-komplet-online-dashboard-og-mobil.jpg` — platformen,
 *           altså dashboardet på en skærm og kundens kort på en telefon
 *   forrest `reviewstander-cafe-komplet.jpg` — det fysiske skilt på disken
 * Sammen er de "én platform, fysisk og digital", uden at en eneste ny
 * funktion er påstået.
 *
 * DET FORRESTE BILLEDE BRYDER DET BAGESTES KANT med vilje. Lagt ved siden af
 * hinanden ville de være to billeder; når det ene overlapper, bliver de til
 * én scene med dybde — det greb, referencerne bruger i hver eneste hero.
 *
 * `priority` KUN PÅ DET BAGESTE. Det er sidens LCP-element; det forreste er
 * mindre og må gerne komme bagefter. Begge har faste mål gennem
 * `aspect`-forholdet på beholderen, så heroen ikke hopper, når de lander.
 */
export function HeroVisual() {
  return (
    <div
      className="relative mx-auto w-full max-w-[34rem] select-none"
      aria-hidden="true"
    >
      {/* PLATFORMEN — det bagerste og største lag. */}
      <div className="relative overflow-hidden rounded-[var(--radius-stor)] shadow-[var(--hoejde-foto)] ring-1 ring-white/12">
        <Image
          src="/loyalsum-komplet-online-dashboard-og-mobil.jpg"
          alt=""
          width={1120}
          height={747}
          sizes="(min-width: 1024px) 34rem, 92vw"
          priority
          className="h-auto w-full"
        />
      </div>

      {/* SKILTET — det forreste lag, forskudt ud over kanten forneden. */}
      <div className="absolute -bottom-8 -left-4 w-[46%] overflow-hidden rounded-[var(--radius-shape)] shadow-[var(--hoejde-3)] ring-1 ring-white/20 sm:-left-10">
        <Image
          src="/reviewstander-cafe-komplet.jpg"
          alt=""
          width={560}
          height={560}
          sizes="(min-width: 1024px) 16rem, 44vw"
          className="h-auto w-full"
        />
      </div>

      {/*
        ÉN CHIP OG IKKE TRE. Den flydende notifikation er referencernes eget
        greb, men to af dem oven på to fotografier bliver til rod. Stjernerne
        er den ene ting, hele sitet handler om at få flere af.
      */}
      <div className="absolute right-3 -top-5 lg:-right-7">
        {/* `text-foreground` er nødvendig: heroen sætter `text-dark-fg`
            (hvid), som ellers arves ned i den hvide chip. */}
        <div className="btn-shape flex items-center gap-2 bg-white px-3.5 py-2 text-foreground shadow-[0_2px_5px_rgba(8,48,60,0.16),0_18px_34px_-14px_rgba(0,0,0,0.5)]">
          <Stars value={5} size={13} />
          <span className="text-xs font-semibold tracking-tight">
            Ny anmeldelse
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Kundens anmeldelsesside, tegnet.
 *
 * SIDESTYKKE TIL `StempelkortVisual` og ligger i samme fil, fordi de to er
 * det samme greb: en tegning af den skærm, slutkunden faktisk får. Skilles
 * de ad, driver de fra hinanden i form og skygge, og de to heroer holder op
 * med at ligne det samme produkt.
 *
 * DEN VISER "actions"-TRINNET, og det er ikke et valg for at få mest muligt
 * med: `review-flow.tsx` viser netop stjerner OG valg samtidig, når kunden
 * har sat sin bedømmelse. En tegning, der satte dem på hver sin skærm, ville
 * love et flow, produktet ikke har.
 *
 * DE TRE VALG HAR SAMME VÆGT, og det er hele pointen — se `reviewChoices()`
 * i review-flow.ts. Gør du ét af dem større her, tegner forsiden review
 * gating, som produktet er bygget for ikke at gøre.
 */
export function AnmeldelseVisual({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        /*
        KORTET I HEROEN ER DET NÆRMESTE, VI KOMMER PÅ ET PRODUKTFOTO I CSS.
        Ét bredt, sort lag er en drop shadow. I vores eget produktfoto ligger
        den bærbare med en stram kant tæt på bordpladen OG en lang, varm
        skygge under — tre lag, tonet mod #6b5f57 og ikke mod sort, fordi en
        sort skygge på en varm flade bliver grå og beskidt.

        Den lyse inderkant foroven er dét, der gør kortet til et emne med lys
        på: i fotoet fanger skærmens overkant vinduet.
      */
      "box-shape select-none bg-white p-6 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(107,95,87,0.12),0_22px_40px_-16px_rgba(0,0,0,0.45),0_50px_80px_-30px_rgba(0,0,0,0.5)]",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-dark text-sm font-bold text-white">
          CA
        </span>
        <div>
          <p className="text-sm font-bold tracking-tight">Café Aurora</p>
          <p className="text-xs text-muted">Del din oplevelse</p>
        </div>
      </div>

      <p className="mt-5 text-center text-sm font-medium">
        Hvordan var din oplevelse?
      </p>
      <div className="mt-2 flex justify-center">
        <Stars value={5} size={30} />
      </div>

      <p className="mt-5 text-center text-sm font-medium">
        Hvad vil du gøre nu?
      </p>
      <div className="mt-2 space-y-2">
        {["Anmeld os på Google", "Anmeld os på Trustpilot", "Skriv til os"].map(
          (valg) => (
            <div
              key={valg}
              /*
                `min-h-11` OG IKKE `h-11`, OG MED SIDEPOLSTRING.
                Med fast højde og uden polstring brød "Anmeld os på
                Trustpilot" ud af pillen, i samme øjeblik kortet blev
                smallere — set på /reviewstander, da standerfotoet kom ind
                ved siden af. En pille med fast højde kan ikke bære en linje,
                der ombrydes, og en pilles runde ender æder teksten, hvis der
                ingen polstring er.
              */
              className="btn-shape grid min-h-11 place-items-center bg-accent px-4 py-2 text-center text-sm font-medium leading-tight text-accent-fg"
            >
              {valg}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
