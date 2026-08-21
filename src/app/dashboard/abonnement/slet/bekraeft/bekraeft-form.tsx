"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { bekraeftSletning } from "../actions";
import type { FormResult } from "../../../actions";
import { Button } from "@/components/ui/button";

/**
 * Den knap, der faktisk sætter datoen.
 *
 * Ved succes sendes brugeren videre til statussiden, hvor datoen og
 * fortryd-knappen står. At blive stående på en side, der siger "bekræft",
 * efter man har bekræftet, er en af de nemmeste måder at få nogen til at
 * trykke to gange.
 */
export function BekraeftForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    bekraeftSletning,
    {},
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.replace("/dashboard/abonnement/slet");
  }, [state.ok, router]);

  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Bekræfter…" : "Ja, slet alt om 7 dage"}
      </Button>
      {state.error ? (
        <p className="mt-3 text-sm text-danger">{state.error}</p>
      ) : null}
    </form>
  );
}
