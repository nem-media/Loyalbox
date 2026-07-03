import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Service-role client. Bypasses RLS. SERVER-ONLY.
 * Use for public writes that have no authenticated user (scan + feedback
 * registration on the /r/[slug] flow) and future webhook handlers.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
