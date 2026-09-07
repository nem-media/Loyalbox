import { stampProgress } from "@/lib/loyalty/balance";

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
}) {
  const total = Math.max(1, Math.min(requiredStamps, 30));
  const p = stampProgress(filled, requiredStamps);

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

        <div className="mt-4 grid grid-cols-5 gap-2">
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
