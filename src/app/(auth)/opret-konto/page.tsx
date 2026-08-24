import { CustomerSignupForm } from "./customer-signup-form";
import { PRIVAT_SIDE } from "@/lib/site";

export const metadata = {
  title: "Opret kundekonto",
  ...PRIVAT_SIDE,
};

export default async function CustomerSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;
  return <CustomerSignupForm token={token ?? ""} email={email ?? ""} />;
}
