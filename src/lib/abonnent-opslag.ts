import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ABONNEMENTS_SLUGS, sorterAbonnenter, type AbonnentFelter } from "@/lib/abonnenter";
import { hentBetalinger, type Betaling } from "@/lib/stripe-abonnement";
import { erAlvorligt, varslerFor, type Varsel } from "@/lib/abonnent-varsler";

/**
 * Abonnenterne med deres betalinger og varsler — ét sted.
 *
 * ÉN FUNKTION OG IKKE TO FORESPØRGSLER. Abonnentsiden viser listen, og
 * admin-oversigten viser et TAL for, hvor mange der kræver noget. Byggede de
 * hver sit opslag, ville forsiden før eller siden sige "3", mens listen viste
 * fire — og det er den slags uenighed, ingen opdager, fordi begge tal ser
 * rigtige ud hver for sig.
 *
 * `server-only`, fordi den både rører databasen og Stripe. Selve bedømmelsen
 * ligger i `abonnenter.ts` og `abonnent-varsler.ts`, hvor den kan prøves uden
 * et netværk.
 */

export interface Abonnent extends AbonnentFelter {
  id: string;
  name: string;
  cvr: string | null;
  contact_email: string | null;
  user_id: string | null;
  created_at: string;
  stripe_customer_id: string | null;
}

export interface AbonnentOpslag {
  raekker: Abonnent[];
  betalinger: Map<string, Betaling>;
  /** Varsler pr. virksomheds-id. Tom liste for dem, der ikke fejler noget. */
  varsler: Map<string, Varsel[]>;
}

/**
 * Slår abonnenterne op, eventuelt filtreret på en søgning.
 *
 * Søgningen rammer navn, CVR og de tre kontaktveje — det er dem, man har
 * foran sig: et CVR fra en faktura, et nummer fra et indgående opkald.
 */
export async function hentAbonnenter(soegning?: string): Promise<AbonnentOpslag> {
  const supabase = await createClient();

  let query = supabase
    .from("companies")
    .select("*")
    // Abonnenterne er dem, der har købt en vare MED månedspris. Spurgte vi på
    // `plan`, kom en kunde med, hvis niveau er sat i hånden i admin, uden at
    // der er solgt noget — samme grund som harAbonnement() i abonnement.ts.
    .in("product_slug", ABONNEMENTS_SLUGS);

  const term = (soegning ?? "").replace(/[,%]/g, "").trim();
  if (term) {
    query = query.or(
      `name.ilike.%${term}%,cvr.ilike.%${term}%,contact_email.ilike.%${term}%,billing_email.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }

  const { data } = await query;
  const raekker = sorterAbonnenter((data ?? []) as Abonnent[]);

  const betalinger = await hentBetalinger(
    raekker.map((r) => r.stripe_subscription_id),
  );

  const varsler = new Map<string, Varsel[]>();
  for (const r of raekker) {
    const betaling = r.stripe_subscription_id
      ? betalinger.get(r.stripe_subscription_id)
      : undefined;
    varsler.set(r.id, varslerFor(r, betaling));
  }

  return { raekker, betalinger, varsler };
}

/**
 * Hvor mange abonnenter har et ALVORLIGT varsel?
 *
 * Kun de røde tæller. Se `erAlvorligt()`: et kort, der udløber om syv uger, og
 * en opsigelse skal ses, men de skal ikke få et tal på forsiden til at lyse
 * rødt hver dag, indtil nogen rydder dem — og det kan man ikke, for der er
 * intet at rydde.
 */
export function taelAlvorlige(opslag: AbonnentOpslag): number {
  let n = 0;
  for (const liste of opslag.varsler.values()) {
    if (liste.some(erAlvorligt)) n += 1;
  }
  return n;
}
