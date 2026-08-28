"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { DESTINATIONER, erGyldigUrl } from "@/lib/bestilling-uden-konto";
import type { DestinationType } from "@/lib/types/database";

/**
 * Hvad skal skiltet pege på?
 *
 * VISES KUN, NÅR DET IKKE KAN RETTES BAGEFTER. Et fysisk skilt uden
 * abonnement har en trykt QR-kode og ingen dynamiske links: destinationen er
 * afgjort én gang for alle i det øjeblik, skiltet går i trykken. Spørger vi
 * ikke her, findes svaret aldrig, og kunden står med et skilt, der fører
 * ingen steder hen — og som kun kan rettes med et nyt tryk.
 *
 * Med abonnement vises feltet ikke. Dér sættes destinationen i dashboardet,
 * og at kræve den her ville være at bede om noget, kunden kan ændre fem
 * minutter senere.
 *
 * ÉN KOMPONENT TIL BEGGE FORMULARER — designeren og genbestillingen — så
 * feltet ikke kan komme til at findes det ene sted og mangle det andet.
 * Reglen for HVORNÅR det vises, ligger i `kraeverDestination()` i
 * commerce.ts, som både formularen og `/api/checkout` spørger.
 */
/** Hvorfor linket skal oplyses nu. Eksporteret, så designerens sektion kan
 *  vise den samme sætning som genbestillingens indramning. */
export const DESTINATION_INTRO =
  "Linket kan ikke ændres efter tryk. QR-kode og NFC vil pege over på det valgte link.";

export function DestinationFelt({
  type,
  url,
  onType,
  onUrl,
  visFejl,
  bar = false,
}: {
  type: DestinationType;
  url: string;
  onType: (v: DestinationType) => void;
  onUrl: (v: string) => void;
  /** Sæt når brugeren har forsøgt at betale — så fejlen ikke råber ad en tom formular. */
  visFejl?: boolean;
  /**
   * Uden egen ramme og overskrift.
   *
   * Designeren lægger feltet i en `FormSektion`, som allerede har begge dele;
   * stod de her også, ville overskriften stå to gange oven på hinanden.
   * Genbestillingen har ingen sektioner og bruger den indrammede udgave.
   */
  bar?: boolean;
}) {
  const typeId = useId();
  const urlId = useId();
  const valgt = DESTINATIONER.find((d) => d.vaerdi === type);
  const tom = url.trim() === "";
  const ugyldig = !tom && !erGyldigUrl(url);

  const felter = (
    <>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_1fr]">
        <div>
          <label htmlFor={typeId} className="etiket">
            Platform
          </label>
          <select
            id={typeId}
            value={type}
            onChange={(e) => onType(e.target.value as DestinationType)}
            className="box-shape mt-1 h-11 w-full border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {DESTINATIONER.map((d) => (
              <option key={d.vaerdi} value={d.vaerdi}>
                {d.navn}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={urlId} className="etiket">
            Link
          </label>
          <Input
            id={urlId}
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => onUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1"
            aria-invalid={visFejl && (tom || ugyldig) ? true : undefined}
          />
          <p className="mt-1 text-xs text-muted">{valgt?.hjaelp}</p>
        </div>
      </div>

      {visFejl && tom ? (
        <p className="mt-2 text-sm text-danger">
          Skriv linket, skiltet skal føre til.
        </p>
      ) : null}
      {ugyldig ? (
        <p className="mt-2 text-sm text-danger">
          Linket skal starte med http:// eller https://
        </p>
      ) : null}
    </>
  );

  if (bar) return felter;

  return (
    <div className="box-shape border border-border bg-muted-bg/40 p-4">
      <p className="font-medium">Hvor skal QR-koden føre hen?</p>
      <p className="mt-1 mb-3 text-sm leading-relaxed text-muted">
        {DESTINATION_INTRO}
      </p>
      {felter}
    </div>
  );
}

/** Er destinationen klar til at blive sendt? Samme prøve som ruten laver. */
export function destinationKlar(url: string): boolean {
  return erGyldigUrl(url);
}
