import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard-shell";
import { TIER_LABELS, type Tier } from "@/lib/constants";
import { PlanPicker } from "./plan-picker";

export const metadata = { title: "Abonnement" };

export default async function SubscriptionPage() {
  const user = await getCurrentUser();
  const company = user!.company;
  const plan = (company?.plan ?? "basic") as Tier;

  return (
    <>
      <PageHeader
        title="Abonnement"
        description={`Din nuværende plan er ${TIER_LABELS[plan]}. Op- eller nedgrader når som helst.`}
      />

      <div className="mb-6 box-shape border border-secondary/30 bg-secondary/10 p-4 text-sm text-muted">
        Betaling via Stripe kommer snart. Indtil da aktiveres dit planskift med
        det samme, så du kan komme i gang og prøve funktionerne.
      </div>

      <PlanPicker currentPlan={plan} />
    </>
  );
}
