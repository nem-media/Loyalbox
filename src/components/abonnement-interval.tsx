"use client";

import { formatCurrency } from "@/lib/utils";

/**
 * MÅNEDLIGT ELLER ÅRLIGT — elleve måneder for tolv.
 *
 * ÉN KOMPONENT TIL BEGGE BESTILLINGSVEJE. Der er to steder, et abonnement
 * købes — designeren for den, der er logget ind, og `/bestil/uden-konto` for
 * alle andre — og to udgaver af det her valg ville før eller siden vise to
 * forskellige priser for det samme. Samme grund som at ordrevarslet og
 * ordrebekræftelsen deler ét datasæt.
 *
 * VALGET TEGNES KUN, NÅR ÅRSVEJEN FINDES. Kalderen spørger
 * `kanKoebesAarligt()`, som ser efter, om prisobjektet er oprettet i den
 * tilstand, sitet kører i. Er det ikke, er der ingen knap — og ruten afviser
 * også et "aar", der måtte komme ind alligevel. En knap kan skjules; en POST
 * kan sendes uanset.
 *
 * MÅNEDLIGT ER FORVALGT. Det er den mindste forpligtelse og det mindste
 * beløb, og et forvalg, der koster kunden tolv gange mere, er ikke et
 * forvalg — det er en fælde.
 *
 * DET ER IKKE EN BINDING, OG DET STÅR PÅ KNAPPEN. Handelsbetingelsernes §6
 * gælder uændret: man kan opsige når som helst, og adgangen løber den betalte
 * periode ud. Sælger vi årsbetaling som "binding", sælger vi noget andet,
 * end vi leverer.
 */
export function AbonnementInterval({
  maanedPris,
  aarPris,
  vaerdi,
  onVaelg,
  navn = "interval",
}: {
  maanedPris: number;
  aarPris: number;
  vaerdi: "maaned" | "aar";
  onVaelg: (v: "maaned" | "aar") => void;
  /** Feltnavnet i en almindelig formular. Designeren sender JSON og bruger det ikke. */
  navn?: string;
}) {
  const sparer = maanedPris;

  const valg = [
    {
      id: "maaned" as const,
      titel: "Månedligt",
      pris: `${formatCurrency(maanedPris)}/md`,
      under: "Betal en måned ad gangen.",
    },
    {
      id: "aar" as const,
      titel: "Årligt",
      pris: `${formatCurrency(aarPris)}/år`,
      under: `Du sparer ${formatCurrency(sparer)} — en måned gratis.`,
    },
  ];

  return (
    <fieldset>
      <legend className="etiket mb-2">Betaling af abonnementet</legend>
      {/* Et skjult felt, så værdien følger med i en almindelig formular-POST.
          Radioknapperne herunder er tegnet som kort og bærer den ikke selv. */}
      <input type="hidden" name={navn} value={vaerdi} />

      <div className="grid gap-3 sm:grid-cols-2">
        {valg.map((v) => {
          const valgt = vaerdi === v.id;
          return (
            <label
              key={v.id}
              className={`box-shape trykmaal-min flex cursor-pointer flex-col border p-4 transition-colors ${
                valgt
                  ? "border-accent bg-accent-tint ring-1 ring-accent"
                  : "border-border bg-card hover:bg-muted-bg"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  className="h-4 w-4 accent-[var(--accent)]"
                  checked={valgt}
                  onChange={() => onVaelg(v.id)}
                  /* Egen gruppe pr. felt, så to vælgere på samme side ikke
                     kan komme til at styre hinanden. */
                  name={`${navn}-valg`}
                />
                <span className="font-semibold tracking-tight">{v.titel}</span>
              </span>
              <span className="mt-2 text-lg font-bold tracking-tight">
                {v.pris}
              </span>
              <span className="mt-1 text-xs leading-relaxed text-muted">
                {v.under}
              </span>
            </label>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-muted">
        Årsbetaling er ikke en bindingsperiode — du kan opsige når som helst, og
        adgangen løber den betalte periode ud.
      </p>
    </fieldset>
  );
}
