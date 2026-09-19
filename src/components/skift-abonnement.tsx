import Link from "next/link";
import { COMPANY } from "@/lib/constants";
import { EKSTRA_STANDER_SLUG } from "@/components/bestil-stander";

/**
 * "Det her skifte tager vi lige sammen."
 *
 * TO GRUNDE, TO BESKEDER. `koebSpaerre()` svarer med en grund og ikke bare et
 * nej, netop så der kan stå noget brugbart — en knap, der forsvinder,
 * forklarer ingenting, og en kunde, der lige har klikket "Vælg", skal vide
 * hvorfor.
 *
 * HVORFOR NEDAD IKKE ER ET KLIK: stempelkortet, medlemmerne, belønningerne og
 * opslagene hører til Komplet. De forsvinder i samme sekund, abonnementet
 * bliver mindre, og butikkens kunder står med kort, der ikke virker. Det er
 * ikke noget, en betalingsknap kan rumme. Opad er derimod en ren udvidelse og
 * kræver ingen samtale — derfor spærres kun den ene vej.
 *
 * "HAR DEN ALLEREDE" ER IKKE EN VENLIGHED. Købet ville lave et abonnement
 * nummer to på samme virksomhed, og der er kun ét felt at gemme det i; det
 * andet ville trække penge uden at kunne ses nogen steder.
 */
export function SkiftAbonnement({
  grund,
  vare,
  nuvaerende,
}: {
  grund: "nedgradering" | "har-den-allerede";
  /** Varen, kunden står på. */
  vare: string;
  /** Varen, de allerede betaler for. */
  nuvaerende: string;
}) {
  const harDen = grund === "har-den-allerede";

  return (
    <div className="box-shape border border-secondary/40 bg-secondary/10 p-5">
      <p className="font-bold tracking-tight">
        {harDen
          ? `Du har allerede ${nuvaerende}`
          : `Du har ${nuvaerende} i forvejen`}
      </p>

      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        {harDen ? (
          <>
            Et køb mere ville oprette et abonnement ved siden af det, du betaler
            nu. Skal du bruge et skilt mere, er det tilkøbet{" "}
            <Link
              href={`/bestil?produkt=${EKSTRA_STANDER_SLUG}`}
              className="font-medium text-accent hover:underline"
            >
              Ekstra stander
            </Link>{" "}
            — det ændrer ikke dit abonnement.
          </>
        ) : (
          <>
            {nuvaerende} indeholder alt i {vare}, så et skift hertil ville gøre
            din løsning mindre. Det klarer vi i hånden, så hverken stempelkort,
            pointsaldi, medlemmer eller opslag forsvinder ved et uheld.
          </>
        )}
      </p>

      {harDen ? null : (
        <p className="mt-3 text-sm">
          Skriv til{" "}
          <Link
            href={`mailto:${COMPANY.email}`}
            className="font-medium text-accent hover:underline"
          >
            {COMPANY.email}
          </Link>
          , så ordner vi det med dig.
        </p>
      )}
    </div>
  );
}
