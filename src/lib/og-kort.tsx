import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * DELEKORTET — ÉT STED, FIRE BRUGERE.
 *
 * Rodens kort, blogartiklernes, `/stempelkort` og `/reviewstander` tegner det
 * samme: brandmærket øverst, en overskrift, eventuelt en underlinje. Lå
 * tegningen fire steder, ville de fire drive fra hinanden — og et delekort er
 * netop dét, ingen ser i det daglige, så forskellen ville stå i månedsvis.
 *
 * HVORFOR DE TO LANDINGSSIDER HAR DERES EGEN FIL: de sætter `openGraph` i
 * metadataen (med en skarpere OG-titel end sidens `<title>`), og **det slår
 * `opengraph-image`-konventionen fra**. Målt 2026-09-17: netop de to
 * vigtigste kommercielle sider var de eneste uden billede, efter at roden
 * ellers dækkede alt. En fil pr. side er prisen for at beholde den skarpere
 * titel — og de får så deres egen overskrift på kortet, hvilket er bedre end
 * rodens fælles.
 *
 * TEKSTEN ER ALTID EKSISTERENDE COPY. Kortet er dét, folk ser FØRST, og det
 * er det dårligste sted at love noget, der ikke står på siden.
 */

export const OG_STOERRELSE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

// Brandets egne værdier fra `globals.css`. Skrevet ud, fordi Satori ikke
// kender CSS-variabler — de er kopieret, ikke opfundet.
const MOERK = "#08303c";
const ACCENT = "#0f5b66";
const RAAHVID = "#eff5f7";

/** Inter i to vægte, hentet fra disken — ingen netværkskald under byggeriet. */
export async function ogSkrifter() {
  const [inter400, inter700] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/inter-400.woff")),
    readFile(join(process.cwd(), "assets/fonts/inter-700.woff")),
  ]);
  return [
    {
      name: "Inter",
      data: inter400 as unknown as ArrayBuffer,
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "Inter",
      data: inter700 as unknown as ArrayBuffer,
      weight: 700 as const,
      style: "normal" as const,
    },
  ];
}

/**
 * Skriftstørrelsen falder i tre trin efter overskriftens længde, så en lang
 * artikeltitel stadig kan være der uden at flyde ud over kanten.
 */
function graedse(overskrift: string): number {
  if (overskrift.length > 70) return 46;
  if (overskrift.length > 45) return 56;
  return 66;
}

export function ogKort({
  overskrift,
  underlinje,
}: {
  overskrift: string;
  underlinje?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: MOERK,
        padding: "0 90px",
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          color: RAAHVID,
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: -0.5,
        }}
      >
        {/* Brandets signaturform: skarpt øverste venstre hjørne. */}
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "0 4px 4px 4px",
            background: ACCENT,
            display: "flex",
          }}
        />
        LoyalSum.dk
      </div>

      <div
        style={{
          marginTop: 28,
          color: "#ffffff",
          fontSize: graedse(overskrift),
          fontWeight: 700,
          lineHeight: 1.12,
          letterSpacing: -1.5,
          maxWidth: 980,
          display: "flex",
        }}
      >
        {overskrift}
      </div>

      {underlinje ? (
        <div
          style={{
            marginTop: 26,
            color: "rgba(255,255,255,0.72)",
            fontSize: 30,
            lineHeight: 1.35,
            maxWidth: 880,
            display: "flex",
          }}
        >
          {underlinje}
        </div>
      ) : null}
    </div>
  );
}
