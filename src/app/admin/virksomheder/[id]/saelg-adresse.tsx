"use client";

import { useActionState, useEffect, useRef } from "react";
import { saelgAdresseAdmin, type FormResult } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

/**
 * "Sælg en butik mere" — den anden ende af "skriv til os".
 *
 * TO KNAPPER, DER BEGGE LAVER EN ADRESSE, SKAL KUNNE SKELNES PÅ ÉT BLIK.
 * `AddStand` ovenfor giver en adresse VÆK; denne sælger en. Forskellen er
 * penge, og den må ikke afhænge af, at man husker hvilken knap der er
 * hvilken — derfor står prisen skrevet på selve knappens boks, og derfor er
 * der en bekræftelse med beløbet i.
 *
 * SKILTET FØLGER IKKE MED. Kunden, der klikker selv i dashboardet, skal have
 * et skilt, fordi en ny QR-kode kræver et nyt tryk. En kæde, vi taler med,
 * har som regel allerede standere stående eller skal bruge et andet antal —
 * det aftales i samtalen og bestilles for sig.
 */
export function SaelgAdresse({
  companyId,
  maanedspris,
  adresserTilladt,
}: {
  companyId: string;
  /** Prisen pr. QR-adresse, ex moms. Null = virksomheden har intet abonnement. */
  maanedspris: number | null;
  adresserTilladt: number;
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    saelgAdresseAdmin,
    {},
  );
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  /*
   * UDEN ET ABONNEMENT ER DER INTET AT HÆVE. Knappen vises ikke — handlingen
   * afviser det alligevel, men en knap, der altid fejler, er værre end ingen
   * knap. Den gratis "Tilføj stander" ovenfor er den rigtige vej for dem.
   */
  if (maanedspris === null) return null;

  const efter = maanedspris * (adresserTilladt + 1);

  return (
    <form
      ref={ref}
      action={action}
      onSubmit={(e) => {
        // Browserens egen bekræftelse, samme greb som på abonnementskortets
        // handlinger: det her koster kunden penge hver måned fremover.
        if (
          !confirm(
            `Hæv abonnementet til ${adresserTilladt + 1} QR-adresser?\n\n` +
              `Månedsbeløbet går fra ${maanedspris * adresserTilladt} til ${efter} kr. ex moms. ` +
              `De resterende dage af denne måned lægges på næste faktura den 20. — ikke på kortet nu.`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="box-shape border border-border bg-[var(--app-bg)] p-4"
    >
      <p className="text-sm font-semibold tracking-tight">
        Sælg en butik mere
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Hæver abonnementet hos Stripe til {adresserTilladt + 1} QR-adresser —{" "}
        {formatCurrency(maanedspris * adresserTilladt)} →{" "}
        {formatCurrency(efter)} pr. måned ex moms. De resterende dage af denne
        måned lægges på næste faktura den 20., ikke på kortet nu. Der bestilles
        ikke et skilt — aftal det med kunden for sig.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input type="hidden" name="company_id" value={companyId} />
        <Input
          name="name"
          placeholder="Navn på den nye butik"
          required
          className="min-w-56 flex-1"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Hæver abonnementet…" : "Sælg og opret"}
        </Button>
      </div>

      {state.error ? (
        <p className="mt-2 text-sm text-danger">{state.error}</p>
      ) : null}
      {/* KVITTERINGEN GENTAGER IKKE TALLET.
          Den sagde før "dækker nu {adresserTilladt + 1}" — men proppen er
          allerede skrevet om af `revalidatePath`, når beskeden tegnes, så
          den lagde én til det NYE tal og påstod 3, hvor der stod 2. Linjen
          "X oprettet · Y betalt" lige ovenfor er den ene rigtige kilde, og
          kvitteringen skal ikke regne sit eget svar ud ved siden af. */}
      {state.ok ? (
        <p className="mt-2 text-sm font-medium">
          Solgt. Abonnementet er hævet, og adressen er oprettet.
        </p>
      ) : null}
    </form>
  );
}
