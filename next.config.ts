import type { NextConfig } from "next";

/** Gamle platform-specifikke produkt-slugs (kollapset til 3 varer). */
const OLD_STAND_SLUGS = [
  "google-review-stander",
  "trustpilot-stander",
  "tripadvisor-stander",
  "facebook-stander",
  "alt-i-en-stander",
];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Gamle standalone-standere → den nye Reviewstander (selvvalgt link)
      ...OLD_STAND_SLUGS.map((slug) => ({
        source: `/produkter/${slug}`,
        destination: "/produkter/reviewstander",
        permanent: true,
      })),
      // Gamle komplet-varianter → LoyalBox Komplet
      ...OLD_STAND_SLUGS.map((slug) => ({
        source: `/produkter/${slug}-komplet`,
        destination: "/produkter/loyalbox-komplet",
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
