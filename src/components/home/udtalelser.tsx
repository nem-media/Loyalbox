import { KundeAvatar } from "@/components/ui/avatar";
import { synligeUdtalelser } from "@/lib/testimonials";

/**
 * Udtalelser fra butikker, der bruger LoyalSum.
 *
 * SEKTIONEN TEGNER INGENTING, NÅR DER IKKE ER NOGET AT SIGE. Det er hele
 * pointen: designet står klar, men en tom ramme med "her kommer udtalelser"
 * er værre end ingen sektion — den fortæller den besøgende, at ingen har
 * sagt noget endnu. I produktion er listen tom i dag, og siden springer
 * afsnittet over uden et hul i layoutet.
 *
 * Under udvikling vises pladsholderne MED et tydeligt mærke, så ingen kan
 * komme til at tro, at de er rigtige. Filtreringen ligger i
 * `synligeUdtalelser()` — se `src/lib/testimonials.ts` for hvorfor den hænger
 * på `NODE_ENV`.
 */
export function Udtalelser() {
  const udtalelser = synligeUdtalelser();
  if (udtalelser.length === 0) return null;

  const erPladsholder = udtalelser.some((u) => u.isPlaceholder);

  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-side px-4 py-16 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="etiket">Udtalelser</h2>
          <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Sagt af dem, der bruger det
          </p>
        </div>

        {erPladsholder ? (
          /* Kun synlig under udvikling — se komponentens hoved. Den er
             bevidst grim: et mærke, man kan overse, er ikke et mærke. */
          <p className="btn-shape mt-6 inline-block border border-danger/40 bg-danger/5 px-3 py-1.5 text-xs font-semibold text-danger-tekst">
            PLADSHOLDERE — vises kun under udvikling. Erstat med godkendte
            citater i src/lib/testimonials.ts
          </p>
        ) : null}

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 laptop:grid-cols-3">
          {udtalelser.map((u) => (
            <li
              key={u.id}
              className="box-shape flex flex-col border border-border bg-card p-6 shadow-[var(--hoejde-1)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--hoejde-2)]"
            >
              {/* Citattegnet er sat som tekst og ikke som et ikon: det er
                  typografi, det hører til i skriften, og et SVG ville se ud
                  som et fremmedelement i en tekstflade. */}
              <span
                aria-hidden="true"
                className="text-4xl leading-none text-accent/25"
              >
                &ldquo;
              </span>
              <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-foreground/85">
                {u.citat}
              </blockquote>
              <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                {/* Initialer eller et neutralt tegn — aldrig et ansigt.
                    Se `KundeAvatar`. */}
                <KundeAvatar navn={u.navn} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{u.navn}</p>
                  <p className="truncate text-xs text-muted">{u.virksomhed}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
