import { redirect } from "next/navigation";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { GuideHint } from "@/components/guide";
import { EmployeeForm } from "./employee-form";
import { EmployeeCard, type EmployeeRow } from "./employee-card";

export const metadata = { title: "Personale" };

/**
 * Ejerens side til at give personalet adgang.
 *
 * Før denne side kunne medarbejdere kun oprettes ved at skrive til os, fordi
 * `employees`-rækken skulle laves i hånden. Nu inviterer ejeren selv.
 *
 * Listen læses med service-role: rækkerne ligger bag RLS pr. virksomhed, og
 * adgangen er allerede afgjort af getCompanyAccess ovenfor. Samme mønster som
 * personalesiden på /personale.
 */
export default async function StaffAdminPage() {
  const access = await getCompanyAccess();

  // Kun ejeren. En medarbejder må stemple, men ikke give andre adgang.
  if (!access) redirect("/dashboard");
  if (access.role !== "owner") redirect("/personale");

  const admin = createAdminClient();

  const { data: employees } = await admin
    .from("employees")
    .select("id, name, email, is_active, can_stamp, can_discount, can_redeem, user_id")
    .eq("company_id", access.companyId)
    .order("created_at", { ascending: true });

  // Har de logget ind endnu? Det er den hyppigste grund til at "medarbejderen
  // kan ikke stemple" — invitationen er aldrig blevet accepteret.
  //
  // Signalet skal hentes fra auth og ikke fra public.users: den række oprettes
  // af en trigger allerede ved invitationen, så den ville sige ja for alle.
  const userIds = (employees ?? [])
    .map((e) => e.user_id)
    .filter((id): id is string => Boolean(id));

  const signedIn = new Set<string>();
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data.user?.last_sign_in_at) signedIn.add(id);
    }),
  );

  const rows: EmployeeRow[] = (employees ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    is_active: e.is_active,
    can_stamp: e.can_stamp,
    can_discount: e.can_discount,
    can_redeem: e.can_redeem,
    hasSignedIn: Boolean(e.user_id && signedIn.has(e.user_id)),
  }));

  return (
    <>
      <PageHeader
        title="Personale"
        description="Giv dine ansatte adgang til at stemple og indløse — uden at dele din egen adgangskode."
      />

      <GuideHint id="personale" className="mb-6" />

      <Card className="mb-6">
        <CardBody>
          <h2 className="mb-4 font-bold tracking-tight">Tilføj medarbejder</h2>
          <EmployeeForm />
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center">
            <p className="font-medium">Du har endnu ingen medarbejdere.</p>
            <p className="mt-1 text-sm text-muted">
              Du kan sagtens køre videre alene — som ejer kan du selv stemple.
              Tilføj personale, når nogen andre skal kunne betjene kortene.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((e) => (
            <EmployeeCard key={e.id} employee={e} />
          ))}
        </div>
      )}
    </>
  );
}
