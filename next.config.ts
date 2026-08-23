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
  experimental: {
    serverActions: {
      /**
       * Bestillingen uden konto sender logofilen med som en del af
       * formularen. Standardgraensen er 1 MB, og logokravet er 5 MB —
       * uden dette ville en gyldig fil blive afvist af rammeverket, foer
       * vores egen kontrol naaede at se den, og fejlen ville ikke kunne
       * forklares for kunden.
       *
       * Sat til 8 MB og ikke hoejere: der er kun ét felt, og 5 MB plus
       * multipart-overhead er rigeligt.
       */
      bodySizeLimit: "8mb",
    },
  },

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
      // Designene havde et eget menupunkt med SAMME ikon som Standere — to
      // punkter for én ting. Indholdet ligger nu som et afsnit på standersiden.
      // Kunder kan have gemt den gamle adresse, så den peger ned på afsnittet.
      {
        source: "/dashboard/design",
        destination: "/dashboard/standere#design",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
