import { IkonChip, type ChipFarve } from "@/components/ui/ikon-chip";
import {
  StjerneDuo,
  FeedbackDuo,
  GenbesoegDuo,
  OpslagDuo,
} from "@/components/duotone-ikoner";
import { StarIcon } from "@/components/illustrations";

/**
 * LoyalSum-loopet.
 *
 * DET ER SITETS SIGNATURGRAFIK, og indtil nu var det fire kort på en række
 * med en pil imellem. En RÆKKE er en rækkefølge, ikke en cyklus: øjet løber
 * fra venstre mod højre og stopper, og sektionen måtte derfor forklare med
 * ord ("Og så forfra…"), at det gik rundt. Designreferencerne tegner det i
 * stedet som en RING om husets mærke, og dét er hele pointen sagt på én gang.
 *
 * TEKSTEN ER UÆNDRET. Trinnenes navne og brødtekst er sitets egne — "Bliv
 * fundet / Forstå oplevelsen / Få dem tilbage / Voks videre" — og ikke
 * referencernes ("Anmeldelser / Feedback / Loyalitet / Synlighed"). Vores
 * ord siger, hvad forretningen FÅR, hvor referencernes siger, hvad
 * funktionen hedder; det er den eneste af de to, der er et løfte.
 *
 * DIAMANTEN ER ET 3×3-GITTER OG IKKE FIRE ABSOLUTTE POSITIONER. Et kort
 * placeret med `absolute` skal have sin plads regnet ud for hver bredde, og
 * det er dér, en cirkulær figur normalt går i stykker mellem 1024 og 1280.
 * Her ligger trinene i gitterets N, Ø, S og V, mærket i midten, og hele
 * figuren falder sammen til én spalte under `lg` af sig selv.
 *
 * PÅ MOBIL ER DET EN STAK OG IKKE EN RING. En ring på 390 px gør kortene så
 * små, at brødteksten ikke kan læses — og brødteksten er dét, der sælger.
 * Cyklussen bæres dér af den lodrette pil og af ringpilen til sidst.
 *
 * `<ol>` OG IKKE `<div>`: rækkefølgen er virkelig. En cyklus har stadig et
 * sted, den begynder, og en skærmlæser skal kunne høre "1 af 4".
 */

const STEPS: {
  label: string;
  body: string;
  Ikon: React.ComponentType<{ className?: string }>;
  farve: ChipFarve;
}[] = [
  {
    label: "Bliv fundet",
    body: "Flere anmeldelser og løbende synlighed hjælper nye kunder med at opdage og vælge din forretning.",
    Ikon: StjerneDuo,
    farve: "guld",
  },
  {
    label: "Forstå oplevelsen",
    body: "Kunderne deler nemt deres oplevelse — offentligt eller privat til dig, så du kan følge op.",
    Ikon: FeedbackDuo,
    farve: "violet",
  },
  {
    label: "Få dem tilbage",
    /* BEGGE FORMER, også når linjen er kort. Trinnet er hele svaret på
       "hvordan får jeg dem tilbage?", og et stempelkort alene er halvdelen:
       en forretning, hvor kunderne kommer sjældent og køber for forskellige
       beløb, er præcis den, pointprogrammet findes til. */
    body: "Digitale stempelkort og pointprogrammer med belønninger giver kunderne en grund til at komme igen.",
    Ikon: GenbesoegDuo,
    farve: "accent",
  },
  {
    label: "Voks videre",
    body: "Opslag og indsigt holder dig synlig og viser dig, hvad der rent faktisk virker.",
    Ikon: OpslagDuo,
    farve: "blaa",
  },
];

/** Pladsen i diamanten. Rækkefølgen følger STEPS og går med uret. */
const PLADS = [
  "lg:col-start-2 lg:row-start-1",
  "lg:col-start-3 lg:row-start-2",
  "lg:col-start-2 lg:row-start-3",
  "lg:col-start-1 lg:row-start-2",
];

function Pil({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

/**
 * Ringen om mærket.
 *
 * DEN GÅR OM MIDTEN OG IKKE FRA KORT TIL KORT. Første udgave trak en bue
 * mellem hvert nabopar og strakte SVG'en med `preserveAspectRatio="none"`, så
 * buerne fulgte gitteret. To ting gik i stykker af det: en strakt cirkel er
 * en ellipse, så de fire buer havde hver sin krumning, og en `marker` bliver
 * strakt med — pilespidserne forsvandt helt. Målt på et skud ved 1440: fire
 * tynde streger uden retning, altså pynt frem for et loop.
 *
 * Nu er det ét KVADRAT, centreret bag mærket, med `xMidYMid meet`. Cirklen
 * er en cirkel, spidserne peger den rigtige vej, og buerne løber mellem
 * kortene i stedet for bag dem — præcis som i designreferencerne, hvor
 * pilene omkranser midten og ikke forbinder kasserne.
 *
 * Kun fra `lg`: under den bredde er trinene en stak, og en ring bag en stak
 * er en streg, der krydser tekst.
 */
function Ring() {
  /* Fire kvartbuer om (50,50) med radius 38, hver med et hul i enderne, så
     de ikke støder sammen. Vinklerne er valgt, så åbningerne vender mod
     kortene — en lukket cirkel ville skære gennem dem. */
  const buer = [
    "M 76.1 62.0 A 38 38 0 0 1 62.0 76.1",
    "M 38.0 76.1 A 38 38 0 0 1 23.9 62.0",
    "M 23.9 38.0 A 38 38 0 0 1 38.0 23.9",
    "M 62.0 23.9 A 38 38 0 0 1 76.1 38.0",
  ];
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 hidden aspect-square w-[min(44%,24rem)] -translate-x-1/2 -translate-y-1/2 lg:block"
    >
      <defs>
        <marker
          id="loop-spids"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto"
        >
          <path d="M0 1 L8 5 L0 9 z" fill="var(--accent-lys)" />
        </marker>
      </defs>
      {buer.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke="var(--accent-lys)"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.75"
          markerEnd="url(#loop-spids)"
        />
      ))}
    </svg>
  );
}

