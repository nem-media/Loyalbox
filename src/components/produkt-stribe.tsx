import Link from "next/link";
import { KATALOG, harFysiskSkilt } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

/**
 * ALLE FIRE VARER MED PRIS, LIGE UNDER HERO — PÅ ÉN STRIBE.
 *
 * FORMÅLET er den købeklare: en, der allerede ved, hvad de vil have, skal
 * kunne se hele rækken og priserne uden at lede. MÅLT før striben fandtes:
 * på forsiden lå det første købslink **2434 px nede — 2,7 skærme**, og på de
 * fire landingssider var der kun et link til ÉN vare i hero, så man ikke
 * kunne sammenligne uden at gå til kataloget først.
 *
 * HVORFOR IKKE BARE KATALOGGITTERET HER. Det er MÅLT til 935 px på desktop og
 * **3699 px på mobil** — fire fulde telefonskærme. Lagt efter hver hero ville
 * en, der lander på /stempelkort fra en søgning på "digitalt stempelkort",
 * scrolle gennem fire skærme produktkort, før siden sagde ét ord om
 * stempelkort. De fleste, der kommer fra søgning, er ikke købeklare endnu, og
 * de skal ikke betale for, at mindretallet er det.
 *
 * DERFOR ER DEN SKÅRET TIL ÉN LINJE PR. VARE: navn, hvad den er, prisen. Intet
 * billede — billederne er præcis dét, der gør kataloggitteret højt. Den, der
 * vil se produktet, klikker; den, der vil sammenligne på indhold, har
 * kataloget, som striben linker til.
 *
 * `aktuel` er varen, siden selv handler om. Den fremhæves i stedet for at
 * linke til sig selv — et link, der fører hen, hvor man allerede er, er en
 * blindgyde, og en fremhævning svarer samtidig på "hvor er jeg henne?".
 */
export function ProduktStribe({
  aktuel,
  titel = "Vælg din løsning",
}: {
  /** Slug på den vare, siden handler om — hvis nogen. */
  aktuel?: string;
  titel?: string;
}) {
  return (
    /*
      STRIBEN REJSER SIG OP OVER HEROEN — ÉN REGEL, FEM SIDER.
      Den ligger på alle fem salgssider lige under en mørk hero, og de to
      stødte sammen i en lige, vandret kant. To flader, der mødes på en linje,
      læses som "blok oven på blok"; en lys flade, der rejser sig et stykke op
      over den mørke med afrundede hjørner, læses som ÉT dokument med lag.

      `-mt-8` OG IKKE MERE. Løftet skal være mindre end heroens nederste
      polstring, ellers dækker striben heroens eget indhold. Den strammeste
      er `py-16` på mobil = 64 px, og 32 px er halvdelen af den — også ved
      390, hvor der er mindst plads.

      `z-10` ER NØDVENDIG: heroerne bærer `isolate` og deres egne skær i
      `-z-10`, og uden et eksplicit lag her ville striben kunne havne bag
      dem i stablingsrækkefølgen.

      Kun de ØVERSTE hjørner rundes: den nederste kant er en rigtig
      sektionsgrænse mod det, der følger efter, og skal blive ved med at være
      en streg.
    */
    <section
      aria-labelledby="produktstribe"
      className="relative z-10 -mt-8 rounded-t-[var(--radius-stor)] border-b border-border bg-muted-bg"
    >
      <div className="mx-auto max-w-side px-4 pb-8 pt-10">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="produktstribe" className="text-sm font-semibold">
            {titel}
          </h2>
          <Link
            href="/produkter"
            className="trykmaal text-sm font-medium text-accent hover:underline"
          >
            Sammenlign alle fire →
          </Link>
        </div>

        {/*
          To spor på en telefon og fire fra samme trin som kataloget. Uden det
          første ville fire kort i én kolonne blive en stribe på højde med det
          gitter, striben findes for at undgå.
        */}
        <ul className="grid grid-cols-2 gap-3 laptop:grid-cols-4">
          {KATALOG.map((p) => {
            const erAktuel = p.slug === aktuel;
            /* Prisen skrives som den betales: en vare uden engangspris må
               ikke stå med "0 kr." — se ProductPrice for den fulde regel. */
            const pris = harFysiskSkilt(p)
              ? `${formatCurrency(p.price)}${p.monthlyPrice ? ` + ${formatCurrency(p.monthlyPrice)}/md` : ""}`
              : `${formatCurrency(p.monthlyPrice ?? 0)}/md`;

            const indhold = (
              <>
                <span className="block text-sm font-bold tracking-tight">
                  {p.name}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-muted">
                  {p.tagline}
                </span>
                <span className="mt-2 block text-sm font-semibold">{pris}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  ex moms
                </span>
              </>
            );

            return (
              <li key={p.slug}>
                {erAktuel ? (
                  <div
                    aria-current="page"
                    className="box-shape h-full border border-accent bg-card p-4 shadow-[var(--hoejde-2)] ring-1 ring-accent/15"
                  >
                    {indhold}
                    <span className="mt-2 block text-xs font-medium text-accent">
                      Du er her
                    </span>
                  </div>
                ) : (
                  <Link
                    href={`/produkter/${p.slug}`}
                    className="box-shape flex h-full flex-col border border-border bg-card p-4 shadow-[var(--hoejde-1)] transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[var(--hoejde-2)]"
                  >
                    {indhold}
                    <span className="mt-2 block text-xs font-medium text-accent">
                      Se produkt →
                    </span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
