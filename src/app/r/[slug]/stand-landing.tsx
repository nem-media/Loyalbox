"use client";

import { useState } from "react";
import { ReviewFlow, type PublicLink, type ExtraLink } from "./review-flow";
import { Button, ButtonLink } from "@/components/ui/button";

/**
 * Standerens "Hvad vil du?"-landing.
 *
 * TRE FRIE VALG, side om side og med samme vægt: del din oplevelse, åbn dit
 * stempelkort, og forretningens eget link. Review-flowet og loyalitets-flowet
 * er adskilte og uafhængige handlinger — en belønning må aldrig betinges af en
 * offentlig anmeldelse — og det egne link er slet ikke en anmeldelse.
 *
 * DET EGNE LINK LÅ FØR SOM EN LILLE TEKSTLINJE nede i anmeldelsesflowet, altså
 * bag et valg man skulle have truffet først. Det gav to problemer: en gæst,
 * der bare ville se menukortet, skulle igennem stjernerne for at finde det, og
 * en butik uden stempelkort så det aldrig som andet end fodnote.
 *
 * SIDEN SPRINGES OVER, NÅR DER KUN ER ÉT VALG. En butik uden stempelkort og
 * uden eget link har kun anmeldelsen tilbage, og et "vælg mellem én ting" er
 * et klik uden indhold.
 */
export function StandLanding({
  enrollHref,
  standId,
  companyId,
  publicLinks,
  extra,
}: {
  /** Null når butikken ikke har stempelkort. */
  enrollHref: string | null;
  standId: string;
  companyId: string;
  publicLinks: PublicLink[];
  extra?: ExtraLink | null;
}) {
  const [mode, setMode] = useState<"choose" | "review">("choose");

  // Anmeldelsen tælles ikke med: den er der altid, og det er den, der bliver
  // tilbage, hvis de to andre mangler.
  const antalEkstra = (enrollHref ? 1 : 0) + (extra ? 1 : 0);

  if (mode === "review" || antalEkstra === 0) {
    return (
      <ReviewFlow
        standId={standId}
        companyId={companyId}
        publicLinks={publicLinks}
        extra={extra}
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-medium">Hvad vil du gerne?</p>

      <Button className="w-full" size="lg" onClick={() => setMode("review")}>
        Del din oplevelse
      </Button>

      {enrollHref ? (
        <ButtonLink
          href={enrollHref}
          variant="outline"
          size="lg"
          className="w-full"
        >
          Åbn dit stempelkort
        </ButtonLink>
      ) : null}

      {/* Butikkens eget link — menukort, booking, webshop. Labelen er deres
          egen, så knappen siger hvad den gør frem for "Se mere". */}
      {extra ? (
        <ButtonLink
          href={extra.url}
          variant="outline"
          size="lg"
          className="w-full"
        >
          {extra.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}
