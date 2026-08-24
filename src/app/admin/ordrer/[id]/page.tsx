import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrderStatusSelect } from "../order-status";
import { designFrontfarve } from "@/lib/design";
import { standerFarveNavn } from "@/lib/stander-tilvalg";
import { visCvr } from "@/lib/cvr";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Database } from "@/lib/types/database";

export const metadata = { title: "Admin — Ordre" };

/**
 * ALT DER SKAL BRUGES FOR AT LAVE OG SENDE SKILTET, på én side.
 *
 * Listen viste hvad der var solgt; den viste ikke hvad der skulle TRYKKES.
 * Farven, logoet og adressen lå henholdsvis i en anden tabel, i lageret og
 * hos Stripe, så den, der skulle pakke ordren, måtte lede tre steder — eller
 * i sin indbakke.
 *
 * SIDEN ER SKREVET TIL DEN, DER STÅR MED OPGAVEN. Derfor står trykvalgene
 * øverst og betalingsdetaljerne nederst: beløbet kan slås op, men "hvilken
 * farve" kan ikke gættes.
 */
export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      "*, company:companies(name, cvr, contact_email, phone), design:designs(*), stand:stands(id, name, slug)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const o = order as Database["public"]["Tables"]["orders"]["Row"] & {
    company: {
      name: string;
      cvr: string | null;
      contact_email: string | null;
      phone: string | null;
    } | null;
    design: Database["public"]["Tables"]["designs"]["Row"] | null;
    stand: { id: string; name: string; slug: string } | null;
  };
  const firma = o.company;
  const design = o.design;
  const stand = o.stand;
  const front = design ? designFrontfarve(design) : null;
  const adresse = o.leveringsadresse as Record<string, string | null> | null;

  return (
    <>
      <PageHeader
        title={`${o.product_name} × ${o.quantity}`}
        description={`Bestilt ${formatDate(o.created_at)}`}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <OrderStatusSelect orderId={o.id} status={o.status} />
        {o.uden_konto ? <Badge tone="neutral">Uden konto</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* -------------------------------------------------- hvad der trykkes */}
        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-bold tracking-tight">Sådan skal den trykkes</h2>

            {/* HVILKEN QR-KODE. Designet siger, hvordan skiltet ser ud;
                standeren siger, hvad der skal stå på det. Har butikken to
                standere, måtte produktionen før gætte eller spørge — og en
                forkert QR opdages først, når skiltet står hos kunden.
                `stand_id` kom med migration 0022; ældre ordrer har den ikke. */}
            <div className="box-shape border border-border bg-muted-bg/50 p-3">
              <p className="etiket">QR-adresse der skal trykkes</p>
              {stand ? (
                <>
                  <p className="mt-1 font-mono text-sm font-medium">
                    /r/{stand.slug}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Standeren hedder “{stand.name}” hos kunden.
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted">
                  Ikke oplyst — ordren er fra før QR-adressen fulgte med, eller
                  bestilt uden konto. <strong>Spørg kunden</strong>, hvilken
                  stander skiltet skal pege på, før den trykkes.
                </p>
              )}
            </div>

            {design && front ? (
              <>
                <div className="flex items-start gap-4">
                  <div
                    className="box-shape grid h-32 w-24 shrink-0 place-items-center overflow-hidden border border-border p-3"
                    style={{ background: front.hex }}
                  >
                    {design.logo_url ? (
                      // Vises som det trykkes — også en hvid baggrund.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={design.logo_url}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-center text-[10px] text-muted">
                        Uden logo
                      </span>
                    )}
                  </div>

                  <dl className="space-y-1.5 text-sm">
                    <div>
                      <dt className="text-muted">Stander</dt>
                      <dd className="font-medium">
                        {standerFarveNavn(design.stander_farve)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Front</dt>
                      <dd className="font-medium">
                        {front.egen ? (
                          <span className="inline-flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="inline-block h-4 w-4 rounded-sm border border-border align-middle"
                              style={{ background: front.hex }}
                            />
                            <code>{front.hex}</code>
                          </span>
                        ) : (
                          front.beskrivelse
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Skabelon</dt>
                      <dd className="font-medium">{design.print_skabelon}</dd>
                    </div>
                  </dl>
                </div>

                {design.logo_url ? (
                  <div className="border-t border-border pt-3 text-sm">
                    <p className="font-medium">Logofilen</p>
                    <p className="mt-1 text-muted">
                      {design.logo_filnavn ?? "uden navn"}
                      {design.logo_bredde
                        ? ` · ${design.logo_bredde}×${design.logo_hoejde} px`
                        : ""}
                      {design.logo_bytes
                        ? ` · ${Math.round(Number(design.logo_bytes) / 1024)} kB`
                        : ""}
                    </p>
                    <p className="mt-1">
                      {design.logo_transparent === true ? (
                        <span className="text-accent">
                          Transparent baggrund
                        </span>
                      ) : design.logo_transparent === false ? (
                        <span className="text-secondary-fg">
                          Fast baggrund — kontrollér før tryk
                        </span>
                      ) : (
                        <span className="text-muted">
                          Baggrund ukendt (ikke en PNG)
                        </span>
                      )}
                    </p>
                    <a
                      href={design.logo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block font-medium text-accent hover:underline"
                    >
                      Hent originalfilen →
                    </a>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted">
                Ingen trykvalg på denne ordre. Den er lagt, før designs blev
                gemt — kontakt kunden for logo og farve.
              </p>
            )}
          </CardBody>
        </Card>

        {/* ---------------------------------------------------- hvor den sendes */}
        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-bold tracking-tight">Hvor den skal sendes</h2>

            {adresse ? (
              <address className="text-sm not-italic leading-relaxed">
                {firma?.name}
                <br />
                {adresse.line1}
                {adresse.line2 ? (
                  <>
                    <br />
                    {adresse.line2}
                  </>
                ) : null}
                <br />
                {[adresse.postal_code, adresse.city].filter(Boolean).join(" ")}
                <br />
                {adresse.country}
              </address>
            ) : (
              <p className="text-sm text-muted">
                Ingen leveringsadresse gemt. Ordrer betalt før 21. august har
                den kun hos Stripe — slå den op på betalingen nedenfor.
              </p>
            )}

            <div className="border-t border-border pt-3">
              <h3 className="text-sm font-medium">Kunden</h3>
              <dl className="mt-1 space-y-1 text-sm text-muted">
                <div>{firma?.name ?? "—"}</div>
                {firma?.cvr ? <div>{visCvr(firma.cvr)}</div> : null}
                <div>{o.kontakt_email ?? firma?.contact_email ?? "—"}</div>
                {firma?.phone ? <div>{firma.phone}</div> : null}
              </dl>
            </div>
          </CardBody>
        </Card>

        {/* ------------------------------------------------------------ betaling */}
        <Card className="lg:col-span-2">
          <CardBody>
            <h2 className="font-bold tracking-tight">Betaling</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted">Standere</dt>
                <dd className="font-medium">
                  {formatCurrency(
                    Number(o.total_amount) - Number(o.frontfarve_beloeb ?? 0),
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Egen frontfarve</dt>
                <dd className="font-medium">
                  {Number(o.frontfarve_beloeb) > 0
                    ? formatCurrency(Number(o.frontfarve_beloeb))
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">I alt ex. moms</dt>
                <dd className="font-medium">
                  {formatCurrency(Number(o.total_amount))}
                </dd>
              </div>
            </dl>

            {/* Et Stripe-id er langt nok til at skubbe siden sideværts på en
                telefon. `break-all` holder det inde i kortet. */}
            {o.stripe_session_id ? (
              <p className="mt-4 break-all border-t border-border pt-3 text-xs text-muted">
                Stripe: <code>{o.stripe_session_id}</code>
                {o.stripe_payment_intent ? (
                  <>
                    {" · "}
                    <code>{o.stripe_payment_intent}</code>
                  </>
                ) : null}
              </p>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <p className="mt-6">
        <Link
          href="/admin/ordrer"
          className="text-sm font-medium text-accent hover:underline"
        >
          ← Alle ordrer
        </Link>
      </p>
    </>
  );
}
