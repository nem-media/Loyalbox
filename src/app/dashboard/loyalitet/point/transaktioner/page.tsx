import Link from "next/link";
import { TIDSZONE } from "@/lib/dansk-dag";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { hentPointProgram } from "@/lib/loyalty/point-service";
import { pointHistorik } from "@/lib/loyalty/point-rapport";
import { POINT_TXN_LABELS } from "@/lib/loyalty/point";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { StampCardIcon } from "@/components/nav-icons";
import { formatCurrency } from "@/lib/utils";
import { AnnullerKnap } from "./annuller-knap";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pointtransaktioner" };

/**
 * Virksomhedens pointhistorik.
 *
 * DET ER KVITTERINGSBOGEN, ikke en analyse: hvem fik hvad, hvornår, af hvem —
 * og hvad der siden blev rettet. Derfor står annulleringen HER og ikke på
 * kundens side alene: den, der skal rette en fejl, leder i listen over det,
 * der skete i dag.
 */
export default async function PointTransaktionerPage() {
  const access = await getCompanyAccess();
  if (!access) return null;

  const program = await hentPointProgram(access.companyId);
  if (!program) {
    return (
      <>
        <PageHeader title="Pointtransaktioner" />
        <EmptyState
          icon={StampCardIcon}
          title="Der er ikke noget pointprogram endnu."
          description="Opret et pointprogram for at se transaktioner her."
          action={
            <Link
              href="/dashboard/loyalitet/point"
              className="font-medium text-accent hover:underline"
            >
              Gå til pointprogram →
            </Link>
          }
        />
      </>
    );
  }

  const raekker = await pointHistorik(access.companyId, program.id, 100);

  return (
    <>
      <PageHeader
        title="Pointtransaktioner"
        description={`${program.name} — de seneste 100 bevægelser.`}
      />

      {raekker.length === 0 ? (
        <EmptyState
          icon={StampCardIcon}
          title="Ingen transaktioner endnu."
          description="Så snart en kunde får point, står det her."
        />
      ) : (
        <Card>
          <CardBody className="p-0 sm:p-0">
            <Table>
              <THead>
                <TR>
                  <TH>Dato</TH>
                  <TH>Kunde</TH>
                  <TH>Handling</TH>
                  <TH>Point</TH>
                  <TH>Belønning / køb</TH>
                  <TH>Medarbejder</TH>
                  <TH> </TH>
                </TR>
              </THead>
              <TBody>
                {raekker.map((t) => (
                  <TR key={t.id}>
                    <TD>
                      {new Date(t.created_at).toLocaleDateString("da-DK", {
                        day: "2-digit",
                        month: "2-digit",
                        timeZone: TIDSZONE,
                      })}
                    </TD>
                    <TD>
                      <Link
                        href={`/dashboard/loyalitet/kunder/${t.member_id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {t.medlemNavn}
                      </Link>
                    </TD>
                    <TD>
                      {POINT_TXN_LABELS[t.type]}
                      {t.annulleret ? (
                        <span className="ml-2 text-xs text-muted">
                          (annulleret)
                        </span>
                      ) : null}
                      {t.reason ? (
                        <span className="block text-xs text-muted">
                          {t.reason}
                        </span>
                      ) : null}
                    </TD>
                    <TD
                      className={
                        t.points > 0 ? "text-success" : "text-foreground"
                      }
                    >
                      {t.points > 0 ? `+${t.points}` : t.points}
                    </TD>
                    <TD>
                      {t.reward_navn
                        ? t.reward_navn
                        : t.purchase_amount != null
                          ? formatCurrency(t.purchase_amount)
                          : "—"}
                    </TD>
                    <TD>{t.medarbejder ?? "Ejer"}</TD>
                    <TD>
                      {/*
                        EN MODPOST KAN IKKE ANNULLERES, og en transaktion kan
                        kun annulleres én gang — det afgøres i basen af det
                        unikke indeks på `reversal_of`. Knappen skjules, når
                        svaret på forhånd er nej, så ingen trykker forgæves.
                      */}
                      {access.permissions.canManage &&
                      t.type !== "reversal" &&
                      !t.annulleret ? (
                        <AnnullerKnap
                          txnId={t.id}
                          memberId={t.member_id}
                          beskrivelse={`${t.points > 0 ? "+" : ""}${t.points} point til ${t.medlemNavn}`}
                        />
                      ) : null}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardBody>
        </Card>
      )}
    </>
  );
}
