import { createClient } from "@/lib/supabase/server";
import type { Database, UserRole } from "@/lib/types/database";

type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  company: CompanyRow | null;
}

/**
 * Resolves the logged-in user together with their role and (for customers)
 * their company. Returns null when not authenticated.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role, email")
    .eq("id", user.id)
    .single();

  const role: UserRole = profile?.role ?? "customer";

  let company: CompanyRow | null = null;
  if (role === "customer") {
    const { data } = await supabase
      .from("companies")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    company = data ?? null;
  }

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    role,
    company,
  };
}
