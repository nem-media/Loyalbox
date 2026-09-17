"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { MobileNav, type NavLink } from "@/components/mobile-nav";
import { createClient } from "@/lib/supabase/client";

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
 * DER ER INGEN BILLIG MELLEMVEJ. Man kan ikke sætte cache-headere på en side,
 * der indeholder noget personligt, uden at risikere at en fælles cache
 * serverer den ene brugers header til den næste. Delingen ER rettelsen.
 *
 * TRE VALG, DER GØR DEN BILLIG:
 *
 *  1. **Der linkes altid til `/dashboard`.** Rollen ligger i `public.users` og
 *     ville kræve et databaseopslag i browseren ved hver sidevisning. Den er
 *     ikke nødvendig: `/dashboard` sender selv en admin videre til `/admin`,
 *     og det er efterprøvet. Ét opslag sparet for hver eneste besøgende.
 *
 *  2. **Sessionen læses af cookien og ikke over netværket.** `getSession()`
 *     slår op lokalt. Det er nok, fordi knappen er KOSMETIK — den giver ingen
 *     adgang til noget. Adgangen afgøres serverside i `/dashboard`, præcis som
 *     før. Et `getUser()` ville koste en rundtur for at pynte på en knap.
 *
 *  3. **Udgangspunktet er "ikke logget ind".** Næsten alle på en
 *     marketingside er det, og "Kom i gang" er sidens vigtigste knap — den må
 *     ikke komme for sent. Prisen er, at en logget ind bruger ser knapperne
 *     skifte et øjeblik efter. Det er den rigtige vej at tage fejl.
 *
 * PLADSEN RESERVERES, så skiftet ikke flytter noget: de to tilstande er ikke
 * lige brede, og uden `min-w` ville navigationen til venstre rykke sig, hver
 * gang en logget ind bruger åbnede en side. Det ville bytte en cache-gevinst
 * for en layout-forskydning.
 */
export function HeaderKonto({ links }: { links: NavLink[] }) {
  const [loggetInd, setLoggetInd] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let aktiv = true;

    supabase.auth.getSession().then(({ data }) => {
      if (aktiv) setLoggetInd(Boolean(data.session));
    });

    // Logger nogen ud i en anden fane, skal knappen følge med — ellers står
    // der "Dashboard" til en, der ikke længere har et.
    const { data: abonnement } = supabase.auth.onAuthStateChange(
      (_hændelse, session) => {
        if (aktiv) setLoggetInd(Boolean(session));
      },
    );

    return () => {
      aktiv = false;
      abonnement.subscription.unsubscribe();
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
