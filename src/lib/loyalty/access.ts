import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Adgangskontrol for loyalitetsmodulet. Løser om den aktuelle bruger må handle
 * på en virksomheds vegne — som ejer eller som aktiv medarbejder — og med hvilke
 * rettigheder. Alle mutations skal validere mod denne, jf. sikkerhedsafsnittet.
 *
 * v1: virksomhedsejer agerer også personale (fulde rettigheder). Employee-login
 * er forberedt via `employees.user_id`, men fuld medarbejder-onboarding kommer i
 * en senere fase. (Antagelse dokumenteret.)
 */
export interface LoyaltyPermissions {
  canStamp: boolean;
  canDiscount: boolean;
  canRedeem: boolean;
  canManage: boolean;
}

export interface CompanyAccess {
  companyId: string;
  actorUserId: string;
  role: "owner" | "employee";
  employeeId: string | null;
  permissions: LoyaltyPermissions;
}

const FULL: LoyaltyPermissions = {
  canStamp: true,
  canDiscount: true,
  canRedeem: true,
  canManage: true,
};

/**
 * Returnerer adgangen for den aktuelle bruger. Ejer får fulde rettigheder til
 * egen virksomhed; en medarbejder får deres tildelte rettigheder. Null hvis
 * brugeren hverken ejer eller er ansat i en virksomhed.
 */
export async function getCompanyAccess(): Promise<CompanyAccess | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  // Ejer: har en virksomhed knyttet direkte.
  if (user.company) {
    return {
      companyId: user.company.id,
      actorUserId: user.id,
      role: "owner",
      employeeId: null,
      permissions: FULL,
    };
  }

  // Medarbejder: aktiv employee-række knyttet til denne bruger.
  const supabase = await createClient();
  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (employee) {
    return {
      companyId: employee.company_id,
      actorUserId: user.id,
      role: "employee",
      employeeId: employee.id,
      permissions: {
        canStamp: employee.can_stamp,
        canDiscount: employee.can_discount,
        canRedeem: employee.can_redeem,
        canManage: employee.can_manage,
      },
    };
  }

  return null;
}

/** Bekræfter adgang til en bestemt virksomhed (org-isolering). */
export async function requireCompanyAccess(
  companyId: string,
): Promise<CompanyAccess | null> {
  const access = await getCompanyAccess();
  if (!access || access.companyId !== companyId) return null;
  return access;
}
