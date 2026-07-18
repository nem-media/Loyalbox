import { ButtonLink } from "@/components/ui/button";
import type { BlogBlock } from "@/lib/blog";

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
              <h2
                key={i}
                className="mt-10 text-xl font-bold tracking-tight sm:text-2xl"
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
