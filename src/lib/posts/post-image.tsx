/**
 * Bygger selve opslags-billedet som et element-træ, `next/og` (Satori) renderer
 * til PNG. Kun flexbox + inline styles — Satori understøtter ikke grid o.l.
 * Bruges udelukkende server-side i billed-ruten.
 */
import type { PostBackground, QuoteStyle } from "./templates";

/** Skalerer skriftstørrelsen efter tekstlængde, så lange citater ikke flyder ud. */
function fitFontSize(len: number, style: QuoteStyle): number {
  if (style === "pop") {
    if (len <= 40) return 66;
    if (len <= 70) return 56;
    if (len <= 110) return 46;
    return 40;
  }
  if (len <= 55) return 60;
  if (len <= 100) return 54;
  if (len <= 150) return 46;
  if (len <= 220) return 40;
  return 34;
}

const STAR_PATH =
  "M12 .587l3.668 7.431 8.2 1.192-5.934 5.786 1.401 8.169L12 18.896l-7.335 3.869 1.401-8.169L.132 9.21l8.2-1.192z";

function Stars({ color }: { color: string }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={58} height={58} viewBox="0 0 24 24" fill={color}>
          <path d={STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}

export interface PostImageProps {
  bg: PostBackground;
  caption: string;
  firmanavn: string;
  showStars: boolean;
  showLogo: boolean;
  showName: boolean;
  customerName?: string | null;
}

export function buildPostElement({
  bg,
  caption,
  firmanavn,
  showStars,
  showLogo,
  showName,
  customerName,
}: PostImageProps) {
  const initial = (firmanavn.trim()[0] ?? "•").toUpperCase();

  const quoteBase: React.CSSProperties = {
    display: "flex",
    letterSpacing: "-0.5px",
  };
  const fs = fitFontSize(caption.length, bg.quoteStyle);
  const quoteStyle: React.CSSProperties =
    bg.quoteStyle === "pop"
      ? { ...quoteBase, fontSize: fs, fontWeight: 700, lineHeight: 1.14, textTransform: "uppercase" }
      : bg.quoteStyle === "quoted"
        ? { ...quoteBase, fontSize: fs, fontWeight: 500, lineHeight: 1.34 }
        : { ...quoteBase, fontSize: fs, fontWeight: 600, lineHeight: 1.28 };

  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 84,
        fontFamily: "Inter",
        color: bg.ink,
        ...(bg.bgImage ? { backgroundImage: bg.bgImage } : { backgroundColor: bg.bgColor }),
      }}
    >
      {/* Top: stjerner */}
      {showStars ? <Stars color={bg.starColor} /> : <div style={{ display: "flex" }} />}

      {/* Midte: citat / tekst */}
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
        {bg.quoteStyle === "quoted" ? (
          <div style={{ display: "flex", fontSize: 150, lineHeight: 0.7, color: bg.starColor, fontWeight: 700 }}>
            &rdquo;
          </div>
        ) : null}
        <div style={{ ...quoteStyle, marginTop: bg.quoteStyle === "quoted" ? 20 : 0 }}>{caption}</div>
      </div>

      {/* Bund: brand */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {bg.accentLine ? (
          <div style={{ display: "flex", width: 92, height: 6, borderRadius: 3, backgroundColor: bg.accentLine, marginBottom: 24 }} />
        ) : null}
        <div style={{ display: "flex", alignItems: "center" }}>
          {showLogo ? (
            <div
              style={{
                display: "flex",
                width: 72,
                height: 72,
                borderRadius: 18,
                marginRight: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: bg.logoBg,
                color: bg.logoInk,
                fontSize: 34,
                fontWeight: 700,
              }}
            >
              {initial}
            </div>
          ) : null}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 700 }}>{firmanavn}</div>
            {showName && customerName ? (
              <div style={{ display: "flex", fontSize: 24, color: bg.subInk, marginTop: 4 }}>
                — {customerName}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
