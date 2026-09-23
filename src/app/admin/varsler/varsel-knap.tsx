"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Besked } from "@/components/ui/besked";
import { sendVarselTilAlle } from "../actions";
import type { FormResult } from "../actions";

/**
 * Knappen, der sender.
 *
 * DER ER ET EKSTRA TRYK IMELLEM, og det er ikke høflighed. Handlingen mailer
 * hver eneste kunde og kan ikke gøres om — et enkelt fejlklik ville sende et
 * juridisk varsel ud til hele kundelisten. Bekræftelsen siger ANTALLET, så
 * det, man bekræfter, er en mængde og ikke en abstraktion.
 *
 * En browserdialog (`confirm`) ville være enklere og er valgt fra: den kan
 * ikke stiles, den ser ud som en fejl, og i et dashboard er den dét, folk
 * klikker væk uden at læse.
 */
export function VarselKnap({
  slags,
  antal,
}: {
  slags: "vilkaar" | "dpa" | "begge";
  antal: number;
}) {
  const [aaben, setAaben] = useState(false);
  const [state, action, pending] = useActionState<FormResult, FormData>(
    async (_forrige, formData) => sendVarselTilAlle(formData),
    {},
  );

  if (state.ok || state.error) {
    return (
      <div className="min-w-0 max-w-md">
        <Besked slags={state.ok ? "ok" : "fejl"}>{state.error}</Besked>
      </div>
    );
  }

  if (!aaben) {
    return (
      <Button type="button" variant="outline" onClick={() => setAaben(true)}>
        Send varsel…
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="slags" value={slags} />
      <span className="text-sm">
        Send til <strong>{antal}</strong>?
      </span>
      <Button type="submit" disabled={pending}>
        {pending ? "Sender…" : "Ja, send"}
      </Button>
      <Button type="button" variant="outline" onClick={() => setAaben(false)}>
        Fortryd
      </Button>
    </form>
  );
}
