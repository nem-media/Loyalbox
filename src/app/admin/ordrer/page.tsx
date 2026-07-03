import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";
import { OrderStatusSelect } from "./order-status";

export const metadata = { title: "Admin — Ordrer" };

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*, company:companies(name)")
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
                  <th className="p-4 font-medium">Produkt</th>
                  <th className="p-4 font-medium">Virksomhed</th>
                  <th className="p-4 font-medium">Beløb</th>
                  <th className="p-4 font-medium">Dato</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="p-4">
                      {o.product_name}
                      <span className="text-muted"> ×{o.quantity}</span>
                    </td>
                    <td className="p-4 text-muted">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(o as any).company?.name ?? "–"}
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
