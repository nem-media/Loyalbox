import { LoginForm } from "./login-form";
import { PRIVAT_SIDE } from "@/lib/site";
import { AKTIVERING_TEKSTER } from "@/lib/aktivering";

export const metadata = {
  title: "Log ind",
  ...PRIVAT_SIDE,
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    fejl?: string;
    besked?: string;
  }>;
}) {
  const { next, fejl, besked } = await searchParams;

  /*
   * `fejl=link` sættes af /auth/callback, når koden i en auth-mail ikke
   * kunne veksles — typisk fordi linket er udløbet eller allerede brugt.
   *
   * `besked=knyttet` sættes af aktiveringen, når købet blev knyttet til en
   * konto, kunden HAVDE i forvejen. Uden den lander en, der lige har
   * betalt, på en bar loginskærm — og prøver med en adgangskode, der
   * aldrig er blevet sat. Det skete for en rigtig kunde, og det er den
   * eneste grund til, at feltet findes.
   */
  const notice =
    besked === "knyttet"
      ? AKTIVERING_TEKSTER.knyttet
      : fejl === "link"
        ? "Linket virkede ikke længere. Log ind, eller bed om et nyt link."
        : undefined;

  // Tomt `next` er meningen: så vælger login-actionen landingssiden ud fra
  // hvem brugeren er (butiksejer/medarbejder → dashboard, kunde → /mine-kort).
  return <LoginForm next={next ?? ""} notice={notice} />;
}
