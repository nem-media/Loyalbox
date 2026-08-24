import { ForgotPasswordForm } from "./forgot-password-form";
import { PRIVAT_SIDE } from "@/lib/site";

export const metadata = {
  title: "Glemt adgangskode",
  ...PRIVAT_SIDE,
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
