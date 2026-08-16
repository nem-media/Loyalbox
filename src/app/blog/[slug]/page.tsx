import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ArticleBody } from "@/components/article-body";
import { POSTS, getPost, formatBlogDate } from "@/lib/blog";
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
            <div className="flex items-center gap-2 text-xs text-muted">
              <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
              <span aria-hidden="true">·</span>
              <span>{post.readingMinutes} min læsning</span>
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

          <ArticleBody blocks={post.body} />
        </article>

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
