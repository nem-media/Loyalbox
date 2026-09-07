import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userHasCards } from "@/lib/loyalty/member-account";
import { valgtSupportVirksomhed } from "@/lib/support-adgang";
import type { Database, UserRole } from "@/lib/types/database";

type CompanyRow = Database["public"]["Tables"]["companies"]["Row"];

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  company: CompanyRow | null;
  /**
   * Ser en ADMIN på en kundes virksomhed lige nu?
   *
   * `company` er så kundens, mens `id`, `email` og `role` bliver ved at være
   * admins egne. Det er hele forskellen på den her løsning og at logge ind som
   * kunden: alt, der spørger hvem der handler, får stadig det rigtige svar.
   * Se `src/lib/support-adgang.ts`.
   */
  supportFor: CompanyRow | null;
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

  /*
   * ADMIN I SUPPORTTILSTAND. Admin har ingen egen virksomhed, så dashboardet
   * ville ellers sende dem videre. Er der valgt en kunde, hentes DEN — med
   * service-role, fordi admin ikke ejer rækken, og fordi rollen allerede er
   * kontrolleret her.
   */
  let supportFor: CompanyRow | null = null;
  if (role === "admin") {
    const valgt = await valgtSupportVirksomhed();
    if (valgt) {
      const { data } = await createAdminClient()
        .from("companies")
        .select("*")
        .eq("id", valgt)
        .maybeSingle();
      supportFor = data ?? null;
    }
  }

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
    // Supportvirksomheden træder i stedet for admins (ikke-eksisterende) egen,
    // så hver dashboardside virker uden at kende til supporttilstanden.
    company: company ?? supportFor,
    supportFor,
  };
}

/**
 * Hvor hører brugeren hjemme efter login? Butiksejere og medarbejdere på
 * dashboardet, slutkunder med stempelkort på `/mine-kort`. Bruges når der ikke
 * er et eksplicit `next` at vende tilbage til.
 *
 * Kører med service-role, fordi den kaldes lige efter login hvor session-cookien
 * endnu ikke nødvendigvis er læsbar i samme request.
 */
export async function resolveLandingPath(userId: string): Promise<string> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.role === "admin") return "/admin";

  const { data: company } = await admin
    .from("companies")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (company) return "/dashboard";

  const { data: employee } = await admin
    .from("employees")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (employee) return "/dashboard";

  if (await userHasCards(userId)) return "/mine-kort";
  return "/dashboard";
}
