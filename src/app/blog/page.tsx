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

export default function BlogIndexPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="mb-10">
          <p className="text-sm font-semibold text-accent">Blog</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Flere anmeldelser & lokal synlighed
          </h1>
          <p className="mt-2 text-muted">
            Praktiske guides til at få flere Google-anmeldelser og styrke din
            lokale forretning.
          </p>
        </div>

        <div className="divide-y divide-border border-y border-border">
          {POSTS_BY_DATE.map((post) => (
            <article key={post.slug} className="py-6">
              <Link
                href={`/blog/${post.slug}`}
                className="group grid gap-5 sm:grid-cols-[200px_1fr]"
              >
                {/* Miniature. Alt-teksten er tom med vilje: billedet gentager
                    kun overskriften ved siden af, og en skærmlæser skal ikke
                    høre det samme to gange. På artiklen selv har billedet en
                    rigtig beskrivelse. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.image}
                  alt=""
                  width={1200}
                  height={630}
                  loading="lazy"
                  decoding="async"
                  className="box-shape aspect-[1200/630] w-full border border-border bg-muted-bg"
                />
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
                    <span aria-hidden="true">·</span>
                    <span>{post.readingMinutes} min læsning</span>
                  </div>
                  <h2 className="mt-2 text-xl font-bold tracking-tight group-hover:text-accent">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-muted">{post.excerpt}</p>
                  <span className="mt-3 inline-block text-sm font-medium text-accent">
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
