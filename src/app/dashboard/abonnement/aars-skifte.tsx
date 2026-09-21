"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Besked } from "@/components/ui/besked";
import { IkonChip } from "@/components/ui/ikon-chip";
import { KvitteringDuo } from "@/components/duotone-ikoner";
import { formatCurrency } from "@/lib/utils";
import { skiftTilAar, type AarsSkifteResultat } from "./actions";

/**
 * "Betal for et år og få en måned gratis".
 *
 * DER STÅR HVAD DET KOSTER, FØR MAN TRYKKER. Knappen trækker beløbet med det
 * samme — kunden har selv trykket, og så skal pengene også tages nu — og et
 * træk på flere tusind kroner må aldrig komme som en overraskelse. Derfor
 * står årsprisen, besparelsen OG at det trækkes nu, i klartekst over knappen.
 *
 * DET ER IKKE EN BINDING, OG DET SIGES HØJT. Handelsbetingelsernes §6 gælder
 * uændret: man kan opsige når som helst, og opsigelsen træder i kraft ved
 * udgangen af den betalte periode — den er bare tolv måneder nu. Blandes de
 * to sammen, sælger vi noget andet, end vi leverer.
 *
 * VEJEN TILBAGE STÅR OGSÅ HER. "Opad ja, nedad nej" er husets regel, og en
 * knap uden en vej tilbage er en fælde; linjen siger, at vi laver det om, hvis
 * man skriver.
 */
export function AarsSkifte({
  aarPris,
  sparer,
  maanedPris,
}: {
  aarPris: number;
  sparer: number;
  maanedPris: number;
}) {
  const [state, action, pending] = useActionState<AarsSkifteResultat, FormData>(
    async () => skiftTilAar(),
    {},
  );

  if (state.ok) {
    return (
      <div className="mt-6 border-t border-border pt-5">
        <Besked slags="ok">
          Du betaler nu for et år ad gangen. Kvitteringen ligger under Betaling
          og kvitteringer.
        </Besked>
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-border pt-5">
      <div className="box-shape teal-skaer flex items-start gap-3.5 border border-accent/25 bg-card p-5">
        <IkonChip icon={KvitteringDuo} size="lg" farve="guld" />
        <div className="min-w-0 flex-1">
          <p className="font-bold tracking-tight">Betal for et år — og spar en måned</p>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
            {formatCurrency(aarPris)} for tolv måneder i stedet for{" "}
            {formatCurrency(maanedPris)} om måneden. Du sparer{" "}
            <strong className="text-foreground">{formatCurrency(sparer)}</strong> om
            året.
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Beløbet trækkes med det samme, og det, du allerede har betalt for
            indeværende måned, modregnes. Det er ikke en bindingsperiode — du
            kan opsige når som helst, og adgangen løber perioden ud.
          </p>

          <form action={action} className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Skifter…" : "Skift til årsbetaling"}
            </Button>
          </form>

          {state.fejlbesked ? (
            <div className="mt-3">
              <Besked slags="fejl">{state.fejlbesked}</Besked>
            </div>
          ) : null}

          <p className="mt-3 text-xs text-muted">
            Vil du tilbage til månedsbetaling, så skriv til os — så ordner vi
            det ved periodens udløb.
          </p>
        </div>
      </div>
    </div>
  );
}
