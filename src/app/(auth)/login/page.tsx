import { LoginForm } from "./login-form";

export const metadata = { title: "Log ind" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Tomt `next` er meningen: så vælger login-actionen landingssiden ud fra
  // hvem brugeren er (butiksejer/medarbejder → dashboard, kunde → /mine-kort).
  return <LoginForm next={next ?? ""} />;
}
