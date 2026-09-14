import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Har denne e-mail allerede en konto — og en virksomhed?
 *
 * DET ER SPØRGSMÅLET, TO FLOWS SKAL STILLE FØR DE GØR NOGET. Bestillingen
 * uden konto skal vide det, før den opretter endnu en virksomhed, og
 * aktiveringen skal vide det, før den beder om en adgangskode, den ikke kan
 * bruge til noget. Begge gik galt på samme rigtige køb 14. september 2026.
 *
 * DER SLÅS OP I `public.users` OG IKKE MED `listUsers()`. Spejlet fyldes af
 * triggeren `on_auth_user_created` (migration 0001), så rækken findes for
 * enhver, der har oprettet sig — og opslaget er ét indeks-slag frem for at
 * hente op til tusind brugere hjem og lede i dem. Prisen er, at en e-mail,
 * der er ÆNDRET efter oprettelsen, ikke er spejlet; derfor beholder
 * aktiveringen `createUser` som den afgørende prøve og bruger kun det her til
 * at vælge, hvad kunden får at se.
 *
 * SVARET ER IKKE "FINDES BRUGEREN", MEN OGSÅ "EJER DEN NOGET". De to fører
 * vidt forskellige steder hen: en slutkunde med et stempelkort har en konto
 * uden virksomhed og skal have lov at købe en stander, mens en butiksejer
 * skal logge ind og bestille derfra, så ordren lander på den aftale, de har.
 */
export interface KontoOpslag {
  brugerId: string;
  /** Ejer brugeren allerede en virksomhed? Så er der et kundeforhold at lande på. */
  harVirksomhed: boolean;
}

export async function findKonto(
  email: string | null | undefined,
): Promise<KontoOpslag | null> {
  const adresse = email?.trim().toLowerCase();
  if (!adresse) return null;

  const admin = createAdminClient();

  /*
   * `eq` og ikke `ilike`: en e-mail må indeholde `_`, som ilike læser som et
   * jokertegn — og et opslag, der matcher for bredt, ville afvise et køb for
   * en fremmed adresse. Supabase gemmer selv adressen med små bogstaver.
   */
  const { data: bruger } = await admin
    .from("users")
    .select("id")
    .eq("email", adresse)
    .maybeSingle();

  if (!bruger) return null;

  const { data: firma } = await admin
    .from("companies")
    .select("id")
    .eq("user_id", bruger.id)
    .limit(1)
    .maybeSingle();

  return { brugerId: bruger.id, harVirksomhed: Boolean(firma) };
}
