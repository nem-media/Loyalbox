import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { POSTS_BY_DATE, formatBlogDate } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — flere anmeldelser & lokal synlighed",
  description:
    "Guides om Google-anmeldelser, review-standere og lokal synlighed for din forretning. Praktiske råd du kan bruge med det samme.",
  alternates: { canonical: "/blog" },
};

/**
 * Bloglisten.
 *
 * DEN VAR EN LISTE OG ER NU ET KATALOG. Nitten artikler i én smal spalte med
 * en miniature til venstre læses som en arkivside; kort i et gitter læses som
 * noget, der er lavet. Rammen er sitets egen (`max-w-side`) frem for
 * `max-w-3xl` — den smalle bredde er rigtig for en ARTIKEL, hvor linjelængden
 * afgør læsbarheden, og forkert for en oversigt, hvor der lå 340 px ubrugt i
 * hver side ved 1440.
 *
 * DEN NYESTE ARTIKEL FÅR HELE BREDDEN. En liste uden hierarki lader læseren
 * selv finde ud af, hvor man begynder. Det fremhævede kort er dét, der siger
 * "start her", og det er samtidig den artikel, der er mest aktuel.
 *
 * TEKSTEN ER UÆNDRET. Titler, uddrag, datoer og læsetid kommer fra `blog.ts`,
 * og intet er skrevet om — dette er en visuel ombygning, ikke en redaktionel.
 *
 * RÅ `<img>` MED VILJE. Figurerne er håndlavede SVG'er, der skalerer selv;
 * `next/image` ville omkode dem til raster og gøre dem uskarpe. Se reglen om
 * de ni tilbageværende `<img>` i AGENTS.md.
 *
 * ALT-TEKSTEN ER TOM, også her: billedet gentager kun overskriften ved siden
 * af, og en skærmlæser skal ikke høre det samme to gange. På artiklen selv
 * har figuren en rigtig beskrivelse.
 */
export default function BlogIndexPage() {
  const [nyeste, ...resten] = POSTS_BY_DATE;

  return (
    <>
      <SiteHeader />
      <main id="indhold" className="mx-auto max-w-side px-4 py-16">
        <div className="mb-12 max-w-2xl">
          <p className="etiket">Blog</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Flere anmeldelser & lokal synlighed
          </h1>
          <p className="mt-3 text-lg text-muted">
            Praktiske guides til at få flere Google-anmeldelser og styrke din
            lokale forretning.
          </p>
        </div>

        {/* DET FREMHÆVEDE KORT — vandret på lg, så figuren får plads nok til
            at kunne læses som en illustration frem for som en miniature. */}
        {nyeste ? (
          <article className="mb-8">
            <Link
              href={`/blog/${nyeste.slug}`}
              className="box-shape group block overflow-hidden border border-border bg-card shadow-[var(--hoejde-1)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--hoejde-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={nyeste.image}
                  alt=""
                  width={1200}
                  height={630}
                  className="aspect-[1200/630] w-full bg-muted-bg object-cover"
                />
                <div className="flex flex-col justify-center p-6 sm:p-8">
                  <Meta post={nyeste} fremhaevet />
                  <h2 className="mt-3 text-2xl font-bold tracking-tight transition-colors group-hover:text-accent sm:text-3xl">
                    {nyeste.title}
                  </h2>
                  <p className="mt-3 leading-relaxed text-muted">
                    {nyeste.excerpt}
                  </p>
                  <span className="mt-5 text-sm font-semibold text-accent">
                    Læs artiklen →
                  </span>
                </div>
              </div>
            </Link>
          </article>
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resten.map((post) => (
            <article key={post.slug} className="h-full">
              <Link
                href={`/blog/${post.slug}`}
                className="box-shape group flex h-full flex-col overflow-hidden border border-border bg-card shadow-[var(--hoejde-1)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--hoejde-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.image}
                  alt=""
                  width={1200}
                  height={630}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[1200/630] w-full bg-muted-bg object-cover"
                />
                <div className="flex flex-1 flex-col p-5">
                  <Meta post={post} />
                  <h2 className="mt-2.5 text-lg font-bold leading-snug tracking-tight transition-colors group-hover:text-accent">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {post.excerpt}
                  </p>
                  {/* `mt-auto` holder linjen i bund uanset hvor lang titlen
                      er, så de tre kort i en række ender ens. */}
                  <span className="mt-auto pt-4 text-sm font-semibold text-accent">
                    Læs artiklen →
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/** Dato og læsetid. Ét sted, så de to kortformer ikke driver fra hinanden. */
function Meta({
  post,
  fremhaevet = false,
}: {
  post: (typeof POSTS_BY_DATE)[number];
  fremhaevet?: boolean;
}) {
  return (
    <div
      className={
        fremhaevet
          ? "flex items-center gap-2 text-sm text-muted"
          : "flex items-center gap-2 text-xs text-muted"
      }
    >
      <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
      <span aria-hidden="true">·</span>
      <span>{post.readingMinutes} min læsning</span>
    </div>
  );
}
