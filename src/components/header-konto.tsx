"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { MobileNav, type NavLink } from "@/components/mobile-nav";

/**
 * HEADERENS ENESTE PERSONLIGE STYKKE — OG DERFOR DET ENESTE, DER ER KLIENT.
 *
 * `SiteHeader` kaldte `getCurrentUser()`, og dét ene opslag gjorde **ti
 * marketingsider dynamiske**: forsiden, /stempelkort, /reviewstander,
 * /produkter og produktsiderne, hele bloggen, /kontakt, /privatliv og
 * /handelsbetingelser. Målt 2026-09-17 var headeren den ENESTE grund på dem
 * alle — kun /bestil og /databehandleraftale har en anden.
 *
 * Konsekvensen var, at HTML'en blev `no-store`: ingen af siderne kunne ligge
 * på kanten, og browserens bfcache var slået fra, så back-knappen hentede
 * siden igen i stedet for at vise den med det samme. Det koster mest for dem,
 * der er længst væk — og vi har en kunde i Nuuk.
 *
 * DER ER INGEN BILLIG MELLEMVEJ PÅ SERVEREN. Man kan ikke sætte cache-headere
 * på en side, der indeholder noget personligt, uden at risikere at en fælles
 * cache serverer den ene brugers header til den næste. Delingen ER rettelsen.
 *
 * MEN DER ER EN DYR MÅDE AT LAVE DEN PÅ, OG DEN PRØVEDE JEG FØRST. Første
 * udgave brugte Supabases browserklient til at slå sessionen op. Den er
 * korrekt og læser endda udløbstiden — men den trak **64 KB JavaScript** ind
 * på hver eneste marketingside, og målt i produktion faldt forsiden fra 88 til
 * 81. Billedgevinsten fra samme dag blev ædt op af en knap.
 *
 * DERFOR KIGGES DER KUN EFTER COOKIEN. Supabase gemmer sessionen i
 * `sb-<projekt>-auth-token`, og den er med vilje læsbar fra JavaScript —
 * browserklienten har selv brug for den. At se, at den er der, kræver ingen
 * afhængigheder overhovedet.
 *
 * PRISEN ER ÆRLIG: en cookie, der findes, er ikke det samme som en gyldig
 * session. Er tokenet udløbet, står der "Dashboard", og et klik ender på
 * loginsiden — hvilket er nøjagtig dét, en udløbet session SKAL føre til.
 * Knappen er kosmetik; adgangen afgøres serverside i `/dashboard`, præcis som
 * før. Et rigtigt sessionsopslag ville koste 64 KB for at flytte en fejl fra
 * ét klik til nul.
 *
 * `pageshow` ER IKKE VALGFRI, EFTER AT BFCACHE VIRKER. En side, der gendannes
 * fra bfcache, beholder sin gamle tilstand — så uden den her ville en, der
 * loggede ud og trykkede tilbage, stadig se "Dashboard". Det er den slags
 * fejl, man selv laver, når man slår en cache til.
 *
 * TO VALG MERE, DER GØR DEN BILLIG:
 *
 *  1. **Der linkes altid til `/dashboard`.** Rollen ligger i `public.users` og
 *     ville kræve et databaseopslag i browseren. Den er ikke nødvendig:
 *     `/dashboard` sender selv en admin videre til `/admin`, og det er
 *     efterprøvet.
 *
 *  2. **Udgangspunktet er "ikke logget ind".** Næsten alle på en
 *     marketingside er det, og "Kom i gang" er sidens vigtigste knap — den må
 *     ikke komme for sent. Prisen er, at en logget ind bruger ser knapperne
 *     skifte et øjeblik efter. Det er den rigtige vej at tage fejl.
 *
 * PLADSEN RESERVERES, så skiftet ikke flytter noget: de to tilstande er ikke
 * lige brede, og uden `min-w` ville navigationen til venstre rykke sig, hver
 * gang en logget ind bruger åbnede en side. Det ville bytte en cache-gevinst
 * for en layout-forskydning.
 */

/** Ligger der en Supabase-sessionscookie? Se hovedet for hvorfor det er nok. */
function harSessionsCookie(): boolean {
  return document.cookie
    .split(";")
    .some((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.split("=")[0].trim()));
}

export function HeaderKonto({ links }: { links: NavLink[] }) {
  const [loggetInd, setLoggetInd] = useState(false);

  useEffect(() => {
    const opdater = () => setLoggetInd(harSessionsCookie());
    opdater();

    // Gendannes siden fra bfcache, er tilstanden den gamle — og efter en
    // udlogning ville der stadig stå "Dashboard".
    window.addEventListener("pageshow", opdater);
    // Skiftes der tilbage til fanen, kan der være logget ud i en anden.
    document.addEventListener("visibilitychange", opdater);
    return () => {
      window.removeEventListener("pageshow", opdater);
      document.removeEventListener("visibilitychange", opdater);
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div className="hidden min-w-[228px] items-center justify-end gap-2 lg:flex">
        {loggetInd ? (
          <ButtonLink variant="secondary" href="/dashboard" size="md">
            Dashboard
          </ButtonLink>
        ) : (
          <>
            <ButtonLink
              href="/login"
              variant="ghost-invert"
              size="md"
              className="whitespace-nowrap"
            >
              Log ind
            </ButtonLink>
            <ButtonLink href="/signup" size="md" className="whitespace-nowrap">
              Kom i gang
            </ButtonLink>
          </>
        )}
      </div>

      <MobileNav links={links} loggedIn={loggetInd} dashboardHref="/dashboard" />
    </div>
  );
}
