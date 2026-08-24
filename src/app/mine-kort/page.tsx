import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCardsForUser } from "@/lib/loyalty/member-account";
import { StampCardPreview } from "@/components/loyalty/stamp-card-preview";
import { ButtonLink } from "@/components/ui/button";
import { PwaInstall } from "@/components/pwa-install";
import { Logo } from "@/components/brand";
import { signout } from "@/app/(auth)/actions";
import { PRIVAT_SIDE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Mine stempelkort",
  ...PRIVAT_SIDE,
};

export default async function MyCardsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mine-kort");

  const cards = await getCardsForUser(user.id);

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Mine stempelkort</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>

        {cards.length === 0 ? (
          <div className="box-shape border border-border bg-card p-5 text-center text-sm text-muted">
            <p>Du har endnu ingen stempelkort på din konto.</p>
            <p className="mt-2">
              Scan QR-koden i butikken for at få et kort — og tryk derefter
              &laquo;Gem på min konto&raquo; på kortet.
            </p>
          </div>
        ) : (
          cards.map((card) => (
            <div
              key={`${card.memberId}-${card.programName ?? "ingen"}`}
              className="space-y-2"
            >
              {card.programName ? (
                <StampCardPreview
                  name={card.programName}
                  color={card.color}
                  requiredStamps={card.requiredStamps}
                  filled={card.filled}
                  rewardName={card.rewardName}
                  cardText={card.cardText}
                  companyName={card.companyName}
                />
              ) : (
                <div className="box-shape border border-border bg-card p-5">
                  <p className="text-sm font-medium">{card.companyName}</p>
                  <p className="mt-1 text-sm text-muted">
                    Du er endnu ikke tilmeldt et stempelkort her.
                  </p>
                </div>
              )}

              {card.availableRewards > 0 ? (
                <div className="box-shape border border-success/30 bg-success/10 p-3 text-center text-sm font-medium text-success">
                  🎉 Du har en belønning klar hos {card.companyName}.
                </div>
              ) : null}

              <ButtonLink
                href={`/kort/${card.token}`}
                variant="outline"
                className="w-full"
              >
                Åbn kort &amp; vis QR
              </ButtonLink>
            </div>
          ))
        )}

        <PwaInstall />

        <form action={signout} className="pt-2 text-center">
          <button
            type="submit"
            className="text-sm font-medium text-muted underline"
          >
            Log ud
          </button>
        </form>

        <div className="text-center">
          <Logo image="dark" className="opacity-70" />
        </div>
      </div>
    </div>
  );
}
