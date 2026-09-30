import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role-klienten til commerce-tabellerne.
 *
 * UTYPET MED VILJE. `src/lib/types/database.ts` er skrevet i hånden, og
 * commerce-tabellerne læses kun her i modulet, gennem rækketyperne i
 * `rows.ts`. En typet klient ville kræve ti tabeller og elleve funktioner
 * skrevet af i den fælles fil, uden at noget andet sted i koden får gavn af
 * det — og den dag `supabase gen types` kobles på, kommer de af sig selv.
 */
export type CommerceDb = SupabaseClient;

export function commerceDb(): CommerceDb {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
