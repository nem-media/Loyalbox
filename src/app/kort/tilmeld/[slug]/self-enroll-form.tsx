"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { selfEnroll, type EnrollState } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

/**
 * Tilmeldingen til et stempelkort.
 *
 * FELTERNE ER STYREDE (`value` + `useState`) OG IKKE FRIE, og det er hele
 * pointen: React nulstiller en formular, når en server action svarer, så et
 * glemt flueben ved vilkårene tømte navn, e-mail OG telefon. Kunden fik en
 * rød besked om afkrydsningsfeltet og skulle skrive alt forfra — foran disken,
 * på en telefon. Med styrede felter overlever det, hun har skrevet, sit eget
 * afviste forsøg.
 *
 * Afkrydsningsfelterne er styrede af samme grund: et fravalgt marketing-flueben
 * må heller ikke sætte sig selv tilbage, og et sat flueben skal blive stående,
 * hvis det var noget ANDET, der manglede.
 */
export function SelfEnrollForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<EnrollState, FormData>(
    selfEnroll,
    {},
  );

  const [navn, setNavn] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [vilkaar, setVilkaar] = useState(false);
  const [markedsfoering, setMarkedsfoering] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <Field label="Navn">
        <Input
          name="name"
          placeholder="Dit navn"
          value={navn}
          onChange={(e) => setNavn(e.target.value)}
        />
      </Field>
      <Field label="E-mail">
        <Input
          type="email"
          name="email"
          placeholder="din@email.dk"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Telefon (valgfri)">
        <Input
          name="phone"
          value={telefon}
          onChange={(e) => setTelefon(e.target.value)}
        />
      </Field>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="consent_terms"
          className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
          checked={vilkaar}
          onChange={(e) => setVilkaar(e.target.checked)}
        />
        <span>Jeg accepterer vilkårene for stempelkortet.</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="consent_marketing"
          className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
          checked={markedsfoering}
          onChange={(e) => setMarkedsfoering(e.target.checked)}
        />
        <span>Send mig gerne tilbud og nyheder (valgfrit).</span>
      </label>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.loginRequired ? (
        <Link
          href="/login?next=/mine-kort"
          className="block text-sm font-medium text-accent"
        >
          Log ind og åbn dit kort
        </Link>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Opretter…" : "Opret mit stempelkort"}
      </Button>
    </form>
  );
}
