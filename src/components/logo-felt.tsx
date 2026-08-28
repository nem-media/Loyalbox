"use client";

import { LOGO_KRAV, LOGO_TEKSTER } from "@/lib/logo";

/**
 * Logofeltet i en bestilling — ÉN komponent til begge veje ind.
 *
 * HVORFOR DEN FINDES: feltet stod to steder, i designeren og i bestillingen
 * uden konto, og manglede det samme begge steder — der var ingen måde at
 * fortryde et logo på. Havde jeg sat en knap ind det ene sted, ville den
 * anden formular være blevet ved med at mangle den.
 *
 * SELVE KONTROLLEN AF FILEN LIGGER IKKE HER. De to formularer gør forskellige
 * ting med den valgte fil: designeren gemmer den til en upload ved betalingen,
 * bestillingen uden konto sender den med i formulardataene. Komponenten viser
 * feltet; kalderen bestemmer, hvad et valg betyder.
 */
export function LogoFelt({
  name,
  inputRef,
  onChange,
  onFjern,
  valgt,
  fejl,
  advarsler,
}: {
  /**
   * Sættes KUN, når serveren skal læse filen ud af formulardataene.
   *
   * Designeren uploader selv filen med JavaScript og må ikke sende den med i
   * en formular — en besøgende uden login kan ikke skrive i lageret, og
   * designerens kunde er logget ind.
   */
  name?: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFjern: () => void;
  /** Er der valgt et logo lige nu? Afgør, om der er noget at fjerne. */
  valgt: boolean;
  fejl?: string | null;
  advarsler: string[];
}) {
  return (
    <div className="py-4">
      <p className="text-sm font-medium">{LOGO_TEKSTER.overskrift}</p>
      <p className="mt-0.5 text-xs text-muted">{LOGO_TEKSTER.hjaelp}</p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={LOGO_KRAV.typer.join(",")}
          onChange={onChange}
          className="block min-w-0 flex-1 text-sm file:btn-shape file:mr-3 file:border file:border-border file:bg-transparent file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-muted-bg"
        />

        {/*
          FORTRYD-KNAPPEN VISES KUN, NÅR DER ER NOGET AT FORTRYDE.
          Et filfelt kan ikke tømmes ved at vælge "ingen fil" — browseren
          giver ingen vej tilbage — så uden denne knap sad kunden fast med
          det første logo, de kom til at vælge.
        */}
        {valgt ? (
          <button
            type="button"
            onClick={onFjern}
            className="btn-shape inline-flex shrink-0 items-center gap-1.5 border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-danger hover:text-danger"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="h-3.5 w-3.5"
            >
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
            Fjern
          </button>
        ) : null}
      </div>

      {fejl ? <p className="mt-2 text-sm text-danger">{fejl}</p> : null}

      {advarsler.map((a) => (
        <p
          key={a}
          className={`mt-2 text-sm ${
            a === LOGO_TEKSTER.transparentFundet ? "text-accent" : "text-muted"
          }`}
        >
          {a}
        </p>
      ))}

      {!valgt ? (
        <p className="mt-2 text-xs text-muted">
          Uden logo trykkes feltet med pladsholderen “Dit logo”.
        </p>
      ) : null}
    </div>
  );
}
