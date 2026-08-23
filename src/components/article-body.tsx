import { ButtonLink } from "@/components/ui/button";
import { overskriftId, type BlogBlock } from "@/lib/blog";

/**
 * Renderer en artikels blokke med sitets håndlavede typografi (ingen prose-
 * plugin). Afsnit indeholder betroet førstepartsmarkup, så links og fed tekst
 * gengives med dangerouslySetInnerHTML.
 */
export function ArticleBody({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "h2":
            return (
              // `id` + `scroll-mt` så indholdsfortegnelsen og Googles
              // "spring til"-links lander med overskriften synlig og ikke
              // klistret op under skærmkanten.
              <h2
                key={i}
                id={overskriftId(block.text)}
                className="mt-10 scroll-mt-20 text-xl font-bold tracking-tight sm:text-2xl"
              >
                {block.text}
              </h2>
            );
          case "p":
            return (
              <p
                key={i}
                className="leading-relaxed text-foreground/90 [&_a]:font-medium [&_a]:text-accent [&_a:hover]:underline"
                dangerouslySetInnerHTML={{ __html: block.html }}
              />
            );
          case "ul":
            return (
              <ul key={i} className="space-y-2 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-2 leading-relaxed">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                    />
                    <span
                      className="[&_a]:font-medium [&_a]:text-accent [&_a:hover]:underline"
                      dangerouslySetInnerHTML={{ __html: item }}
                    />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="space-y-3 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-3 leading-relaxed">
                    {/* Tallet er information her, ikke pynt: rækkefølgen er
                        selve pointen i en trinliste. */}
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-semibold tabular-nums text-accent"
                    >
                      {j + 1}
                    </span>
                    <span
                      className="[&_a]:font-medium [&_a]:text-accent [&_a:hover]:underline"
                      dangerouslySetInnerHTML={{ __html: item }}
                    />
                  </li>
                ))}
              </ol>
            );
          case "table":
            return (
              // Egen scroll-beholder: en tabel med tre kolonner sprænger en
              // telefonskærm, og uden den skubber den HELE artiklen sidelæns.
              <div key={i} className="my-6 overflow-x-auto">
                <table className="w-full min-w-[32rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted-bg/50 text-left">
                      {block.head.map((h, j) => (
                        <th key={j} className="etiket px-4 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, j) => (
                      <tr key={j} className="border-b border-border/60">
                        {row.map((cell, k) => (
                          <td
                            key={k}
                            className="px-4 py-3 align-top leading-relaxed [&_a]:font-medium [&_a]:text-accent"
                            dangerouslySetInnerHTML={{ __html: cell }}
                          />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "note":
            return (
              <div
                key={i}
                className="box-shape my-6 border-l-2 border-l-secondary border-y border-r border-border bg-secondary/5 p-5"
              >
                <p className="font-semibold">{block.title}</p>
                <p
                  className="mt-1.5 leading-relaxed text-foreground/90 [&_a]:font-medium [&_a]:text-accent [&_a:hover]:underline"
                  dangerouslySetInnerHTML={{ __html: block.html }}
                />
              </div>
            );
          case "faq":
            return (
              <div key={i} className="my-6 divide-y divide-border border-y border-border">
                {block.items.map((item, j) => (
                  // `details` og ikke JavaScript: indholdet står i kildekoden
                  // uanset om feltet er åbnet, så Google kan læse svaret. Et
                  // svar, der først hentes ved klik, tæller ikke med.
                  <details key={j} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-medium marker:content-['']">
                      {item.q}
                      <span
                        aria-hidden="true"
                        className="mt-1 shrink-0 text-accent transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p
                      className="mt-2 leading-relaxed text-foreground/90 [&_a]:font-medium [&_a]:text-accent [&_a:hover]:underline"
                      dangerouslySetInnerHTML={{ __html: item.a }}
                    />
                  </details>
                ))}
              </div>
            );
          case "cta":
            return (
              <div
                key={i}
                className="mt-8 box-shape border border-accent/20 bg-accent/5 p-6 text-center"
              >
                <p className="mx-auto mb-4 max-w-md text-muted">{block.text}</p>
                <ButtonLink href={block.href} size="md">
                  {block.label}
                </ButtonLink>
              </div>
            );
        }
      })}
    </div>
  );
}
