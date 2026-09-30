"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Besked } from "@/components/ui/besked";
import { bekraeft, type BekraeftSvar } from "./actions";

/**
 * INGEN MARKEDSFØRINGSKRYDS. Kunden bekræfter, at e-mailen er hendes — det er
 * alt. Et kryds for nyhedsbreve her ville gøre en servicehandling til en
 * salgsflade, og en webshopkobling må aldrig ændre kundens samtykker.
 */
export function BekraeftForm({ token, butik, nyKunde }: { token: string; butik: string; nyKunde: boolean }) {
  const [svar, handling, venter] = useActionState<BekraeftSvar, FormData>(bekraeft, {});
  const [vilkaar, setVilkaar] = useState(false);

  if (svar.ok) {
    return (
      <Besked slags="ok">
        Din e-mail er bekræftet. Du kan nu bruge dine fordele fra {svar.butik} i
        webshoppen{svar.ordrer ? ` — og ${svar.ordrer === 1 ? "din tidligere ordre" : `dine ${svar.ordrer} tidligere ordrer`} tæller nu med` : ""}.
        Gå tilbage til webshoppen for at fortsætte.
      </Besked>
    );
  }

  return (
    <form action={handling} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {nyKunde ? (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="consent_terms"
            className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
            checked={vilkaar}
            onChange={(e) => setVilkaar(e.target.checked)}
          />
          <span>Jeg accepterer vilkårene for kundeprogrammet hos {butik}.</span>
        </label>
      ) : null}
      <Button type="submit" className="w-full" disabled={venter || (nyKunde && !vilkaar)}>
        {venter ? "Bekræfter …" : "Bekræft min e-mail"}
      </Button>
      {svar.error ? <Besked slags="fejl">{svar.error}</Besked> : null}
    </form>
  );
}
