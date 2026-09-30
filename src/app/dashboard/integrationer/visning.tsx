import { PageHeader, Sektion } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Besked } from "@/components/ui/besked";
import { formatDateTime } from "@/lib/utils";
import { earnValueLabel, type PointEarnModel } from "@/lib/loyalty/point";
import { Afbryd, Beloenningskanal, Parring, Programkanal } from "./formularer";

/**
 * INTEGRATIONER — webshoppen som en kanal til de samme programmer.
 *
 * Tre ting på én side, i den rækkefølge ejeren skal bruge dem:
 *   1. Forbindelsen: parringskode, butikken, seneste synkronisering, afbryd.
 *   2. Hvilke programmer der må optjenes på i webshoppen — et eksisterende
 *      program bliver ALDRIG af sig selv et webshopprogram.
 *   3. Hvilke pointbelønninger der kan bruges som webshoprabat, og hvad de er
 *      værd dér.
 *
 * Visningen får sine data som props og slår intet op selv (`page.tsx` gør),
 * så hver tilstand kan tegnes og efterses uden en database.
 */

const FEJLTEKST: Record<string, string> = {
  invalid_contract: "En ordre fulgte ikke formatet. Opdatér pluginet.",
  unsupported_currency: "Webshoppen sendte en valuta, LoyalSum ikke understøtter.",
  store_mismatch: "Pluginet sendte data fra en anden butik.",
  provider_mismatch: "Pluginet sendte data fra en anden platform.",
  entitlement_required: "Dit abonnement omfatter ikke længere webshopintegrationen.",
  invalid_request: "Pluginet sendte en ugyldig anmodning.",
  reward_unavailable: "En belønning kunne ikke bruges i webshoppen.",
};

export interface IntegrationVisning {
  id: string;
  provider: string;
  store_url: string;
  store_name: string | null;
  status: string;
  connected_at: string;
  disconnected_at: string | null;
  last_successful_sync_at: string | null;
  last_error_at: string | null;
  last_error_code: string | null;
  adapter_version: string | null;
}

export interface IntegrationerData {
  woo: IntegrationVisning | null;
  tidligere: IntegrationVisning | null;
  aktivKodeUdloeber: string | null;
  pointprogrammer: { id: string; name: string; status: string; earn_model: PointEarnModel; earn_value: number; iWebshop: boolean }[];
  stempelkort: { id: string; name: string; status: string; iWebshop: boolean; minKr: string }[];
  beloenninger: {
    id: string;
    name: string;
    points_cost: number;
    iWebshop: boolean;
    type: "fixed_amount" | "percentage";
    beloebKr: string;
    procent: string;
  }[];
  harWebshopPoint: boolean;
}

