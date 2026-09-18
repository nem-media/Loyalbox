import Link from "next/link";
import { getCompanyAccess } from "@/lib/loyalty/access";
import {
  hentPointProgrammer,
  hentPointBeloenninger,
} from "@/lib/loyalty/point-service";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  pointTekst,
  MAKS_POINTPROGRAMMER,
  POINT_EARN_MODEL_LABELS,
} from "@/lib/loyalty/point";
import { PROGRAM_STATUS_LABELS } from "@/lib/loyalty/constants";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StampCardIcon } from "@/components/nav-icons";
import { PointProgramForm } from "./program-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pointprogram" };

/**
 * Butikkens pointprogrammer.
 *
 * LISTEN ER NY, fordi grænsen blev hævet fra ét til fem programmer (0045).
 * Før var denne adresse både liste og detalje, og det kunne den være, så længe
 * der kun fandtes ét. Nu er opbygningen den samme som stempelkortenes:
 * \`point/\` er listen, \`point/[id]\` er programmet.
 *
 * DER ER INGEN "NYT PROGRAM"-SIDE. Formularen står på listen, fordi et
 * pointprogram er fire felter — en mellemside ville være et klik, der ikke
 * oplyste noget. Den vises kun, når der er plads inden for grænsen; ellers
 * ville knappen føre til en fejl, butikken først møder efter at have skrevet.
 */
export default async function PointProgrammerPage() {
  const access = await getCompanyAccess();
  if (!access) return null;

  const admin = createAdminClient();
  const programmer = await hentPointProgrammer(access.companyId, admin);

  /*
   * TALLENE PR. PROGRAM I TO OPSLAG — ikke to pr. program.
   *
   * Listen skal kunne sige, om et program er i brug, uden at koste et
   * N+1-mønster. Saldi og belønninger hentes derfor samlet og grupperes her.
   */
  const ids = programmer.map((p) => p.id);
  const [{ data: konti }, beloenninger] = await Promise.all([
    ids.length
      ? admin
          .from("loyalty_point_accounts")
          .select("program_id, balance")
          .in("program_id", ids)
      : Promise.resolve({ data: [] as { program_id: string; balance: number }[] }),
    Promise.all(programmer.map((p) => hentPointBeloenninger(p.id, true, admin))),
  ]);

  const medlemmer = new Map<string, number>();
  const iOmloeb = new Map<string, number>();
  for (const k of konti ?? []) {
    medlemmer.set(k.program_id, (medlemmer.get(k.program_id) ?? 0) + 1);
    iOmloeb.set(k.program_id, (iOmloeb.get(k.program_id) ?? 0) + k.balance);
  }

  const derErPlads = programmer.length < MAKS_POINTPROGRAMMER;

  return (
    <>
      <PageHeader
        title="Pointprogram"
        description={
          programmer.length === 0
            ? "Kunden optjener point og vælger selv sin belønning."
            : `${programmer.length} af ${MAKS_POINTPROGRAMMER} programmer.`
        }
        action={
          programmer.length > 0 ? (
            <ButtonLink
              href="/dashboard/loyalitet/point/transaktioner"
              size="sm"
              variant="outline"
            >
              Se transaktioner
            </ButtonLink>
          ) : undefined
        }
      />

      {programmer.length === 0 ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-start">
          <EmptyState
            icon={StampCardIcon}
            title="Du har ikke oprettet et pointprogram endnu."
            description={
              <>
                Et pointprogram er den fleksible søster til stempelkortet:
                kunden samler point og bruger dem på dét, hun helst vil have.
                De to kan køre samtidig.
              </>
            }
          />
          <Card>
            <CardHeader>
              <CardTitle>Opret pointprogram</CardTitle>
            </CardHeader>
            <CardBody>
              <PointProgramForm />
            </CardBody>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
          <div className="divide-y divide-border border-y border-border">
            {programmer.map((p, i) => {
              const aktive = beloenninger[i] ?? [];
              const regel =
                p.earn_model === "per_amount"
                  ? `${p.earn_value} kr. = 1 point`
                  : p.earn_model === "per_visit"
                    ? `${Math.floor(p.earn_value)} point pr. køb`
                    : POINT_EARN_MODEL_LABELS.manual;

              return (
                <Link
                  key={p.id}
                  href={`/dashboard/loyalitet/point/${p.id}`}
                  className="flex items-center justify-between gap-3 py-4 hover:bg-muted-bg/40"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      <Badge
                        tone={
                          p.status === "active"
                            ? "success"
                            : p.status === "paused"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {PROGRAM_STATUS_LABELS[p.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {regel} ·{" "}
                      {aktive.length === 0
                        ? "ingen belønninger endnu"
                        : `${aktive.length} ${
                            aktive.length === 1 ? "belønning" : "belønninger"
                          }`}
                    </p>
                    {/*
                      TALLENE STÅR KUN, NÅR DER ER NOGET AT SIGE. En kladde med
                      nul medlemmer og nul point i omløb er ikke oplysninger,
                      det er støj på en liste, man skimmer.
                    */}
                    {(medlemmer.get(p.id) ?? 0) > 0 ? (
                      <p className="mt-0.5 text-sm text-muted">
                        {medlemmer.get(p.id)} medlemmer ·{" "}
                        {pointTekst(iOmloeb.get(p.id) ?? 0)} i omløb
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm text-accent">Åbn →</span>
                </Link>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {derErPlads ? "Nyt pointprogram" : "Alle pladser er brugt"}
              </CardTitle>
            </CardHeader>
            <CardBody>
              {derErPlads ? (
                <>
                  <p className="mb-4 text-sm leading-relaxed text-muted">
                    Flere programmer giver kunden flere saldi — én pr. program.
                    Brug det, når de er reelt forskellige, fx en kaffeklub og
                    en frokostklub.
                  </p>
                  <PointProgramForm />
                </>
              ) : (
                <p className="text-sm leading-relaxed text-muted">
                  Du kan have {MAKS_POINTPROGRAMMER} pointprogrammer ad gangen.
                  Arkivér et af dem, hvis du vil lave et nyt — kundernes point
                  og historik bevares.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
