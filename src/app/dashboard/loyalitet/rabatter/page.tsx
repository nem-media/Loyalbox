import { getCompanyAccess } from "@/lib/loyalty/access";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { GuideHint } from "@/components/guide";
import { Badge } from "@/components/ui/badge";
import { Liste, ListeRaekke, ListeTekst } from "@/components/ui/liste";
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

      <GuideHint id="rabatter" className="mb-6" />

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
        // Raekkerne er IKKE klikbare — der er ingen rabatside at aabne. Derfor
        // ingen href og ingen hover: affordancen maa ikke love noget, der ikke
        // findes. Foer saa de ud praecis som kundelistens klikbare raekker.
        <Liste className="border-y border-border">
          {discounts.map((d) => (
            <ListeRaekke key={d.id}>
              <ListeTekst
                titel={
                  <span className="flex items-center gap-2">
                    {d.name}
                    <Badge tone={tone[d.status]}>
                      {DISCOUNT_STATUS_LABELS[d.status]}
                    </Badge>
                  </span>
                }
                under={
                  DISCOUNT_TYPE_LABELS[d.type] +
                  (d.type === "percent"
                    ? ` · ${d.value}%`
                    : d.type === "fixed_amount"
                      ? ` · ${formatCurrency(d.value)}`
                      : "")
                }
              />
            </ListeRaekke>
          ))}
        </Liste>
      )}
    </>
  );
}
