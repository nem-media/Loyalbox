import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TIER_LABELS, type Tier } from "@/lib/constants";

/**
 * Vises hvor en funktion er låst bag en højere plan. Fortæller kunden hvad de
 * får ved at opgradere og linker til abonnementssiden.
 */
export function UpgradeNotice({
  requiredTier,
  title,
  description,
}: {
  requiredTier: Tier;
  title: string;
  description: string;
}) {
  return (
    <div className="box-shape border border-accent/20 bg-accent/5 p-6 text-center">
      <Badge tone="accent" className="mb-3">
        {TIER_LABELS[requiredTier]}
      </Badge>
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>
      <div className="mt-4">
        <ButtonLink href="/dashboard/abonnement" size="sm">
          Opgrader til {TIER_LABELS[requiredTier]}
        </ButtonLink>
      </div>
    </div>
  );
}
