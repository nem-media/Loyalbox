import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { qrDataUrl } from "@/lib/qr";
import { getSiteUrl } from "@/lib/site";
import { StampCardPreview } from "@/components/loyalty/stamp-card-preview";
import { stampProgress, progressLabel } from "@/lib/loyalty/balance";
import { TXN_TYPE_LABELS } from "@/lib/loyalty/constants";
import { Logo } from "@/components/brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mit stempelkort" };

export default async function CardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: member } = await admin
    .from("loyalty_members")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();
  if (!member) notFound();

  const { data: company } = await admin
    .from("companies")
    .select("name, logo_url")
    .eq("id", member.company_id)
    .maybeSingle();

  const { data: memberships } = await admin
    .from("loyalty_memberships")
    .select("*")
    .eq("member_id", member.id);

  const programIds = (memberships ?? []).map((m) => m.program_id);
  const [{ data: programs }, { data: rewards }, { data: available }, { data: txns }] =
    await Promise.all([
      programIds.length
        ? admin.from("loyalty_programs").select("*").in("id", programIds)
        : Promise.resolve({ data: [] as never[] }),
      programIds.length
        ? admin
            .from("loyalty_rewards")
            .select("*")
            .in("program_id", programIds)
            .eq("is_primary", true)
        : Promise.resolve({ data: [] as never[] }),
      admin
        .from("customer_rewards")
        .select("*")
        .eq("member_id", member.id)
        .eq("status", "available"),
      admin
        .from("loyalty_transactions")
        .select("*")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

  const programById = new Map((programs ?? []).map((p) => [p.id, p]));
  const rewardByProgram = new Map((rewards ?? []).map((r) => [r.program_id, r]));

  const { data: memberDiscounts } = await admin
    .from("customer_discounts")
    .select("*")
    .eq("member_id", member.id)
    .eq("status", "available");
  const discountIds = (memberDiscounts ?? []).map((d) => d.discount_id);
  const { data: discountDefs } = discountIds.length
    ? await admin.from("discounts").select("id, name").in("id", discountIds)
    : { data: [] as { id: string; name: string }[] };
  const discountNameById = new Map(
    (discountDefs ?? []).map((d) => [d.id, d.name]),
  );

  const qr = await qrDataUrl(`${getSiteUrl()}/kort/${token}`);

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        {/* Virksomhed */}
        <div className="flex items-center gap-3">
          {company?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo_url} alt={company.name} className="h-12 w-12 rounded-xl object-contain" />
          ) : null}
          <div>
            <h1 className="text-lg font-bold tracking-tight">{company?.name}</h1>
            <p className="text-sm text-muted">{member.name ? `Hej ${member.name}` : "Dit stempelkort"}</p>
          </div>
        </div>

        {/* Kort */}
        {(memberships ?? []).map((ms) => {
          const program = programById.get(ms.program_id);
          const reward = rewardByProgram.get(ms.program_id);
          if (!program) return null;
          const p = stampProgress(ms.balance_cache, reward?.required_stamps ?? 10);
          const rewardsForMs = (available ?? []).filter((r) => r.membership_id === ms.id);
          return (
            <div key={ms.id} className="space-y-2">
              <StampCardPreview
                name={program.name}
                color={program.color ?? "#19375c"}
                requiredStamps={reward?.required_stamps ?? 10}
                filled={ms.balance_cache}
                rewardName={reward?.name ?? null}
                cardText={program.card_text}
                companyName={company?.name}
              />
              {rewardsForMs.length > 0 ? (
                <div className="box-shape border border-success/30 bg-success/10 p-3 text-center text-sm font-medium text-success">
                  🎉 Du har en belønning klar: {reward?.name}. Vis kortet til personalet.
                </div>
              ) : (
                <p className="text-center text-sm text-muted">{progressLabel(p)}</p>
              )}
            </div>
          );
        })}

        {(!memberships || memberships.length === 0) && (
          <div className="box-shape border border-border bg-card p-5 text-center text-sm text-muted">
            Du er endnu ikke tilmeldt et stempelkort.
          </div>
        )}

        {/* Aktive rabatter */}
        {memberDiscounts && memberDiscounts.length > 0 ? (
          <div className="box-shape border border-secondary/30 bg-secondary/10 p-5">
            <p className="mb-2 text-sm font-medium">Dine tilbud</p>
            <ul className="space-y-1 text-sm">
              {memberDiscounts.map((cd) => (
                <li key={cd.id} className="flex items-center gap-2">
                  <span aria-hidden="true">🎁</span>
                  <span>{discountNameById.get(cd.discount_id) ?? "Rabat"}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">Vis kortet til personalet for at bruge dem.</p>
          </div>
        ) : null}

        {/* Kundens QR */}
        <div className="box-shape border border-border bg-card p-5 text-center">
          <p className="text-sm font-medium">Vis denne kode til personalet</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Din QR-kode" className="mx-auto mt-3 h-40 w-40" />
          <p className="mt-2 text-xs text-muted">Gem denne side som genvej på din telefon.</p>
        </div>

        {/* Historik */}
        {txns && txns.length > 0 ? (
          <div className="box-shape border border-border bg-card p-5">
            <p className="mb-2 text-sm font-medium">Seneste aktivitet</p>
            <ul className="divide-y divide-border text-sm">
              {txns.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2">
                  <span>{TXN_TYPE_LABELS[t.type]}</span>
                  <span className="text-xs text-muted">
                    {new Date(t.created_at).toLocaleDateString("da-DK")}
                    {t.stamps > 0 ? ` · +${t.stamps}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="pt-2 text-center">
          <Logo image="dark" className="opacity-70" />
        </div>
      </div>
    </div>
  );
}
