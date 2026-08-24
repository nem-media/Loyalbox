import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { KATALOG } from "@/lib/constants";
import { POSTS } from "@/lib/blog";

/**
 * Sitemap over offentlige sider. Private områder (dashboard, admin) og
 * redirect-endpoints (/r/[slug]) hører ikke til her — de blokeres i robots.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1, lastModified },
    {
      url: `${base}/produkter`,
      changeFrequency: "weekly",
      priority: 0.9,
      lastModified,
    },
    {
      url: `${base}/blog`,
      changeFrequency: "weekly",
      priority: 0.7,
      lastModified,
    },
    {
      url: `${base}/handelsbetingelser`,
      changeFrequency: "yearly",
      priority: 0.3,
      lastModified,
    },
    {
      url: `${base}/privatliv`,
      changeFrequency: "yearly",
      priority: 0.3,
      lastModified,
    },
    {
      url: `${base}/databehandleraftale`,
      changeFrequency: "yearly",
      priority: 0.3,
      lastModified,
    },
    {
      url: `${base}/reviewstander`,
      changeFrequency: "monthly",
      priority: 0.9,
      lastModified,
    },
    {
      url: `${base}/stempelkort`,
      changeFrequency: "monthly",
      priority: 0.9,
      lastModified,
    },
    {
      url: `${base}/bestil`,
      changeFrequency: "monthly",
      priority: 0.5,
      lastModified,
    },
    // `/signup` og `/login` stod her og var faktisk indekseret. En loginside
    // kan ikke besvare noget, nogen søger på, og et sitemap, der beder Google
    // indeksere en side, vi samtidig markerer `noindex`, er et modsigende
    // signal. De er nu markeret private i `PRIVAT_SIDE` og hører ikke til her.
  ];

  const productRoutes: MetadataRoute.Sitemap = KATALOG.map((p) => ({
    url: `${base}/produkter/${p.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
    lastModified,
  }));

  const blogRoutes: MetadataRoute.Sitemap = POSTS.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
    lastModified: new Date(p.date),
  }));

  return [...staticRoutes, ...productRoutes, ...blogRoutes];
}
