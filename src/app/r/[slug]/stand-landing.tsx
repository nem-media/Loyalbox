"use client";

import { useState } from "react";
import { ReviewFlow } from "./review-flow";
import { Button, ButtonLink } from "@/components/ui/button";

/**
 * Standerens "Hvad vil du?"-landing. Review-flowet og loyalitets-flowet er
 * adskilte, uafhængige handlinger — en belønning må aldrig betinges af en
 * offentlig anmeldelse, så de to ting præsenteres som frie valg side om side.
 */
export function StandLanding({
  enrollHref,
  standId,
  companyId,
  publicUrl,
  publicLabel,
}: {
  enrollHref: string;
  standId: string;
  companyId: string;
  publicUrl: string | null;
  publicLabel: string;
}) {
  const [mode, setMode] = useState<"choose" | "review">("choose");

  if (mode === "review") {
    return (
      <ReviewFlow
        standId={standId}
        companyId={companyId}
        publicUrl={publicUrl}
        publicLabel={publicLabel}
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-medium">Hvad vil du gerne?</p>
      <Button className="w-full" size="lg" onClick={() => setMode("review")}>
        Del din oplevelse
      </Button>
      <ButtonLink
        href={enrollHref}
        variant="outline"
        size="lg"
        className="w-full"
      >
        Åbn dit stempelkort
      </ButtonLink>
    </div>
  );
}
