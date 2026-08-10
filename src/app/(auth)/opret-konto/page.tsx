import { CustomerSignupForm } from "./customer-signup-form";

export const metadata = { title: "Opret kundekonto" };

export default async function CustomerSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;
  return <CustomerSignupForm token={token ?? ""} email={email ?? ""} />;
}
