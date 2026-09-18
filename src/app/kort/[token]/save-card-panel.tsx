"use client";

import { useActionState } from "react";
import { claimCard, type ClaimCardState } from "../actions";
import { Button } from "@/components/ui/button";

/**
 * "Gem kortet på min konto" — vises kun til en indlogget kunde, hvis kortet
 * endnu ikke er knyttet til en konto. Selve autorisationen ligger server-side i
 * `claimCard`; her er kun knappen.
 *
 * TEKSTEN SKAL SIGE, HVAD HANDLINGEN GØR — OG DEN GJORDE DET IKKE.
 *
 * Der stod kun "Så kan du altid finde det igen — også hvis du skifter
 * telefon". Det er sandt for den, der trykker. Men handlingen er
 * UIGENKALDELIG og eksklusiv: et kort kan kun ligge på ÉN konto, der findes
 * ingen "fjern fra min konto" nogen steder i systemet, og bagefter spærrer
 * `selfEnroll()` og `/kort/find` for at åbne kortet med e-mail eller telefon
 * (se `kort-link.ts`). For alle ANDRE end den, der trykkede, betyder knappen
 * altså det stik modsatte af, hvad der stod.
 *
 * DET ER IKKE EN TEORETISK RISIKO. Kortets adresse er ét link, og et link
 * bliver delt: kunden viser sit kort til en, der selv er logget ind, og ét
 * klik flytter kortet permanent. Den oprindelige ejer kan derefter ikke få det
 * tilbage uden at skrive til os.
 *
 * Der er BEVIDST ikke sat en bekræftelsesdialog på. Modellen er den rigtige —
 * besiddelse af tokenet ER autorisationen, og det er dét, der gør, at kortet
 * virker uden konto. Det, der manglede, var at sige konsekvensen HØJT, før
 * nogen trykker.
 */
export function SaveCardPanel({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ClaimCardState, FormData>(
    claimCard,
    {},
  );

  if (state.ok) {
    return (
      <div className="box-shape border border-success/30 bg-success/10 p-4 text-center text-sm font-medium text-success-tekst">
        Kortet er gemt på din konto. Du finder det nu under &laquo;Mine
        stempelkort&raquo;.
      </div>
    );
  }

  return (
    <form
      action={action}
      className="box-shape border border-border bg-card p-4 text-center"
    >
      <input type="hidden" name="token" value={token} />
      <p className="text-sm font-medium">Gem kortet på din konto</p>
      <p className="mt-1 text-xs text-muted">
        Så kan du altid finde det igen — også hvis du skifter telefon.
      </p>
      {/* Konsekvensen står FØR knappen og ikke som en note bagefter: den skal
          læses af den, der er ved at trykke. */}
      <p className="mt-2 text-xs text-muted">
        Kortet kan kun ligge på <span className="font-medium">én</span> konto.
        Gemmer du det her, kan det ikke flyttes bagefter — og det kan ikke
        længere hentes frem med e-mail eller telefon.
      </p>
      <Button type="submit" size="sm" className="mt-3" disabled={pending}>
        {pending ? "Gemmer…" : "Gem på min konto"}
      </Button>
      {state.error ? (
        <p className="mt-2 text-sm text-danger">{state.error}</p>
      ) : null}
    </form>
  );
}
