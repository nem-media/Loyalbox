import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ArticleBody } from "@/components/article-body";
import {
  POSTS,
  getPost,
  formatBlogDate,
  overskrifter,
  faqItems,
  relaterede,
} from "@/lib/blog";
import { SITE_NAME } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Artikel" };
  return {
    title: post.metaTitle ?? post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.metaTitle ?? post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      publishedTime: post.date,
      images: [
        { url: post.image, width: 1200, height: 630, alt: post.imageAlt },
      ],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const base = getSiteUrl();
  const afsnit = overskrifter(post);
  const faq = faqItems(post);
  const beslaegtede = relaterede(post);

  const artikel = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    // Var før hårdkodet til udgivelsesdatoen, så artiklen fortalte Google, at
    // den aldrig var rørt — uanset hvor meget den var rettet.
    dateModified: post.updated ?? post.date,
    inLanguage: "da-DK",
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      // Mørk variant: strukturdata-logoer vises på hvid baggrund hos Google.
      logo: { "@type": "ImageObject", url: `${base}/loyalsum-logo-dark.png` },
    },
    image: `${base}${post.image}`,
    mainEntityOfPage: `${base}/blog/${post.slug}`,
  };

  // Breadcrumbs gør, at Google viser stien "loyalsum.dk › Blog › Artikel"
  // i stedet for den rå URL. Findes kun visuelt før — altså usynligt for søgning.
  const broedkrummer = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Blog", item: `${base}/blog` },
      {
        "@type": "ListItem",
        position: 2,
        name: post.title,
        item: `${base}/blog/${post.slug}`,
      },
    ],
  };

  // Kun når artiklen FAKTISK viser spørgsmålene. Strukturdata, der beskriver
  // noget, læseren ikke kan se på siden, regnes som spam.
  const faqLd = faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(artikel) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(broedkrummer) }}
      />
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      ) : null}
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <nav className="mb-8 text-sm text-muted">
          <Link href="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{post.title}</span>
        </nav>

        <article>
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
              <span aria-hidden="true">·</span>
              <span>{post.readingMinutes} min læsning</span>
              {/* Opdateringsdatoen vises, fordi den ER et argument for at læse
                  videre på et emne, hvor reglerne ændrer sig. Skjult ville den
                  kun tjene Google og ikke læseren. */}
              {post.updated ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Opdateret {formatBlogDate(post.updated)}</span>
                </>
              ) : null}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {post.title}
            </h1>
            {/* Topbillede. Faste dimensioner + aspect-ratio, så der ikke sker
                layoutskift, mens det hentes. Ingen lazy loading her — billedet
                er over folden og er sidens LCP-element. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image}
              alt={post.imageAlt}
              width={1200}
              height={630}
              fetchPriority="high"
              className="box-shape mt-8 aspect-[1200/630] w-full border border-border bg-muted-bg"
            />
          </header>

          {/* Indholdsfortegnelse kun på de lange artikler. På en artikel med
              tre afsnit er den støj — og den skubber det egentlige indhold
              ned under folden uden at hjælpe nogen. */}
          {afsnit.length >= 5 ? (
            <nav
              aria-label="Indhold"
              className="box-shape mb-10 border border-border bg-muted-bg/40 p-5"
            >
              <p className="etiket mb-3">Indhold</p>
              <ol className="space-y-1.5 text-sm">
                {afsnit.map((a, i) => (
                  <li key={a.id} className="flex gap-2.5">
                    <span
                      aria-hidden="true"
                      className="shrink-0 tabular-nums text-muted"
                    >
                      {i + 1}.
                    </span>
                    <a
                      href={`#${a.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {a.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <ArticleBody blocks={post.body} />
        </article>

        {beslaegtede.length ? (
          <section className="mt-14 border-t border-border pt-8">
            <h2 className="text-lg font-bold tracking-tight">Læs også</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {beslaegtede.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="box-shape group border border-border bg-card p-4 shadow-[var(--hoejde-1)] transition-colors hover:border-accent/40"
                >
                  <p className="font-semibold leading-snug group-hover:text-accent">
                    {r.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {r.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-12 border-t border-border pt-6">
          <Link href="/blog" className="text-sm font-medium text-accent">
            ← Tilbage til bloggen
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
