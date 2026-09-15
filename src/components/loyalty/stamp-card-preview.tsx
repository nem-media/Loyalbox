import { stampProgress } from "@/lib/loyalty/balance";
import { stempelKolonner } from "@/lib/loyalty/stamp-layout";
import { gyldighed, gyldighedTekst } from "@/lib/loyalty/program-status";
import { formatDate } from "@/lib/utils";

/**
 * Visuel stempelkort-forhåndsvisning. Bruges i program-wizarden og på kundens
 * eget kort. Viser en stempelrække og fremgang mod belønningen.
 */
export function StampCardPreview({
  name,
  color = "#1e1c1a",
  requiredStamps,
  filled = 0,
  rewardName,
  cardText,
  companyName,
  beholderOverskydende,
  startDato = null,
  slutDato = null,
}: {
  name: string;
  color?: string;
  requiredStamps: number;
  filled?: number;
  rewardName?: string | null;
  cardText?: string | null;
  companyName?: string | null;
  /**
   * Beholder butikken stempler ud over tærsklen ved en indløsning
   * (`loyalty_programs.keep_overflow`)? Udelades den, siges der intet om,
   * hvad der sker med dem — bedre end at gætte forkert på kundens vegne.
   */
  beholderOverskydende?: boolean;
  /**
   * Kortets datovindue (`loyalty_programs.start_date` / `end_date`).
   *
   * STÅR PÅ KORTET, FORDI DET ER KUNDENS LØFTE DER UDLØBER. Vinduet
   * håndhæves i `giveStamp()`, men dén besked går til personalet ved disken —
   * her stod der intet, og en kunde kunne samle mod en belønning, der stille
   * løb ud. Udelades de, siges der ingenting; det er stadig det rigtige for
   * et kort uden slutdato.
   */
  startDato?: string | null;
  slutDato?: string | null;
}) {
  const total = Math.max(1, Math.min(requiredStamps, 30));
  const p = stampProgress(filled, requiredStamps);
  // Kolonner efter antal, så et kort med fx 7 eller 9 stempler står flot
  // fordelt frem for en fyldt række med en stump under. Se stempelKolonner.
  const kolonner = stempelKolonner(total);
  const gyldig = gyldighed({ start_date: startDato, end_date: slutDato });

  return (
    <div
      className="box-shape overflow-hidden border border-white/10 text-white shadow-sm"
      style={{ backgroundColor: color }}
    >
      <div className="p-5">
        {companyName ? (
          <p className="text-xs font-medium uppercase tracking-wide text-white/60">
            {companyName}
          </p>
        ) : null}
        <h3 className="mt-0.5 text-lg font-bold tracking-tight">{name || "Dit stempelkort"}</h3>
        {cardText ? (
          <p className="mt-1 text-sm text-white/70">{cardText}</p>
        ) : null}

        <div
          className="mt-4 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${kolonner}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: total }).map((_, i) => {
            const isFilled = i < p.have;
            return (
              <div
                key={i}
                className="grid aspect-square place-items-center rounded-full border text-xs font-semibold"
                style={{
                  borderColor: "rgba(255,255,255,0.35)",
                  backgroundColor: isFilled ? "rgba(255,255,255,0.95)" : "transparent",
                  color: isFilled ? color : "rgba(255,255,255,0.6)",
                }}
                aria-hidden="true"
              >
                {isFilled ? "★" : i + 1}
              </div>
            );
          })}
        </div>

        {/*
          GYLDIGHEDEN STÅR OVER STEMPLERNE OG IKKE UNDER DEM.
          Er kortet udløbet, er tælleren ligegyldig — så er beskeden dét, der
          skal læses først. Og haster det, skal det ses, før øjet går videre.
        */}
        {gyldig ? (
          <p
            className={`mt-3 box-shape px-3 py-2 text-xs font-medium ${
              gyldig.slags === "udloebet" || gyldig.slags === "snart"
                ? "bg-white/20 text-white"
                : "text-white/70"
            }`}
          >
            {gyldig.slags === "udloebet" ? "⚠ " : null}
            {gyldighedTekst(gyldig, formatDate(gyldig.dato))}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between text-sm">
          {/*
            TÆLLEREN STOPPER VED TÆRSKLEN. Den viste før den rå saldo, så et
            fyldt kort med et ekstra stempel stod som "11 af 10 stempler".
            Overskydende stempler hører ikke til i tælleren: de er ikke på vej
            mod noget, for der udstedes kun én belønning ad gangen. De står
            for sig nedenfor — med hvad der sker med dem.
          */}
          <span className="text-white/80">
            {Math.min(p.have, p.required)} af {p.required} stempler
          </span>
          {rewardName ? (
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
              {p.reached ? "🎉 " : ""}
              {rewardName}
            </span>
          ) : null}
        </div>

        {/*
          DE OVERSKYDENDE STEMPLER, OG SANDHEDEN OM DEM. Kunden har fået dem og
          kan se dem på kvitteringen; at lade som om de ikke findes ville være
          lige så forkert som at lægge dem i tælleren. Beholder butikken dem
          ikke, skal det stå NU — ikke opdages, når kortet efter indløsningen
          står på nul.
        */}
        {p.overskydende > 0 ? (
          <div className="border-t border-white/15 px-5 py-3 text-xs text-white/70">
            <span className="font-medium text-white/90">
              +{p.overskydende}{" "}
              {p.overskydende === 1 ? "ekstra stempel" : "ekstra stempler"}
            </span>
            {/* Ét stempel er "det", flere er "de". En sætning, kunden læser
                med telefonen i hånden, må ikke skurre. */}
            {beholderOverskydende === undefined ? null : beholderOverskydende ? (
              <>
                {" "}
                · {p.overskydende === 1 ? "det følger" : "de følger"} med over på
                næste kort, når belønningen er indløst.
              </>
            ) : (
              <>
                {" "}
                · {p.overskydende === 1 ? "det bortfalder" : "de bortfalder"},
                når belønningen indløses. Indløs den, før du samler videre.
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
