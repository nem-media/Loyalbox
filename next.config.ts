import type { NextConfig } from "next";

/** Gamle platform-specifikke produkt-slugs (kollapset til 3 varer). */
const OLD_STAND_SLUGS = [
  "google-review-stander",
  "trustpilot-stander",
  "tripadvisor-stander",
  "facebook-stander",
  "alt-i-en-stander",
];

/**
 * VÆRTEN FOR KUNDERNES EGNE LOGOER.
 *
 * Butikkens logo ligger i Supabase Storage og vises på kortet, på
 * tilmeldingssiden og på anmeldelsessiden — altså de tre sider, hver eneste
 * slutkunde møder. `next/image` henter og omkoder kun fra værter, der står
 * her; uden linjen ville billedet fejle i stilhed.
 *
 * Værten UDLEDES af den variabel, klienten alligevel bruger, så de to ikke
 * kan komme i utakt ved et projektskifte. Mangler den (fx en linting-kørsel
 * uden miljø), falder listen tilbage til tom frem for at vælte byggeriet —
 * og så er det kun billedoptimeringen, der er slået fra.
 */
function supabaseVaert(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: (() => {
      const vaert = supabaseVaert();
      return vaert
        ? [
            {
              protocol: "https" as const,
              hostname: vaert,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : [];
    })(),
  },
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
      /**
       * FILER I `public/` BLEV GENVALIDERET VED HVER ENESTE SIDEVISNING.
       *
       * Next giver sine EGNE filer (`/_next/static/…`) et år og `immutable`,
       * fordi navnet indeholder en hash. Alt i `public/` fik derimod
       * `max-age=0, must-revalidate` — altså en betinget rundtur pr. billede
       * pr. sidevisning. **Målt mod produktion 2026-09-17:** logoet (to
       * varianter på hver side) og produktfotoene blev hentet igen hver gang,
       * på en mobilforbindelse hvor rundturen er hele prisen.
       *
       * EN TIME OG IKKE ET ÅR. Navnene her er ikke hashede: skiftes logoet,
       * bliver filnavnet det samme. `immutable` ville derfor betyde, at en
       * fejl ikke kunne rettes for dem, der havde set siden. En time fjerner
       * rundturen for et helt besøg, og `stale-while-revalidate` lader det
       * næste døgn vise den gamle fil med det samme, mens den nye hentes i
       * baggrunden — hurtigt OG rettbart.
       *
       * KUN MEDIEFILER. `sw.js` er en service worker og SKAL kunne skiftes
       * med det samme; den er `.js` og rammes derfor ikke. Det samme gælder
       * `robots.txt`, `sitemap.xml` og manifestet, som i forvejen er ruter og
       * ikke filer.
       */
      {
        source: "/:sti*.(png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
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
