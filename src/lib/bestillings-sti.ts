import { KATALOG, MAX_QTY } from "./constants";

/**
 * Bestillingen, kunden stod på, som en adresse vi selv har bygget.
 *
 * BAGGRUND: knappen på `/bestil` sagde "Opret konto · 3 stk.", men linket var
 * et bart `/signup`, og oprettelsen sluttede i dashboardet. Man valgte altså
 * Pro og tre standere, oprettede sin virksomhed — og landede et sted uden
 * hverken vare eller antal. Knappen lovede noget, flowet ikke holdt.
 *
 * LIGGER UDEN FOR HANDLINGEN, fordi en `"use server"`-fil kun må eksportere
 * asynkrone funktioner — en almindelig funktion dér får hele modulet til at
 * kaste ved indlæsningen. Se `use-server-eksporter.test.ts`.
 *
 * SLUG'EN SLÅS OP FREM FOR AT BLIVE SKREVET IND. Værdien kommer fra et skjult
 * felt i en formular, enhver kan poste til, og den ender i en
 * Location-header. Kun varer, der findes i kataloget, giver en adresse; alt
 * andet giver `null`, og så sendes kunden det almindelige sted hen.
 *
 * Antallet klippes til det, bestillingen tager imod, så et håndskrevet felt
 * ikke kan sende nogen til en side med 4000 standere.
 */
export function bestillingsSti(
  produkt: string | null | undefined,
  antal: string | null | undefined,
): string | null {
  const slug = String(produkt ?? "");
  if (!slug || !KATALOG.some((p) => p.slug === slug)) return null;

  const n = Math.max(1, Math.min(MAX_QTY, Math.floor(Number(antal)) || 1));
  return `/bestil?produkt=${slug}&antal=${n}`;
}
