import { OFFENTLIG_TEKST, type OffentligKundescore } from "@/lib/omdoemme";

/**
 * Kundescoren, som den ser ud på den offentlige side.
 *
 * DISKRET MED VILJE. Ingen ramme om et stort tal, ingen farvet badge, ingen
 * bånd. Det er en oplysning om butikken — ikke et mærkat, den har vundet.
 * Overdrevne trust-badges gør det modsatte af, hvad de skal: de får et ærligt
 * tal til at ligne reklame.
 *
 * ANTALLET STÅR ALTID. Et gennemsnit uden grundlag er en påstand, og
 * forskellen på 4,7 ud af 6 og 4,7 ud af 600 er hele forskellen på, om tallet
 * betyder noget. Derfor er `grundlag` ikke valgfri.
 *
 * "MÅLT VIA LOYALSUM" OG IKKE "VERIFICERET AF LOYALSUM". Vi har ikke
 * efterprøvet butikken, og vi er ikke en certificeringsmyndighed — vi har
 * indsamlet stjernerne. Ordlyden ligger i `OFFENTLIG_TEKST`, og en test
 * holder ord som "verificeret", "certificeret" og "godkendt" ude.
 *
 * DET ER KUNDESCOREN, ALDRIG REPUTATION SCORE. Sidstnævnte indeholder tal,
 * butikken selv har oplyst, og en sammenvejning vi har valgt — den hører
 * hjemme i dashboardet og ingen andre steder.
 */
export function OffentligKundescoreVisning({
  score,
  className,
}: {
  score: OffentligKundescore;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wide text-muted">
        {OFFENTLIG_TEKST.overskrift}
      </p>
      <p className="mt-1 flex items-baseline justify-center gap-1.5">
        <span className="text-2xl font-semibold tracking-tight">
          {score.score.toFixed(1).replace(".", ",")}
        </span>
        <span className="text-sm text-muted">/ 5</span>
      </p>
      <p className="mt-0.5 text-xs text-muted">
        {OFFENTLIG_TEKST.grundlag(score.antal)}
        {score.foreloebig ? ` · ${OFFENTLIG_TEKST.foreloebig}` : ""}
      </p>
      <p className="mt-0.5 text-[11px] text-muted/70">
        {OFFENTLIG_TEKST.kilde}
      </p>
    </div>
  );
}
