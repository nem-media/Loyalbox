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

  /**
   * SIKKERHEDSHEADERE.
   *
   * MÅLT 2026-09-16: sitet sendte KUN `Strict-Transport-Security`. Ingen af
   * de fire herunder fandtes, og `/dashboard` kunne indlejres i en iframe.
   *
   * HVOR SLEMT? Efterprøvet frem for gættet: indlejres `/dashboard` fra et
   * FREMMED domæne (example.com), vises **loginsiden** og ikke kundens
   * dashboard — sessionscookien er `SameSite` og følger ikke med på tværs af
   * sites. Klassisk clickjacking af en indlogget kunde virker altså ikke, og
   * det her er hærdning, ikke en lukning af et åbent hul.
   *
   * Men rammen skal alligevel sættes: uden `frame-ancestors` kan en fremmed
   * side indlejre vores LOGINSIDE og bygge sin egen ramme om den, og det er
   * en billig måde at gøre en phishingside troværdig på.
   *
   * CSP ER BEVIDST IKKE MED HER. Den er dén, der ville betyde mest — auth-
   * cookien kan læses fra JavaScript (sådan virker Supabase-klienten i
   * browseren), så enhver XSS ville give sessionen væk. Men en Content-
   * Security-Policy på en Next-app kræver nonces og en gennemgang af hver
   * inline-stil og hvert script, og en halvfærdig CSP slår funktioner fra i
   * stilhed. Det er sit eget stykke arbejde med sin egen afprøvning — ikke
   * noget, der skal klistres på til sidst.
   */
  async headers() {
    return [
      {
        source: "/:sti*",
        headers: [
          // Ingen må bygge en ramme om vores sider. `frame-ancestors` er
          // efterfølgeren til X-Frame-Options; begge sættes, fordi ældre
          // browsere kun kender den første.
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
          // Filer skal behandles som det, vi siger de er — ikke som det,
          // indholdet ligner.
          { key: "X-Content-Type-Options", value: "nosniff" },
          /*
           * KORTETS ADRESSE ER EN HEMMELIGHED. `/kort/<public_token>` er
           * selve autorisationen, og anmeldelsesflowet sender kunden VIDERE
           * til Google eller Trustpilot. Moderne browsere sender kun
           * oprindelsen på tværs af sites, men det er en standardværdi og
           * ikke et løfte — her står det som et valg.
           */
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Vi beder aldrig om kamera, mikrofon eller position. Står det
          // skrevet, kan et indlejret tredjepartsscript heller ikke.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
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
