import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getCardsForUser,
  getPointCardsForUser,
} from "@/lib/loyalty/member-account";
import { pointTekst } from "@/lib/loyalty/point";
import { StampCardPreview } from "@/components/loyalty/stamp-card-preview";
import { ButtonLink } from "@/components/ui/button";
import { PwaInstall } from "@/components/pwa-install";
import { Logo } from "@/components/brand";
import { signout } from "@/app/(auth)/actions";
import { PRIVAT_SIDE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = {
  /*
   * "MINE FORDELE" OG IKKE "MINE STEMPELKORT".
   *
   * Siden viser nu begge loyalitetsformer, og en kunde med et pointkort hos
   * caféen og et stempelkort hos bageren skulle ellers lede efter sine point
   * under en overskrift, der siger noget andet. Resten af teksterne er
   * uændret — der skrives kun om, hvor det ellers ville være usandt.
   */
  title: "Mine fordele",
  ...PRIVAT_SIDE,
};

export default async function MyCardsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mine-kort");

  const [cards, pointkort] = await Promise.all([
    getCardsForUser(user.id),
    getPointCardsForUser(user.id),
  ]);
  const intet = cards.length === 0 && pointkort.length === 0;

  return (
    <main id="indhold" className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Mine fordele</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>

        {/* ---------------------------------------------------- pointkort */}
        {pointkort.map((p) => (
          <div key={`point-${p.memberId}-${p.programName}`} className="space-y-2">
            <div className="box-shape border border-border bg-dark p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
                Pointprogram
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight">
                {pointTekst(p.saldo)}
              </p>
              <p className="mt-1 text-sm text-white/70">{p.companyName}</p>
              {p.paused ? (
                <p className="mt-3 text-sm text-white/80">
                  Pointprogrammet er midlertidigt sat på pause.
                </p>
              ) : p.klarTilBrug ? (
                <p className="mt-3 text-sm text-white/80">
                  Du har point nok til en belønning.
                </p>
              ) : p.naestePris ? (
                <p className="mt-3 text-sm text-white/80">
                  Næste belønning fra {pointTekst(p.naestePris)} — {p.naesteNavn}.
                </p>
              ) : null}
            </div>
            <ButtonLink
              href={`/kort/${p.token}`}
              variant="outline"
              className="w-full"
            >
              Se point &amp; belønninger
            </ButtonLink>
          </div>
        ))}

        {intet ? (
          <div className="box-shape border border-border bg-card p-5 text-center text-sm text-muted">
            <p>Du har endnu ingen fordele på din konto.</p>
            <p className="mt-2">
              Scan QR-koden i butikken for at komme med — og tryk derefter
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
                  startDato={card.startDato}
                  slutDato={card.slutDato}
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

        {/* Flertal her: siden viser alle kundens kort. */}
        <PwaInstall hvad="kortene" />

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
    </main>
  );
}
