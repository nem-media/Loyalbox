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
      // Gamle komplet-varianter → LoyalSum Komplet
      ...OLD_STAND_SLUGS.map((slug) => ({
        source: `/produkter/${slug}-komplet`,
        destination: "/produkter/loyalsum-komplet",
        permanent: true,
      })),
      // Navneskift LoyalBox → LoyalSum (produktsiden skiftede slug).
      {
        source: "/produkter/loyalbox-komplet",
        destination: "/produkter/loyalsum-komplet",
        permanent: true,
      },
      // Blogindlægget jagtede samme søgeord som /stempelkort. Det er skrevet om
      // til et snævrere emne og har fået ny slug; den brede intent ligger nu
      // kun ét sted.
      {
        source: "/blog/digitalt-stempelkort-faa-kunder-til-at-komme-igen",
        destination: "/blog/hvor-mange-stempler-stempelkort",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
