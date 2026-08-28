"use client";

import {
  SKILT_BREDDE,
  SKILT_HOEJDE,
  SKILT_CM,
  MAAL,
  daek,
  iProcent,
  HJOERNE_RADIUS_FRONT,
} from "@/lib/skilt-format";
import {
  STANDARD_ACCENT,
  STANDER_FARVER,
  type StanderFarve,
} from "@/lib/stander-tilvalg";

/**
 * Skiltet, som det står på disken — brugt af BEGGE bestillingsformularer og af
 * salgssiden.
 *
 * ÉN KOMPONENT, fordi der er to veje ind i en bestilling: designeren for en
 * kunde med konto og formularen på /bestil/uden-konto. Lå previewet begge
 * steder, ville det ene blive rettet og det andet blive stående — og så ville
 * to kunder godkende hver sit skilt for den samme vare.
 *
 * SELVE SKILTET HENTES FRA /api/skilt, altså den samme funktion, der laver
 * trykfilen. Previewet kan derfor ikke vise noget andet, end der bliver trykt.
 *
 * DE NEDERSTE CENTIMETER KLIPPES VÆK.
 *
 * Trykfilen er hele arket — også den del, der sidder i foden, for fladen skal
 * være der, ellers står der en hvid stribe frem under standeren. Men det er
 * en TRYKTEKNISK detalje, og kunden får intet ud af at se den: de skal
 * godkende farve, logo og link, ikke en beskæringszone.
 *
 * Den blev derfor før markeret med en skravering, som skulle forklares. Nu er
 * den bare væk — og det er ikke kun forenkling: den fjerdedel var plads,
 * skiltet kunne bruge på at være større dér, hvor det faktisk skal ses efter.
 *
 * Det, skraveringen beskyttede mod, er der stadig: `MAAL.indholdBund` prøves
 * mod `FOD_START_Y`, så en ny Canva-eksport ikke kan skubbe noget ned i
 * fodzonen uden at en test fejler. Det er bare ikke længere kundens opgave at
 * holde øje med.
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
  loading,
  className,
}: {
  standerFarve: StanderFarve;
  /** Kundens egen baggrund. Udeladt = standerens egen farve. */
  baggrund?: string | null;
  accent?: string | null;
  /** Lokal `blob:`-adresse eller en rigtig URL — begge virker her. */
  logoUrl?: string | null;
  /**
   * `lazy` på en salgsside: skabelonen er 160 KB, og skilte langt nede på
   * siden må ikke koste noget, før nogen ruller ned til dem. I en bestilling
   * skal det hentes med det samme — dér er det hele pointen.
   */
  loading?: "lazy" | "eager";
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

  // Samme mål som i `byggSkilt()`: previewet skal lægge logoet dér, hvor
  // trykfilen gør.
  const felt = iProcent(MAAL.logo);
  const flade = iProcent(daek(MAAL.logo));

  /*
   * KLIPPET SKER I BEHOLDEREN, ikke i billedet: SVG'en er den samme fil som
   * trykken, og en beskåret udgave ville være en anden kilde. Beholderen får
   * frontens sideforhold, billedet beholder sit eget og hænger fra toppen —
   * så er det nederste, foden dækker, uden for kanten.
   *
   * Logoets procenter regnes stadig af HELE arket, fordi de gælder billedet
   * og ikke beholderen. Derfor ligger laget i en indre boks med billedets
   * egen højde.
   */
  const hoejdeProcent = (SKILT_CM.hoejde / SKILT_CM.front) * 100;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        aspectRatio: `${SKILT_CM.bredde} / ${SKILT_CM.front}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          height: `${hoejdeProcent}%`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/skilt?${q.toString()}`}
          alt="Skiltet som det bliver trykt"
          width={SKILT_BREDDE}
          height={SKILT_HOEJDE}
          loading={loading}
          className="h-full w-full"
        />

        {logoUrl ? (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: `${flade.venstre}%`,
              top: `${flade.top}%`,
              width: `${flade.bredde}%`,
              height: `${flade.hoejde}%`,
              background: fladeFarve,
            }}
          />
        ) : null}

        {logoUrl ? (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: `${felt.venstre}%`,
              top: `${felt.top}%`,
              width: `${felt.bredde}%`,
              height: `${felt.hoejde}%`,
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
      </div>

      {/*
        Standerens silhuet. Skiltet ER den afrundede firkant — den grå flade
        uden om i Canva-eksporten er en bagplade og trykkes ikke, så uden for
        hjørnerne er filen gennemsigtig. Uden denne kontur ville en hvid
        stander være usynlig på et hvidt kort.

        Kun de to øverste hjørner: nederst er skiltet skåret, ikke afrundet.
      */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderTopLeftRadius: HJOERNE_RADIUS_FRONT,
          borderTopRightRadius: HJOERNE_RADIUS_FRONT,
          boxShadow: "inset 0 0 0 1px rgba(128,128,128,0.4)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
