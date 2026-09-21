import { IkonChip, type ChipFarve } from "@/components/ui/ikon-chip";
import { LinkIcon } from "@/components/nav-icons";
import {
  HjemmesideDuo,
  WebshopDuo,
  EmailDuo,
  QrDuo,
  OpslagDuo,
  KvitteringDuo,
} from "@/components/duotone-ikoner";

/**
 * "Ét link. Mange kanaler."
 *
 * SIGNATURGRAFIKKEN FOR DEN DIGITALE VARE. Kanalerne stod som seks ens kort
 * i et gitter — sandt, men et gitter siger "seks ting", og pointen er det
 * modsatte: ÉT link, der kan stå seks steder. Formen skal bære budskabet,
 * ellers skal teksten bære det alene.
 *
 * NAVET I MIDTEN OG KANALERNE OMKRING, som i designreferencerne. På `lg`
 * ligger de tre til venstre og tre til højre med navet imellem; under `lg`
 * falder det til to spalter og til sidst til én. Navet står FØRST i
 * opmærkningen, så en skærmlæser hører "ét link" før kanalerne — det er
 * rækkefølgen i sætningen, og den skal også gælde uden syn.
 *
 * LINJERNE ER TEGNET ÉN GANG i et kvadrat bag navet og ikke som seks
 * stykker ved hvert kort. Det var dén fejl i LoyalSum-loopet: seks
 * uafhængige stykker i en strakt SVG får hver sin krumning, og markørerne
 * forsvinder. Her er det en prikket ring plus seks korte stråler — de siger
 * "det stråler ud herfra" uden at skulle ramme et kort, der flytter sig med
 * bredden.
 *
 * TEKSTEN ER SIDENS EGEN. Kanalnavnene og forklaringerne kommer fra `VEJE`
 * på siden og er ikke skrevet om — de er efterprøvet mod, hvad produktet
 * faktisk kan, og noten om, at der IKKE er en webshop-integration, står
 * stadig under diagrammet.
 */

const IKONER: Record<
  string,
  { Ikon: React.ComponentType<{ className?: string }>; farve: ChipFarve }
> = {
  Hjemmeside: { Ikon: HjemmesideDuo, farve: "blaa" },
  Webshop: { Ikon: WebshopDuo, farve: "groen" },
  "E-mail": { Ikon: EmailDuo, farve: "violet" },
  "QR-kode": { Ikon: QrDuo, farve: "accent" },
  "Sociale medier": { Ikon: OpslagDuo, farve: "violet" },
  Kvittering: { Ikon: KvitteringDuo, farve: "guld" },
};

/** Pladsen i de to spalter. Tre til venstre, tre til højre. */
const PLADS = [
  "lg:col-start-1 lg:row-start-1",
  "lg:col-start-1 lg:row-start-2",
  "lg:col-start-1 lg:row-start-3",
  "lg:col-start-3 lg:row-start-1",
  "lg:col-start-3 lg:row-start-2",
  "lg:col-start-3 lg:row-start-3",
];

/**
 * Ringen bag navet.
 *
 * Et KVADRAT med `xMidYMid meet`, så cirklen bliver en cirkel. Strålerne
 * peger ikke på et bestemt kort — de siger retningen, og kortene flytter sig
 * med bredden.
 */
function Straaler() {
  const vinkler = [0, 60, 120, 180, 240, 300];
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 hidden aspect-square w-[min(38%,20rem)] -translate-x-1/2 -translate-y-1/2 lg:block"
    >
      <circle
        cx="50"
        cy="50"
        r="34"
        fill="none"
        stroke="var(--accent-lys)"
        strokeWidth="0.8"
        strokeDasharray="1.6 3.2"
        strokeLinecap="round"
        opacity="0.5"
      />
      {vinkler.map((v) => {
        const r = (v * Math.PI) / 180;
        const x1 = 50 + Math.cos(r) * 22;
        const y1 = 50 + Math.sin(r) * 22;
        const x2 = 50 + Math.cos(r) * 32;
        const y2 = 50 + Math.sin(r) * 32;
        return (
          <line
            key={v}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--accent-lys)"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.65"
          />
        );
      })}
    </svg>
  );
}

export function KanalDiagram({
  kanaler,
  link,
}: {
  /** [navn, hvordan] — sidens egne, se `VEJE`. */
  kanaler: readonly (readonly [string, string])[];
  /** Adressen, som den ser ud for kunden. */
  link: string;
}) {
  return (
    <div className="relative">
      <Straaler />

      <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr] lg:grid-rows-3 lg:items-center lg:gap-x-10 lg:gap-y-5">
        {/*
          NAVET STÅR FØRST I OPMÆRKNINGEN og placeres i midterspalten på
          `lg`. Under `lg` er det dermed det første, man møder — "ét link"
          før de seks steder, det kan stå.
        */}
        <li className="sm:col-span-2 lg:col-span-1 lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <div className="relative mx-auto max-w-xs text-center">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-4 rounded-full bg-accent/15 blur-2xl sm:-inset-8"
            />
            <div className="relative">
              <span
                aria-hidden="true"
                className="ikon-felt-fyldt mx-auto grid h-20 w-20 place-items-center rounded-full"
              >
                <LinkIcon className="h-9 w-9 text-white" />
              </span>
              <p className="etiket mt-4">Ét link</p>
              {/* `break-all`: adressen er kundens egen og kan være lang, og
                  en adresse, der løber ud over kortet, er dét, man husker. */}
              <p className="mt-1 break-all font-mono text-sm text-accent">
                {link}
              </p>
            </div>
          </div>
        </li>

        {kanaler.map(([navn, hvordan], i) => {
          const ikon = IKONER[navn];
          return (
            <li key={navn} className={PLADS[i]}>
              <div className="box-shape flex h-full items-start gap-3 border border-border bg-card p-4 shadow-[var(--hoejde-1)]">
                {ikon ? (
                  <IkonChip icon={ikon.Ikon} size="lg" farve={ikon.farve} />
                ) : null}
                <div className="min-w-0">
                  <p className="font-medium">{navn}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {hvordan}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
