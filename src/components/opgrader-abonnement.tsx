"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { Besked } from "@/components/ui/besked";
import { TERMS_VERSION } from "@/lib/constants";
import {
  opgraderTil,
  type OpgraderingsResultat,
} from "@/app/dashboard/abonnement/actions";

/**
 * "Opgrader til Komplet" — på det abonnement, der allerede kører.
 *
 * Grenen i `/bestil`, når `koebSpaerre()` svarer `opgradering`. Før gik
 * kunden herfra videre til en ny betaling og fik et abonnement nummer to;
 * se `opgraderAbonnement()`.
 *
 * TEKSTEN SIGER DET, EJEREN BESTEMTE: forskellen nu, den fulde pris fra
 * næste dato, samme stander. Kunden skal kunne læse, hvad der sker med
 * kortet, FØR hun trykker — beløbet i dag kender vi ikke på forhånd (Stripe
 * regner det ud på dagen), så det står i mailen bagefter og ikke her.
 */
export function OpgraderAbonnement({
  produkt,
  vare,
  nuvaerende,
  nyPris,
  aarligt,
  kraeverDpa,
}: {
  produkt: string;
  vare: string;
  nuvaerende: string;
  /** Den nye pris ex moms pr. QR-adresse i kundens interval. */
  nyPris: string;
  aarligt: boolean;
  kraeverDpa: boolean;
}) {
  const [state, action, pending] = useActionState<OpgraderingsResultat, FormData>(
    opgraderTil,
    {},
  );
  const [accepteret, setAccepteret] = useState(false);
  const feltId = useId();

  if (state.ok) {
    return (
      <div className="box-shape border border-accent/30 bg-accent/5 p-5">
        <p className="font-bold tracking-tight">Du har nu {vare}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          De nye funktioner er åbne i dit dashboard. Du får en bekræftelse på
          mail med beløbet, og kvitteringen kommer fra Stripe.
        </p>
        <ButtonLink href="/dashboard" size="sm" className="mt-4">
          Gå til dashboardet
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="box-shape border border-accent/30 bg-accent/5 p-5">
      <p className="font-bold tracking-tight">
        Opgrader fra {nuvaerende} til {vare}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Du beholder dit abonnement, din stander og dine QR-adresser. I dag
        betaler du kun forskellen for resten af den periode, du allerede har
        betalt for. Fra næste betalingsdato trækkes den fulde pris for {vare},{" "}
        <strong className="text-foreground">
          {nyPris} {aarligt ? "om året" : "om måneden"} ex moms
        </strong>
        , på samme dato som i dag.
      </p>

      <form action={action} className="mt-4">
        <input type="hidden" name="produkt" value={produkt} />
        <div className="mb-3 flex items-start gap-2.5">
          <input
            id={feltId}
            name="accepterVilkaar"
            type="checkbox"
            checked={accepteret}
            onChange={(e) => setAccepteret(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-accent"
          />
          <label htmlFor={feltId} className="text-sm leading-relaxed">
            Jeg accepterer{" "}
            <Link
              href="/handelsbetingelser"
              className="font-medium text-accent hover:underline"
            >
              handelsbetingelserne
            </Link>{" "}
            (version {TERMS_VERSION})
            {kraeverDpa ? (
              <>
                {" "}
                og{" "}
                <Link
                  href="/databehandleraftale"
                  className="font-medium text-accent hover:underline"
                >
                  databehandleraftalen
                </Link>
              </>
            ) : null}
            , og at jeg køber som virksomhed.
          </label>
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending || !accepteret}
        >
          {pending ? "Opgraderer…" : `Opgrader til ${vare}`}
        </Button>
      </form>

      {state.fejlbesked ? (
        <Besked slags="fejl" className="mt-3">
          {state.fejlbesked}
          {state.fakturaUrl ? (
            <>
              {" "}
              <a
                href={state.fakturaUrl}
                className="font-medium underline"
              >
                Åbn betalingen hos Stripe
              </a>
            </>
          ) : null}
        </Besked>
      ) : null}
    </div>
  );
}
