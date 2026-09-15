"use client";

import { useActionState } from "react";
import { stampByToken, type StampByTokenState } from "../actions";
import { Button } from "@/components/ui/button";

/**
 * Personale-panel på kundens kort (scan-til-stempel). Vises kun når den
 * besøgende er logget ind som personale for kortets virksomhed — kunder og
 * anonyme ser aldrig denne knap. Selve rettighedstjekket sker server-side i
 * `stampByToken`; dette er blot UI'et.
 *
 * REFERENCEN GØR DOBBELT-INDSENDELSE UFARLIG. `service.ts` har fra begyndelsen
 * lovet, at "dobbelt-submit ikke giver dobbelt stempel" — men løftet hviler på
 * et unikt indeks over `(membership_id, reference)`, og netop DENNE vej, som er
 * den, personalet bruger ved disken, sendte ingen reference. Knappen er
 * ganske vist spærret, mens den arbejder, men det dækker kun ét klik i én
 * fane: en gensendt POST efter en netværkshikke, en genindlæsning med
 * formulardata eller to faner på samme kort gik lige igennem.
 *
 * NØGLEN LAVES PÅ SERVEREN og gives med som en prop. Den må hverken komme fra
 * `useId()`, som er den samme for alle, der har siden åben (to medarbejdere på
 * hver sin telefon ville dele nøgle, og den enes stempel ville stiltiende blive
 * slugt som et gentaget), eller fra `crypto.randomUUID()` i komponenten, som
 * ville give server og browser hver sin værdi. Siden er `force-dynamic`, så
 * hver visning får sin egen — og efter et stempel gentegner `revalidatePath`
 * siden med en ny, så næste stempel går igennem af sig selv.
 */
export function StaffStampPanel({
  token,
  membershipId,
  reference,
}: {
  token: string;
  membershipId: string;
  /** Idempotensnøgle for netop denne visning af kortet. Laves på serveren. */
  reference: string;
}) {
  const [state, action, pending] = useActionState<StampByTokenState, FormData>(
    stampByToken,
    {},
  );

  return (
    <form
      action={action}
      className="box-shape border border-accent/40 bg-accent/5 p-3"
    >
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="membership_id" value={membershipId} />
      <input type="hidden" name="reference" value={reference} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Personale
        </span>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Giver…" : "Giv stempel"}
        </Button>
      </div>
      {state.error ? (
        <p className="mt-2 text-sm text-danger">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="mt-2 text-sm font-medium text-success">
          {/*
            KVITTERINGEN TIL PERSONALET TÆLLER OGSÅ KUN TIL TÆRSKLEN — den sagde
            før "11/10 stempler". Er der stempler ud over, siges det som en
            tilføjelse, så den, der står med kunden, kan nå at sige det højt:
            de bortfalder ved indløsningen, hvis butikken ikke beholder dem.
          */}
          {state.rewardEarned
            ? `🎉 Belønning optjent: ${state.rewardName}. Nu ${Math.min(state.have ?? 0, state.required ?? 0)}/${state.required}.`
            : `Stempel givet · ${Math.min(state.have ?? 0, state.required ?? 0)}/${state.required} stempler.`}
          {(state.have ?? 0) > (state.required ?? 0)
            ? ` (+${(state.have ?? 0) - (state.required ?? 0)} ud over kortet — indløs belønningen først.)`
            : ""}
        </p>
      ) : null}
    </form>
  );
}
