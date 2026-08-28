import { SignupForm } from "./signup-form";
import { PRIVAT_SIDE } from "@/lib/site";

export const metadata = {
  title: "Opret virksomhed",
  ...PRIVAT_SIDE,
};

/**
 * Varen og antallet kommer med fra bestillingen og gives videre som skjulte
 * felter, så `signup()` kan sende kunden tilbage til netop det valg. Uden det
 * skulle man vælge forfra efter at have oprettet sin virksomhed.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ produkt?: string; antal?: string }>;
}) {
  const { produkt, antal } = await searchParams;
  return <SignupForm produkt={produkt} antal={antal} />;
}
