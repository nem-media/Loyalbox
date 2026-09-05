"use client";

import { useState } from "react";
import { Stars } from "@/components/ui/stars";
import { OFFENTLIG_TEKST, type OffentligKundescore } from "@/lib/omdoemme";

/**
 * Kundescoren, som den ser ud på den offentlige side.
 *
 * DISKRET MED VILJE. Ingen ramme om et stort tal, ingen farvet badge, ingen
 * bånd. Det er en oplysning om butikken — ikke et mærkat, den har vundet.
 * Overdrevne trust-badges gør det modsatte af, hvad de skal: de får et ærligt
 * tal til at ligne reklame.
 *
 * ANTALLET OG PERIODEN STÅR ALTID. Et gennemsnit uden grundlag er en påstand,
 * og forskellen på 4,7 ud af 6 og 4,7 ud af 600 er hele forskellen på, om
 * tallet betyder noget. Perioden er lige så vigtig: uden den kan tallet lige
 * så godt være fra for fem år siden. Derfor er `grundlag` ikke valgfri.
 *
 * "MÅLT VIA LOYALSUM" OG IKKE "VERIFICERET AF LOYALSUM". Vi har ikke
 * efterprøvet butikken, og vi er ikke en certificeringsmyndighed — vi har
 * indsamlet stjernerne. Ordlyden ligger i `OFFENTLIG_TEKST`, og en test
 * holder ord som "verificeret", "certificeret" og "godkendt" ude.
 *
 * DET ER KUNDESCOREN, ALDRIG REPUTATION SCORE. Sidstnævnte indeholder tal,
 * butikken selv har oplyst, og en sammenvejning vi har valgt — den hører
 * hjemme i dashboardet og ingen andre steder. Komponenten her har ikke engang
 * en prop, den kunne komme ind ad.
 */
export function OffentligKundescoreVisning({
  score,
  className,
}: {
  score: OffentligKundescore;
  className?: string;
}) {
  const [aaben, setAaben] = useState(false);

  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-muted">
        {score.foreloebig
          ? OFFENTLIG_TEKST.foreloebig
          : OFFENTLIG_TEKST.overskrift}
      </p>

      {/* Stjernerne er afrundet til nærmeste hele: en halv stjerne på en
          fem-punkts skala er mere præcision, end øjet aflæser, og tallet ved
          siden af bærer alligevel den nøjagtige værdi. */}
      <div className="mt-1.5 flex justify-center">
        <Stars value={Math.round(score.score)} />
      </div>

      <p className="mt-1.5 flex items-baseline justify-center gap-1.5">
        <span className="text-2xl font-semibold tracking-tight">
          {score.score.toFixed(1).replace(".", ",")}
        </span>
        <span className="text-sm text-muted">/ 5</span>
      </p>

      <p className="mt-0.5 text-xs text-muted">
        {OFFENTLIG_TEKST.grundlag(score.antal)}
      </p>

      <p className="mt-1 text-[11px] text-muted/70">{OFFENTLIG_TEKST.kilde}</p>

      {/*
        Forklaringen folder sig ud på stedet frem for at åbne en side. Kunden
        står med telefonen i hånden midt i noget andet — et link, der fører
        væk, er et link, der afbryder.
      */}
      <button
        type="button"
        onClick={() => setAaben((v) => !v)}
        aria-expanded={aaben}
        className="mt-2 text-[11px] text-muted underline underline-offset-2"
      >
        {OFFENTLIG_TEKST.forklaringLink}
      </button>
      {aaben ? (
        <p className="mx-auto mt-2 max-w-xs text-[11px] leading-relaxed text-muted">
          {OFFENTLIG_TEKST.forklaring}
        </p>
      ) : null}
    </div>
  );
}
