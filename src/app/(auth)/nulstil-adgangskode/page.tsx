import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { NewPasswordForm } from "./new-password-form";

export const metadata = { title: "Vælg ny adgangskode" };

/**
 * Nås kun via linket i nulstillingsmailen, der går gennem `/auth/callback` og
 * dermed giver en session. Er der ingen session, er linket udløbet eller
 * allerede brugt — så siger vi det i stedet for at vise en formular, der
 * alligevel ville fejle.
 *
 * Bemærk: siden må IKKE tilføjes til `isAuthPage` i middleware. Brugeren ER
 * logget ind på dette tidspunkt, og ville derfor blive sendt til dashboardet,
 * før de nåede at vælge en ny adgangskode.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Card className="shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)]">
        <CardBody className="space-y-3 text-center">
          <h1 className="text-xl font-bold tracking-tight">
            Linket virker ikke længere
          </h1>
          <p className="text-sm text-muted">
            Nulstillingslinket er udløbet eller allerede brugt. Bed om et nyt —
            det tager et øjeblik.
          </p>
          <Link
            href="/glemt-adgangskode"
            className="inline-block text-sm font-medium text-accent"
          >
            Send et nyt link
          </Link>
        </CardBody>
      </Card>
    );
  }

  return <NewPasswordForm email={user.email ?? ""} />;
}
