import { getCurrentUser } from "@/lib/auth";
import { commerceDb } from "@/lib/commerce-api/db";
import { commerceKrypteringKlar } from "@/lib/commerce-api/secret";
import type { PointEarnModel } from "@/lib/loyalty/point";
import { IntegrationerVisning, type IntegrationVisning } from "./visning";

export const metadata = { title: "Integrationer" };

/**
 * Integrationer — data. Visningen står i `visning.tsx`.
 *
 * Nøglen vises aldrig: siden læser eksplicitte kolonner, og
 * `secret_ciphertext` er ikke én af dem. Alt er afgrænset til virksomheden
 * i selve forespørgslen.
 */
export default async function IntegrationerSide() {
  const user = await getCurrentUser();
  const companyId = user?.company?.id;
  if (!companyId) return null;
  const db = commerceDb();

  const [
    { data: integrationer },
    { data: kode },
    { data: pointprogrammer },
    { data: stempelkort },
    { data: kanaler },
    { data: belKanaler },
  ] = await Promise.all([
    db
      .from("commerce_integrations")
      .select(
        "id, provider, store_url, store_name, status, connected_at, disconnected_at, last_successful_sync_at, last_error_at, last_error_code, adapter_version",
      )
      .eq("company_id", companyId)
      .order("connected_at", { ascending: false }),
    db
      .from("commerce_pairing_codes")
      .select("expires_at")
      .eq("company_id", companyId)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("loyalty_point_programs")
      .select("id, name, status, earn_model, earn_value")
      .eq("company_id", companyId)
      .neq("status", "archived")
      .order("created_at"),
    db
      .from("loyalty_programs")
      .select("id, name, status")
      .eq("company_id", companyId)
      .neq("status", "archived")
      .order("created_at"),
    db
      .from("commerce_program_channels")
      .select("point_program_id, stamp_program_id, enabled, min_order_minor")
      .eq("company_id", companyId)
      .eq("provider", "woocommerce"),
    db
      .from("commerce_reward_channels")
      .select("point_reward_id, enabled, discount_type, amount_minor, percentage_bp")
      .eq("company_id", companyId)
      .eq("provider", "woocommerce"),
  ]);

  const alle = (integrationer ?? []) as IntegrationVisning[];
  const kanalListe = (kanaler ?? []) as {
    point_program_id: string | null;
    stamp_program_id: string | null;
    enabled: boolean;
    min_order_minor: number | null;
  }[];
  const webshopPoint = kanalListe.find((k) => k.point_program_id && k.enabled)?.point_program_id ?? null;

  const { data: beloenninger } = webshopPoint
    ? await db
        .from("loyalty_point_rewards")
        .select("id, name, points_cost")
        .eq("company_id", companyId)
        .eq("program_id", webshopPoint)
        .eq("status", "active")
        .order("points_cost")
    : { data: [] };
  const belKanal = new Map(
    ((belKanaler ?? []) as {
      point_reward_id: string;
      enabled: boolean;
      discount_type: "fixed_amount" | "percentage";
      amount_minor: number | null;
      percentage_bp: number | null;
    }[]).map((k) => [k.point_reward_id, k]),
  );

  return (
    <IntegrationerVisning
      d={{
        woo: alle.find((i) => i.provider === "woocommerce" && i.status !== "revoked") ?? null,
        tidligere: alle.find((i) => i.provider === "woocommerce" && i.status === "revoked") ?? null,
        aktivKodeUdloeber: (kode?.expires_at as string | undefined) ?? null,
        pointprogrammer: (
          (pointprogrammer ?? []) as { id: string; name: string; status: string; earn_model: PointEarnModel; earn_value: number }[]
        ).map((p) => ({ ...p, iWebshop: kanalListe.some((k) => k.point_program_id === p.id && k.enabled) })),
        stempelkort: ((stempelkort ?? []) as { id: string; name: string; status: string }[]).map((s) => {
          const k = kanalListe.find((x) => x.stamp_program_id === s.id);
          return {
            ...s,
            iWebshop: Boolean(k?.enabled),
            minKr: k?.min_order_minor != null ? String(Number(k.min_order_minor) / 100) : "",
          };
        }),
        beloenninger: ((beloenninger ?? []) as { id: string; name: string; points_cost: number }[]).map((b) => {
          const k = belKanal.get(b.id);
          return {
            ...b,
            iWebshop: Boolean(k?.enabled),
            type: k?.discount_type ?? "fixed_amount",
            beloebKr: k?.amount_minor != null ? String(Number(k.amount_minor) / 100) : "",
            procent: k?.percentage_bp != null ? String(Number(k.percentage_bp) / 100) : "",
          };
        }),
        harWebshopPoint: Boolean(webshopPoint),
        commerceKlar: commerceKrypteringKlar(),
      }}
    />
  );
}
