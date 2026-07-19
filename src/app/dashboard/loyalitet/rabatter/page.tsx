import { getCompanyAccess } from "@/lib/loyalty/access";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  DISCOUNT_TYPE_LABELS,
  DISCOUNT_STATUS_LABELS,
  type DiscountStatus,
} from "@/lib/loyalty/constants";

export const metadata = { title: "Rabatter" };

const tone: Record<DiscountStatus, "success" | "neutral" | "warning"> = {
  active: "success",
  draft: "neutral",
  paused: "warning",
  archived: "neutral",
};

export default async function DiscountsPage() {
  const access = await getCompanyAccess();
  if (!access) return null;

  const supabase = await createClient();
  const { data: discounts } = await supabase
    .from("discounts")
    .select("*")
    .eq("company_id", access.companyId)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Rabatter"
        description="Tilbud du kan give kunder — også som kompensation."
        action={
          <ButtonLink href="/dashboard/loyalitet/rabatter/ny" size="sm">
            Opret rabat
          </ButtonLink>
        }
      />

      {!discounts || discounts.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center">
            <p className="font-medium">Ingen rabatter endnu.</p>
            <p className="mt-1 text-sm text-muted">
              Opret fx en velkomst- eller kompensationsrabat.
            </p>
            <div className="mt-4">
              <ButtonLink href="/dashboard/loyalitet/rabatter/ny">
                Opret din første rabat
              </ButtonLink>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {discounts.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{d.name}</span>
                  <Badge tone={tone[d.status]}>
                    {DISCOUNT_STATUS_LABELS[d.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {DISCOUNT_TYPE_LABELS[d.type]}
                  {d.type === "percent"
                    ? ` · ${d.value}%`
                    : d.type === "fixed_amount"
                      ? ` · ${formatCurrency(d.value)}`
                      : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
