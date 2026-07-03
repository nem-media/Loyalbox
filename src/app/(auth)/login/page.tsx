import { LoginForm } from "./login-form";

export const metadata = { title: "Log ind — ReviewStand.dk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <LoginForm next={next ?? "/dashboard"} />;
}