export function LoyalsumLoop() {
  return (
    <div className="mx-auto max-w-5xl">
      {/*
        RINGEN CENTRERES PÅ DIAMANTEN OG IKKE PÅ BLOKKEN.
        Den lå før i den ydre beholder, som OGSÅ rummer "Og så forfra"-linjen
        forneden — så dens midte blev regnet ud af en kasse, der var højere
        end figuren. MÅLT ved 1440: stjernens midte lå i 2320, ringens i
        2359, altså 39 px for lavt, og de fire buer stod skævt om et
        midtpunkt, der ikke var der.

        Nu ligger den inde i den samme kasse som gitteret, så de to kan ikke
        komme fra hinanden igen, uanset hvad der står under figuren.
      */}
      <div className="relative">
        <Ring />

        <ol className="relative grid gap-5 lg:grid-cols-3 lg:grid-rows-3 lg:gap-x-10 lg:gap-y-8">
        {STEPS.map((s, i) => (
          <li
            key={s.label}
            className={`relative flex flex-col ${PLADS[i]}`}
          >
            <div className="box-shape h-full border border-border bg-card p-5 shadow-[var(--hoejde-2)]">
              <div className="flex items-start gap-3">
                {/*
                  FYLDTE FELTER HER, OG DET ER IKKE ET BRUD PÅ REGLEN.
                  `ikon-felt-fyldt` er forbeholdt ÉT ikon ad gangen, fordi
                  fire ens turkise flader på række er præcis de "store flade
                  felter", der skulle væk. De fire her har hver sin datafarve,
                  så de læses som fire TYPER og ikke som et mønster — og på
                  en marketingflade er det netop mætningen, der giver
                  figuren den vægt, referencerne har.
                */}
                <IkonChip
                  icon={s.Ikon}
                  size="lg"
                  tone="fyldt"
                  farve={s.farve}
                />
                <div className="min-w-0">
                  <h3 className="text-base font-bold tracking-tight">
                    {s.label}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {s.body}
                  </p>
                </div>
              </div>
            </div>

            {/* Pilen bærer cyklussen på mobil, hvor ringen ikke tegnes. */}
            {i < STEPS.length - 1 ? (
              <Pil className="mx-auto mt-3 h-5 w-5 shrink-0 text-accent/45 lg:hidden" />
            ) : null}
          </li>
        ))}

        {/*
          MÆRKET I MIDTEN.
          Det er dét, de fire trin hænger sammen OM, og uden det er figuren
          fire kort i en firkant. Stjernen er logoets egen (`StarIcon`), så
          der ikke står to forskellige stjerner på samme side — se reglen om
          ikonsæt i AGENTS.md.

          `aria-hidden`: navnet står i sektionens overskrift lige over, og en
          skærmlæser skal ikke høre "LoyalSum" en gang til midt i en liste.
        */}
        <li
          aria-hidden="true"
          className="hidden lg:col-start-2 lg:row-start-2 lg:grid lg:place-items-center"
        >
          <div className="relative grid h-28 w-28 place-items-center">
            <span
              className="absolute inset-0 rounded-full blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--accent-lys) 42%, transparent) 0%, transparent 70%)",
              }}
            />
            <span className="ikon-felt-fyldt relative grid h-20 w-20 place-items-center rounded-full">
              {/* FYLDT og ikke en kontur: ved 36 px forsvinder en streg på 1,7
                  px ind i gradienten bagved, og mærket blev en mørk kugle.
                  Kurven er `StarIcon`s egen — to forskellige stjerner på én
                  side er dét, der får et ikonsæt til at ligne noget klippet
                  sammen. */}
              <StarIcon className="h-9 w-9 fill-white text-white" />
            </span>
          </div>
        </li>
        </ol>
      </div>

      {/*
        LINJEN BLIVER — men den forklarer ikke længere figuren, den uddyber
        den. Ringen SIGER allerede, at det går rundt; teksten siger, hvad
        "rundt" betyder for forretningen. Stod den ikke her, ville løftet kun
        findes som en pil.
      */}
      <div className="mt-8 flex items-center gap-3 rounded-full border border-accent/25 bg-accent/5 px-5 py-3">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 shrink-0 text-accent"
          aria-hidden="true"
        >
          <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
        <p className="text-sm text-foreground/80">
          <span className="font-semibold">Og så forfra:</span> flere gode
          oplevelser giver flere anmeldelser og mere synlighed — som sender nye
          kunder ind ad døren igen.
        </p>
      </div>
    </div>
  );
}
