import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { designFrontfarve } from "@/lib/design";
import type { Database } from "@/lib/types/database";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { BillingIcon } from "@/components/nav-icons";
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

  const raekker = (orders ?? []) as Ordrelinje[];

  return (
    <>
      <PageHeader
        title="Ordrer"
        description="Alle ordrer og deres status i produktionsflowet."
      />

      {raekker.length ? (
        <Card>
          <CardBody className="p-0">
            <Table>
              <THead>
                {/* Overskriftsrækken skal ikke reagere på musen — der er intet
                    at klikke på deroppe. */}
                <TR className="hover:bg-transparent">
                  <TH className="w-16">Tryk</TH>
                  <TH>Produkt</TH>
                  <TH>Virksomhed</TH>
                  <TH numerisk>Beløb</TH>
                  <TH>Dato</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {raekker.map((o) => (
                  <TR key={o.id}>
                    {/* Miniaturen fortæller på et blik, hvad der skal laves —
                        farve og logo sammen. Tre kolonner tekst gør ikke det
                        samme. */}
                    <TD>
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
                    </TD>

                    <TD>
                      <Link
                        href={`/admin/ordrer/${o.id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {o.product_name}
                      </Link>
                      <span className="text-muted"> ×{o.quantity}</span>
                    </TD>

                    <TD className="text-muted">{o.company?.name ?? "–"}</TD>

                    <TD numerisk>{formatCurrency(Number(o.total_amount))}</TD>

                    <TD className="whitespace-nowrap text-muted">
                      {formatDate(o.created_at)}
                    </TD>

                    <TD>
                      <OrderStatusSelect orderId={o.id} status={o.status} />
                      {/* "new" betyder aldrig betalt. Uden markeringen ligner
                          den en ordre, der venter på at blive ekspederet. */}
                      {o.status === "new" ? (
                        <span className="mt-1 block text-xs text-muted">
                          Ikke betalt
                        </span>
                      ) : null}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardBody>
        </Card>
      ) : (
        /* Stod før som en løs sætning med "Stripe — Sprint 2" i. Intern
           jargon om en sprintplan hører ikke til på en skærm, nogen bruger. */
        <EmptyState
          icon={BillingIcon}
          title="Ingen ordrer endnu"
          description="Ordrer oprettes af sig selv, når en kunde gennemfører en betaling. Herfra følger du dem fra betaling til afsendt."
        />
      )}
    </>
  );
}
