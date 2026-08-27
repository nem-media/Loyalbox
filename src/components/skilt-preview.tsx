"use client";

import {
  SKILT_BREDDE,
  SKILT_HOEJDE,
  SKILT_CM,
  cmTekst,
  LOGO_PROCENT,
  LOGO_DAEK_PROCENT,
  FOD_PROCENT,
  HJOERNE_RADIUS,
} from "@/lib/skilt-format";
import {
  STANDARD_ACCENT,
  STANDER_FARVER,
  type StanderFarve,
} from "@/lib/stander-tilvalg";

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
 * logofeltet er i skabelonen — også hvis skiltet en dag skifter format.
 */
export function SkiltPreview({
  standerFarve,
  baggrund,
  accent,
  logoUrl,
  visFod = true,
  className,
}: {
  standerFarve: StanderFarve;
  /** Kundens egen baggrund. Udeladt = standerens egen farve. */
  baggrund?: string | null;
  accent?: string | null;
  /** Lokal `blob:`-adresse eller en rigtig URL — begge virker her. */
  logoUrl?: string | null;
  /** Markér den del, foden dækker. Fra ved rent pynt, hvor skiltet ikke bestilles. */
  visFod?: boolean;
  className?: string;
}) {
  const brugtAccent = accent ?? STANDARD_ACCENT;
  const q = new URLSearchParams({ farve: standerFarve, accent: brugtAccent });
  if (baggrund) q.set("bg", baggrund);

  /*
   * Fladen, der skjuler logofeltet, skal have SAMME farve som skiltet omkring
   * det — ellers står der en firkant og lyser, hvor pladsholderen var. Den
   * kommer fra de samme to steder som i `/api/skilt`: kundens egen farve, og
   * ellers standerens.
   */
  const fladeFarve =
    baggrund ?? STANDER_FARVER.find((f) => f.vaerdi === standerFarve)!.hex;

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
            left: `${LOGO_DAEK_PROCENT.venstre}%`,
            top: `${LOGO_DAEK_PROCENT.top}%`,
            width: `${LOGO_DAEK_PROCENT.bredde}%`,
            height: `${LOGO_DAEK_PROCENT.hoejde}%`,
            background: fladeFarve,
          }}
        />
      ) : null}

      {logoUrl ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: `${LOGO_PROCENT.venstre}%`,
            top: `${LOGO_PROCENT.top}%`,
            width: `${LOGO_PROCENT.bredde}%`,
            height: `${LOGO_PROCENT.hoejde}%`,
          }}
        >
          {/* BEVIDST uden maskering: har logoet en hvid baggrund, eller er det
              mørkt på en sort stander, skal det ses HER. Kunden finder sin
              egen fejl, mens den stadig kan rettes — et skilt kan ikke kaldes
              tilbage.

              `contain` svarer til trykfilens preserveAspectRatio="xMidYMid
              meet": logoet fylder feltet så meget det kan uden at blive
              strakt, og er altid helt med. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </span>
      ) : null}

      {/*
        FODEN.

        Skiltet er 19,2 cm højt, men de nederste 5 cm sidder i standerens fod
        og kan ikke ses. Zonen MARKERES frem for at blive skåret væk, og det
        er et bevidst valg: klippede previewet bunden af, ville det holde op
        med at vise trykfilen, og en kunde, hvis design rækker ned i foden,
        ville aldrig få det at vide. Skraveringen siger begge dele på én gang
        — her er noget, og det kan ikke ses.

        Markeringen ligger HER og ikke i SVG'en, netop fordi den ikke må
        trykkes med.

        Grå med gennemsigtighed frem for en fast farve: den skal kunne ses på
        både en sort og en hvid stander, og på hvad kunden ellers finder på.
      */}
      {visFod ? (
        <span className="sr-only">
          Skiltet er {cmTekst(SKILT_CM.hoejde)} cm højt. De nederste{" "}
          {cmTekst(SKILT_CM.fod)} cm sidder i foden og kan ikke ses.
        </span>
      ) : null}
      {visFod ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${FOD_PROCENT.top}%`,
            height: `${FOD_PROCENT.hoejde}%`,
            borderTop: "1px dashed rgba(128,128,128,0.85)",
            backgroundImage:
              "repeating-linear-gradient(-45deg, rgba(128,128,128,0.26) 0 2px, rgba(128,128,128,0) 2px 6px)",
          }}
        />
      ) : null}

      {/*
        Standerens silhuet. Skiltet ER den afrundede firkant — den grå flade
        uden om i Canva-eksporten er en bagplade og trykkes ikke, så uden for
        hjørnerne er filen gennemsigtig. Uden denne kontur ville en hvid
        stander være usynlig på et hvidt kort.
      */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: HJOERNE_RADIUS,
          boxShadow: "inset 0 0 0 1px rgba(128,128,128,0.4)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
