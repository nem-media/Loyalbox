"use client";

import { useSyncExternalStore } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OffentligKontakt } from "./offentlig-kontakt";

/**
 * Forslaget om at vise kundescoren offentligt.
 *
 * DEN MÅ IKKE VÆRE PÅTRÆNGENDE. Derfor kan den lukkes med "Ikke nu", og
 * derfor kommer den kun, når svaret formentlig er ja — betingelserne står i
 * `boerForeslaaOffentlig()` og afgøres på serveren, ikke her.
 *
 * "IKKE NU" GEMMES I BROWSEREN og ikke i basen. Et afvist forslag er ikke en
 * oplysning om virksomheden, der skal overleve på tværs af enheder — og en
 * kolonne til det ville være en migration for at kunne huske et nej til en
 * anbefaling. Prisen den anden vej er, at forslaget kan dukke op igen på en ny
 * telefon; det er et forslag, ikke en fejl. Kontakten står under alle
 * omstændigheder i afsnittet nedenunder hele tiden.
 *
 * FORSLAGET ÆNDRER INTET VED MÅLINGEN. Hverken flowet, hvem der bliver spurgt,
 * eller hvordan scoren regnes, afhænger af, om det vises eller tages imod. Det
 * eneste, virksomheden vælger, er om det samlede tal står offentligt.
 */

/** Nøglen, "Ikke nu" huskes under. Samme navnestil som samtykket. */
export const NUDGE_SKJULT_KEY = "loyalsum-kundescore-forslag-skjult";

/** Besked om at forslaget er lukket i DENNE fane. */
const AENDRET = "loyalsum:kundescore-forslag";

/**
 * Serveren kan ikke se localStorage. Svarede den "ikke lukket", ville
 * forslaget blive tegnet på serveren og først forsvinde efter hydrering —
 * altså blinke frem hver eneste gang hos den, der lige har sagt "Ikke nu".
 * Samme greb som samtykkebanneret i `analytics.tsx`.
 */
const UKENDT = "?";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(AENDRET, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(AENDRET, onChange);
  };
}

/**
 * Lukket i DENNE fane. Kan lageret ikke skrives — privat vindue, blokerede
 * cookies — skal et tryk på "Ikke nu" stadig gøre noget med det samme. Så
 * holder det bare ikke længere end fanen.
 */
let lukketHer = false;

// Skal give en STABIL streng mellem kald — ikke et nyt objekt, som React ville
// se som en ændring hver gang.
function getSnapshot(): string {
  if (lukketHer) return "1";
  try {
    return window.localStorage.getItem(NUDGE_SKJULT_KEY) ?? "";
  } catch {
    // Kan lageret ikke læses, vises forslaget. Et forslag for meget er bedre
    // end en funktion, der forsvinder.
    return "";
  }
}

function getServerSnapshot(): string {
  return UKENDT;
}

export function OffentligNudge({
  antal,
  kundescore,
}: {
  antal: number;
  kundescore: number;
}) {
  const skjult = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (skjult !== "") return null;

  return (
    <Card className="mb-4">
      <CardBody>
        <p className="font-medium">Din kundescore ser stærk ud</p>
        <p className="mt-1 text-sm text-muted">
          Du har nu {antal} kundeoplevelser og en kundescore på{" "}
          {kundescore.toFixed(1).replace(".", ",")} / 5. Vil du vise den til
          dine kunder?
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <OffentligKontakt til={false} label="Vis min kundescore" />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              lukketHer = true;
              try {
                window.localStorage.setItem(NUDGE_SKJULT_KEY, "1");
              } catch {
                // Kan der ikke gemmes, gælder lukningen kun denne fane.
              }
              window.dispatchEvent(new Event(AENDRET));
            }}
          >
            Ikke nu
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
