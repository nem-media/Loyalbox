import { SignupForm } from "./signup-form";
import { PRIVAT_SIDE } from "@/lib/site";

export const metadata = {
  title: "Opret virksomhed",
  ...PRIVAT_SIDE,
};

export default function SignupPage() {
  return <SignupForm />;
}
