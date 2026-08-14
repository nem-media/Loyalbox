import { LoginForm } from "./login-form";

export const metadata = { title: "Log ind" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; fejl?: string }>;
}) {
  const { next, fejl } = await searchParams;

  // `fejl=link` sættes af /auth/callback, når koden i en auth-mail ikke kunne
  // veksles — typisk fordi linket er udløbet eller allerede brugt.
  const notice =
    fejl === "link"
      ? "Linket virkede ikke længere. Log ind, eller bed om et nyt link."
      : undefined;

  // Tomt `next` er meningen: så vælger login-actionen landingssiden ud fra
  // hvem brugeren er (butiksejer/medarbejder → dashboard, kunde → /mine-kort).
  return <LoginForm next={next ?? ""} notice={notice} />;
}
