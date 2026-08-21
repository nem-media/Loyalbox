import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { designFrontfarve } from "@/lib/design";
import type { Database } from "@/lib/types/database";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";
import { OrderStatusSelect } from "./order-status";

export const metadata = { title: "Admin — Ordrer" };

/** Ordren med de sammenkoblede felter, forespørgslen henter. */
type Ordrelinje = Database["public"]["Tables"]["orders"]["Row"] & {
  company: { name: string } | null;
  design: Pick<
    Database["public"]["Tables"]["designs"]["Row"],
    "stander_farve" | "front_type" | "front_hex" | "logo_url"
  > | null;
};

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*, company:companies(name), design:designs(stander_farve, front_type, front_hex, logo_url)")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Ordrer"
        description="Alle ordrer og deres status i produktionsflowet."
      />

      <Card>
        <CardBody className="p-0">
          {orders && orders.length ? (
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted">
                <tr>
                  <th className="p-4 font-medium">Tryk</th>
                  <th className="p-4 font-medium">Produkt</th>
                  <th className="p-4 font-medium">Virksomhed</th>
                  <th className="p-4 font-medium">Beløb</th>
                  <th className="p-4 font-medium">Dato</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(orders as Ordrelinje[]).map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-border last:border-0"
                  >
                    {/* Miniaturen fortæller på et blik, hvad der skal laves —
                        farve og logo sammen. Tre kolonner tekst gør ikke det
                        samme. */}
                    <td className="p-4">
                      {o.design ? (
                        <span
                          className="box-shape grid h-10 w-8 place-items-center overflow-hidden border border-border p-1"
                          style={{
                            background: designFrontfarve(o.design).hex,
                          }}
                        >
                          {o.design.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={o.design.logo_url}
                              alt=""
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/admin/ordrer/${o.id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {o.product_name}
                      </Link>
                      <span className="text-muted"> ×{o.quantity}</span>
                    </td>
                    <td className="p-4 text-muted">
                      {o.company?.name ?? "–"}
                    </td>
                    <td className="p-4">{formatCurrency(Number(o.total_amount))}</td>
                    <td className="p-4 text-muted">{formatDate(o.created_at)}</td>
                    <td className="p-4">
                      <OrderStatusSelect orderId={o.id} status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-8 text-center text-muted">
              Ingen ordrer endnu. Ordrer oprettes automatisk ved køb (Stripe —
              Sprint 2).
            </p>
          )}
        </CardBody>
      </Card>
    </>
  );
}
