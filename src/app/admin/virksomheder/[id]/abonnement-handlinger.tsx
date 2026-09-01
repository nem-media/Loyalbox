"use client";

import { useActionState } from "react";
import {
  fortrydOpsigelse,
  genoptagKundeforhold,
  opsigAbonnement,
  type FormResult,
} from "../../actions";
import { Button } from "@/components/ui/button";

/**
 * De handlinger, admin kan tage på et kundeforhold.
 *
 * TRE OG IKKE FLERE. Kortet ovenfor viser en halv snes felter, og næsten alle
 * af dem er noget, der SKAL komme fra Stripe eller fra en webhook. Det, der
 * hører hjemme i en menneskehånd, er de tre situationer, hvor en kunde ringer:
 * hun vil opsige, hun fortrød, eller hun har betalt og skal have adgangen igen.
 *
 * DER ER IKKE EN KNAP TIL AT UDSÆTTE EN SLETNING, og det er med vilje. Se
 * `genoptagKundeforhold()` — en sletning udsættes ikke lovligt; det, der
 * lovligt standser uret, er, at aftalen er i kraft igen.
 *
 * HVER KNAP ER SIN EGEN FORMULAR. Med én formular og tre submit-knapper ville
 * et tryk på Enter i feltet ramme den første knap — og den første ville være
 * en opsigelse.
 */

/** Fælles knap med bekræftelse, ventetilstand og svar. */
function Handling({
  action,
  companyId,
  subscriptionId,
  label,
  venter,
  bekraeft,
  variant = "outline",
  hjaelp,
}: {
  action: (prev: FormResult, data: FormData) => Promise<FormResult>;
  companyId: string;
  subscriptionId?: string | null;
  label: string;
  venter: string;
  /** Teksten i browserens bekræftelse. Udelades kun for det, der ikke gør noget ved kunden. */
  bekraeft?: string;
  variant?: "outline" | "danger";
  hjaelp: string;
}) {
  const [state, formAction, pending] = useActionState<FormResult, FormData>(
    action,
    {},
  );

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        // `confirm` er browserens egen og blokerer siden, hvilket er præcis
        // pointen: de her tre ting koster penge eller adgang, og de skal ikke
        // kunne ske ved et strejf på en mobil.
        if (bekraeft && !window.confirm(bekraeft)) e.preventDefault();
      }}
    >
      <input type="hidden" name="company_id" value={companyId} />
      {subscriptionId ? (
        <input type="hidden" name="subscription_id" value={subscriptionId} />
      ) : null}

      <Button type="submit" size="sm" variant={variant} disabled={pending}>
        {pending ? venter : label}
      </Button>
      <p className="mt-1 text-xs text-muted">{hjaelp}</p>
      {state.ok ? (
        <p className="mt-1 text-xs text-success">Gennemført.</p>
      ) : null}
      {state.error ? (
        <p className="mt-1 text-xs text-danger">{state.error}</p>
      ) : null}
    </form>
  );
}

export function AbonnementHandlinger({
  companyId,
  subscriptionId,
  stopperVedPeriodeslut,
  kanGenoptages,
}: {
  companyId: string;
  subscriptionId: string | null;
  /** Fra Stripe. Undefined, hvis vi ikke fik svar — så vises ingen af de to. */
  stopperVedPeriodeslut: boolean | undefined;
  /** Sandt når kundeforholdet er suspenderet eller ophørt. */
  kanGenoptages: boolean;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-6 border-t border-border pt-4">
      {kanGenoptages ? (
        <Handling
          action={genoptagKundeforhold}
          companyId={companyId}
          label="Genoptag kundeforholdet"
          venter="Genoptager…"
          bekraeft="Genoptag kundeforholdet? Suspensionen og ophøret ryddes, kundens niveau gendannes fra varen, og den sletning, der var på vej, standser."
          hjaelp="Når kunden har betalt — også uden om Stripe."
        />
      ) : null}

      {/* Kræver et abonnement hos Stripe OG et svar derfra: uden svaret ved vi
          ikke, om den rigtige knap er "opsig" eller "fortryd". */}
      {subscriptionId && stopperVedPeriodeslut === false ? (
        <Handling
          action={opsigAbonnement}
          companyId={companyId}
          subscriptionId={subscriptionId}
          label="Opsig ved periodens udløb"
          venter="Opsiger…"
          variant="danger"
          bekraeft="Opsig abonnementet ved periodens udløb? Kunden beholder adgangen perioden ud, og der trækkes ikke igen bagefter."
          hjaelp="Perioden køres ud. Kan fortrydes indtil da."
        />
      ) : null}

      {subscriptionId && stopperVedPeriodeslut === true ? (
        <Handling
          action={fortrydOpsigelse}
          companyId={companyId}
          subscriptionId={subscriptionId}
          label="Fortryd opsigelsen"
          venter="Fortryder…"
          hjaelp="Abonnementet fornys igen som før."
        />
      ) : null}
    </div>
  );
}
