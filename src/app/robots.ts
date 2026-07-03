import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

/**
 * Fortæller søgemaskiner hvilke URL'er de må crawle. Private områder og
 * redirect-endpoints holdes ude af indekset; sitemap'et peger på de offentlige.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/dashboard/", "/r/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
