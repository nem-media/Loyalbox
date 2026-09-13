import { COMPANY } from "@/lib/constants";

/**
 * "Denne vare kan ikke bestilles online lige nu."
 *
 * ARVTAGEREN EFTER `PurchaseNotice`, men med en helt anden rolle. Den gamle
 * besked sagde, at SALGET ikke var åbnet, og stod på otte sider, fordi det var
 * sandt overalt. Salget ER åbnet nu, og beskeden er slettet sammen med
 * ventelisten.
 *
 * Tilbage er de to steder, hvor `koebSpaerre()` stadig kan svare
 * `ikke-aabnet`: en vare uden Stripe-id'er i den aktuelle tilstand, eller et
 * miljø uden nøgle. Begge dele er fejl i opsætningen og ikke en normal
 * tilstand — men rammer en kunde den, skal der stå noget brugbart frem for en
 * knap, der bare mangler. Derfor en vej videre og ikke kun en beklagelse.
 */
export function KanIkkeBestilles({ className }: { className?: string }) {
  return (
    <div
      className={
        "box-shape border border-secondary/40 bg-secondary/10 p-4 text-sm " +
        (className ?? "")
      }
    >
      <p className="font-bold tracking-tight">
        Denne vare kan ikke bestilles online lige nu
      </p>
      <p className="mt-1 text-muted">
        Skriv til{" "}
        <a
          href={`mailto:${COMPANY.email}`}
          className="font-medium text-accent"
        >
          {COMPANY.email}
        </a>
        , så hjælper vi dig med bestillingen med det samme.
      </p>
    </div>
  );
}
