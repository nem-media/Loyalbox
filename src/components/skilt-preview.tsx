"use client";

import {
  SKILT_BREDDE,
  SKILT_HOEJDE,
  RING_PROCENT,
  SKIVE_FARVE,
  skabelonTil,
} from "@/lib/skilt-format";
import { STANDARD_ACCENT, type StanderFarve } from "@/lib/stander-tilvalg";

/**
 * Skiltet som det bliver trykt — brugt af BEGGE bestillingsformularer.
 *
 * ÉN KOMPONENT, fordi der er to veje ind i en bestilling: designeren for en
 * kunde med konto og formularen på /bestil/uden-konto. Lå previewet begge
 * steder, ville det ene blive rettet og det andet blive stående — og så ville
 * to kunder godkende hver sit skilt for den samme vare.
 *
 * SELVE SKILTET HENTES FRA /api/skilt, altså den samme funktion, der laver
 * trykfilen. Previewet kan derfor ikke vise noget andet, end der bliver trykt.
 *
 * LOGOET LÆGGES OVENPÅ HER OG BAGES IKKE IND.
 * Det er ikke en genvej: mens kunden designer, er logoet en lokal
 * `blob:`-adresse i deres egen browser — filen uploades først ved betalingen.
 * Serveren kan ikke hente den, og et forsøg gav et brudt ikon. Til trykfilen,
 * hvor logoet ER uploadet, bager `byggSkilt()` det ind.
 *
 * Målene kommer fra `skilt-format.ts`, så laget sidder præcis dér, hvor
 * ringen er i skabelonen — også hvis skiltet en dag skifter format.
 */
export function SkiltPreview({
  standerFarve,
  baggrund,
  accent,
  logoUrl,
  className,
}: {
  standerFarve: StanderFarve;
  /** Kundens egen baggrund. Udeladt = standerens egen farve. */
  baggrund?: string | null;
  accent?: string | null;
  /** Lokal `blob:`-adresse eller en rigtig URL — begge virker her. */
  logoUrl?: string | null;
  className?: string;
}) {
  const brugtAccent = accent ?? STANDARD_ACCENT;
  const q = new URLSearchParams({ farve: standerFarve, accent: brugtAccent });
  if (baggrund) q.set("bg", baggrund);

  // Skivens farve følger skabelonen, ikke baggrunden — se SKIVE_FARVE.
  const variant = skabelonTil(
    baggrund ?? (standerFarve === "sort" ? "#111111" : "#ffffff"),
  );

  return (
    <div
      className={className}
      style={{
        position: "relative",
        aspectRatio: `${SKILT_BREDDE} / ${SKILT_HOEJDE}`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/skilt?${q.toString()}`}
        alt="Dit skilt som det bliver trykt"
        width={SKILT_BREDDE}
        height={SKILT_HOEJDE}
        className="h-full w-full"
      />

      {logoUrl ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: `${RING_PROCENT.venstre}%`,
            top: `${RING_PROCENT.top}%`,
            width: `${RING_PROCENT.bredde}%`,
            height: `${RING_PROCENT.hoejde}%`,
            borderRadius: "50%",
            background: SKIVE_FARVE[variant],
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
          }}
        >
          {/* BEVIDST uden maskering: har logoet en hvid baggrund, eller er det
              mørkt på en sort stander, skal det ses HER. Kunden finder sin
              egen fejl, mens den stadig kan rettes — et skilt kan ikke kaldes
              tilbage. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            style={{
              width: `${RING_PROCENT.logoAndel}%`,
              height: `${RING_PROCENT.logoAndel}%`,
              objectFit: "contain",
            }}
          />
        </span>
      ) : null}
    </div>
  );
}