export function IntegrationerVisning({ d }: { d: IntegrationerData }) {
  const { woo, tidligere } = d;
  const visFejl =
    woo?.last_error_code &&
    woo.last_error_at &&
    (!woo.last_successful_sync_at || woo.last_error_at > woo.last_successful_sync_at);

  return (
    <>
      <PageHeader
        title="Integrationer"
        description="Lad dine kunder optjene point og stempler, når de handler i din webshop — på det samme kort, som de bruger i butikken."
      />

      <Sektion titel="Webshop">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold tracking-tight text-dark">WooCommerce</h3>
                {woo ? (
                  <Badge tone="success">Forbundet</Badge>
                ) : tidligere ? (
                  <Badge tone="neutral">Afbrudt</Badge>
                ) : (
                  <Badge tone="neutral">Ikke forbundet</Badge>
                )}
              </div>

              {woo ? (
                <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-y-2">
                  <dt className="text-muted">Butik</dt>
                  <dd className="mb-2 min-w-0 break-words font-medium text-dark sm:mb-0">
                    {woo.store_name ? `${woo.store_name} · ` : ""}
                    {woo.store_url}
                  </dd>
                  <dt className="text-muted">Forbundet</dt>
                  <dd className="mb-2 sm:mb-0">{formatDateTime(woo.connected_at)}</dd>
                  <dt className="text-muted">Seneste ordre</dt>
                  <dd className="mb-2 sm:mb-0">
                    {woo.last_successful_sync_at ? formatDateTime(woo.last_successful_sync_at) : "Ingen endnu"}
                  </dd>
                  {woo.adapter_version ? (
                    <>
                      <dt className="text-muted">Plugin</dt>
                      <dd>Version {woo.adapter_version}</dd>
                    </>
                  ) : null}
                </dl>
              ) : (
                <p className="max-w-prose text-sm leading-relaxed text-muted">
                  Installér LoyalSum-pluginet i WordPress, hent en parringskode
                  her, og skriv den i pluginet. Koden gælder et kvarter og kan
                  bruges én gang.
                  {tidligere?.disconnected_at
                    ? ` Forbindelsen blev afbrudt ${formatDateTime(tidligere.disconnected_at)}; kundernes point og historik er bevaret.`
                    : ""}
                </p>
              )}

              {visFejl ? (
                <Besked slags="advarsel">
                  Seneste fejl {formatDateTime(woo!.last_error_at!)}:{" "}
                  {FEJLTEKST[woo!.last_error_code!] ?? "Webshoppen fik en fejl fra LoyalSum."}
                </Besked>
              ) : null}

              {d.aktivKodeUdloeber && !woo ? (
                <p className="text-xs text-muted">
                  Der er en aktiv kode, som udløber {formatDateTime(d.aktivKodeUdloeber)}. Mistet den? Hent en ny.
                </p>
              ) : null}

              <Parring forbundet={Boolean(woo)} />
              {woo ? <Afbryd integrationId={woo.id} /> : null}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold tracking-tight text-dark">Shopify</h3>
                <Badge tone="neutral">Kommer snart</Badge>
              </div>
              <p className="max-w-prose text-sm leading-relaxed text-muted">
                Shopify bruger den samme forbindelse og de samme programmer, når
                appen er klar. Der er ikke noget at sætte op endnu.
              </p>
            </CardBody>
          </Card>
        </div>
      </Sektion>

      <Sektion titel="Programmer i webshoppen">
        <Card>
          <CardBody className="space-y-6">
            <p className="max-w-2xl text-sm leading-relaxed text-muted">
              Et program giver kun point eller stempler for webshopordrer, hvis
              du slår det til her. Reglerne er programmets egne — 1 point pr. 10
              kr. i butikken er også 1 point pr. 10 kr. i webshoppen. Fragt og
              gebyrer tæller ikke, og refunderede varer trækkes fra igen.
            </p>
            {d.pointprogrammer.length === 0 && d.stempelkort.length === 0 ? (
              <p className="text-sm text-muted">Du har endnu ingen programmer. Opret et under Loyalitet.</p>
            ) : null}
            {d.pointprogrammer.map((p) => (
              <Programkanal
                key={p.id}
                slags="points"
                programId={p.id}
                navn={p.name}
                beskrivelse={`Pointprogram · ${
                  p.earn_model === "manual"
                    ? "point gives manuelt og optjenes ikke i webshoppen"
                    : `${earnValueLabel(p.earn_model)}: ${p.earn_value}`
                }${p.status !== "active" ? " · ikke aktivt" : ""}`}
                aktiv={p.iWebshop}
                minKr=""
              />
            ))}
            {d.stempelkort.map((s) => (
              <Programkanal
                key={s.id}
                slags="stamps"
                programId={s.id}
                navn={s.name}
                beskrivelse={`Stempelkort · 1 stempel pr. betalt webshopordre${s.status !== "active" ? " · ikke aktivt" : ""}`}
                aktiv={s.iWebshop}
                minKr={s.minKr}
              />
            ))}
          </CardBody>
        </Card>
      </Sektion>

      <Sektion titel="Belønninger i webshoppen">
        <Card>
          <CardBody className="space-y-6">
            <p className="max-w-2xl text-sm leading-relaxed text-muted">
              En belønning ved disken bliver ikke af sig selv en webshoprabat.
              Vælg de pointbelønninger, kunderne må bruge online, og hvad de er
              værd i kurven. Kunden skal have bekræftet sin e-mail, før point
              kan bruges i webshoppen.
            </p>
            {!d.harWebshopPoint ? (
              <p className="text-sm text-muted">Slå et pointprogram til i webshoppen først.</p>
            ) : d.beloenninger.length === 0 ? (
              <p className="text-sm text-muted">Pointprogrammet har ingen aktive belønninger endnu.</p>
            ) : (
              d.beloenninger.map((b) => (
                <Beloenningskanal
                  key={b.id}
                  rewardId={b.id}
                  navn={b.name}
                  point={b.points_cost}
                  aktiv={b.iWebshop}
                  type={b.type}
                  beloebKr={b.beloebKr}
                  procent={b.procent}
                />
              ))
            )}
          </CardBody>
        </Card>
      </Sektion>
    </>
  );
}
