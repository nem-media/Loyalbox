import { cn } from "@/lib/utils";

/**
 * EN FORDELING SOM SØJLER — det eneste diagram i produktet, og det tegner
 * kun tal, der allerede findes.
 *
 * Stjernefordelingen blev regnet ud for at give kundescoren og blev aldrig
 * VIST. Butikken kunne altså se, at gennemsnittet var 4,2, men ikke om det
 * var fyrre firestjernede eller tyve femmere og fem ettere — og det er to
 * vidt forskellige forretninger at drive. Tallene er de samme som før; kun
 * visningen er ny.
 *
 * TRE REGLER:
 *
 * 1. **Farven forklarer, og den er aldrig alene om det.** Skalaen går fra
 *    dæmpet rød til dæmpet grøn (se `--skala-1..5` i globals.css), fordi en
 *    rækkefølge ikke kan bæres af én brandfarve i fem styrker. Hver række
 *    står samtidig med sit antal og sin procent i tal, så fordelingen kan
 *    læses uden at kunne skelne farverne.
 *
 * 2. **Bredden er relativ til den STØRSTE række og ikke til summen.** Med
 *    summen som nævner bliver en typisk fordeling — hvor 80 % er femstjernet
 *    — til én lang søjle og fire streger, man ikke kan sammenligne. Procenten
 *    ved siden af siger stadig andelen af det hele, så ingen information går
 *    tabt; det er kun søjlens LÆNGDE, der er skaleret til at kunne aflæses.
 *
 * 3. **En tom fordeling tegnes ikke.** Fem grå streger ved siden af "0
 *    oplevelser" ligner et diagram, der er gået i stykker.
 */
export interface FordelingRaekke {
  /** Det, rækken hedder. Fx "5 stjerner". */
  navn: string;
  antal: number;
  /** 1-5. Vælger farven på skalaen. */
  trin: 1 | 2 | 3 | 4 | 5;
}

const SKALA: Record<FordelingRaekke["trin"], string> = {
  1: "bg-skala-1",
  2: "bg-skala-2",
  3: "bg-skala-3",
  4: "bg-skala-4",
  5: "bg-skala-5",
};

export function FordelingSoejler({
  raekker,
  className,
}: {
  raekker: FordelingRaekke[];
  className?: string;
}) {
  const sum = raekker.reduce((a, r) => a + r.antal, 0);
  if (sum === 0) return null;
  const stoerst = Math.max(...raekker.map((r) => r.antal));

  return (
    <ul className={cn("space-y-2", className)}>
      {raekker.map((r) => {
        const pct = Math.round((r.antal / sum) * 100);
        /* Mindst 2 % bredde på en række, der IKKE er nul: en søjle på en
           halv pixel ser ud som ingenting, og forskellen på "ingen" og "én"
           er dén, man leder efter i bunden af en fordeling. */
        const bredde = r.antal === 0 ? 0 : Math.max(2, (r.antal / stoerst) * 100);
        return (
          <li key={r.navn} className="flex items-center gap-3 text-sm">
            <span className="w-20 shrink-0 text-muted">{r.navn}</span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-subtle ring-1 ring-inset ring-border">
              <span
                className={cn("block h-full rounded-full", SKALA[r.trin])}
                style={{ width: `${bredde}%` }}
              />
            </span>
            <span className="w-10 shrink-0 text-right font-medium tabular-nums">
              {r.antal}
            </span>
            <span className="w-11 shrink-0 text-right text-xs tabular-nums text-muted">
              {pct} %
            </span>
          </li>
        );
      })}
    </ul>
  );
}
