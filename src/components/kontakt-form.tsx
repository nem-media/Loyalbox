"use client";

import { useActionState, useId } from "react";
import { Besked } from "@/components/ui/besked";
import { sendKontakt, type KontaktResultat } from "@/app/kontakt/actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { EMNER, STANDARD_EMNE, SVARTID } from "@/lib/kontakt";
import { COMPANY } from "@/lib/constants";

/**
 * Kontaktformularen.
 *
 * ALTID UDFOLDET, modsat ventelistens. Den står på en side, der kun handler om
 * at komme i kontakt, så der er intet at flytte fokus fra — og et ekstra klik
 * før man kan skrive er præcis dét, der får folk til at lade være.
 *
 * Der gemmes intet hos os; beskeden sendes som en mail. Se src/lib/kontakt.ts.
 */
export function KontaktForm() {
  const [state, action, pending] = useActionState<KontaktResultat, FormData>(
    sendKontakt,
    {},
  );

  const navnId = useId();
  const firmaId = useId();
  const mailId = useId();
  const tlfId = useId();
  const emneId = useId();
  const beskedId = useId();

  if (state.ok) {
    return (
      <div className="box-shape border border-accent/30 bg-accent/5 p-6">
        <p className="font-bold tracking-tight">Tak — vi har din besked</p>
        <p className="mt-2 text-sm text-muted">
          {SVARTID} Svaret kommer til den mailadresse, du skrev. Haster det, er
          du velkommen til at skrive direkte til{" "}
          <a
            href={`mailto:${COMPANY.email}`}
            className="font-medium text-accent"
          >
            {COMPANY.email}
          </a>
          .
        </p>
      </div>
    );
  }

  /*
    `defaultValue` fra `state.udfyldt` er IKKE pynt. React nulstiller en
    formular, når dens action er kørt færdig — også når serveren afviste den.
    Uden det her stod man med tomme felter og en rød linje efter at have
    skrevet en lang besked. Nulstillingen sætter felterne tilbage til deres
    `defaultValue`, og dem har vi lige opdateret med det, der blev skrevet.
  */
  return (
    <form action={action} className="space-y-4">
      {/* HONNINGKRUKKE. Skjult for mennesker, udfyldes af robotter, der
          udfylder alt. `aria-hidden` og tabIndex holder den ude af både
          skærmlæsere og tastaturet, så den kun rammer det, den skal. */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor={`${navnId}-hp`}>Din hjemmeside</label>
        <input
          id={`${navnId}-hp`}
          name="hjemmeside"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Navn" fejl={state.fejl?.navn}>
          <Input
            id={navnId}
            name="navn"
            required
            autoComplete="name"
            defaultValue={state.udfyldt?.navn ?? ""}
          />
        </Field>
        <Field label="E-mail" fejl={state.fejl?.email}>
          <Input
            id={mailId}
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={state.udfyldt?.email ?? ""}
          />
        </Field>
      </div>

      {/*
        VIRKSOMHEDEN ER DÉT, DER OFTEST AFGØR, OM VI KAN SVARE I FØRSTE MAIL.
        Kender vi butikken, kan vi slå ordren, abonnementet eller standeren op,
        før vi skriver tilbage. Feltet er FRIVILLIGT, fordi den, der skriver,
        fordi hun overvejer en stander, endnu ikke HAR en butik hos os — et
        påkrævet felt ville stille hende et spørgsmål, hun ikke kan svare på.
      */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Virksomhed (valgfrit)"
          fejl={state.fejl?.virksomhed}
          hint="Så kan vi slå din butik op, før vi svarer."
        >
          <Input
            id={firmaId}
            name="virksomhed"
            autoComplete="organization"
            defaultValue={state.udfyldt?.virksomhed ?? ""}
          />
        </Field>
        <Field
          label="Telefon (valgfrit)"
          fejl={state.fejl?.telefon}
          hint="Kun hvis du hellere vil ringes op."
        >
          <Input
            id={tlfId}
            name="telefon"
            autoComplete="tel"
            defaultValue={state.udfyldt?.telefon ?? ""}
          />
        </Field>
      </div>

      {/* EMNET FÅR HELE BREDDEN. Det stod som tredje barn i gitteret ovenfor
          og landede derfor alene i venstre halvdel, da virksomhedsfeltet kom
          til — en halvbred kontrol med tom plads ved siden af læses som et
          layout, der er gået i stykker. Emnet bliver til mailens emnelinje og
          er dermed et felt for sig. */}
      <Field label="Hvad handler det om?" fejl={state.fejl?.emne}>
          <select
            id={emneId}
            name="emne"
            defaultValue={state.udfyldt?.emne || STANDARD_EMNE}
            className="box-shape h-11 w-full border border-border bg-background px-3 text-sm focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {EMNER.map((e) => (
              <option key={e.vaerdi} value={e.vaerdi}>
                {e.navn}
              </option>
            ))}
          </select>
      </Field>

      <Field
        label="Din besked"
        fejl={state.fejl?.besked}
        hint="Skriv gerne, hvilken butik eller ordre det drejer sig om — så kan vi svare med det samme i stedet for at spørge."
      >
        <Textarea
          id={beskedId}
          name="besked"
          rows={6}
          required
          defaultValue={state.udfyldt?.besked ?? ""}
        />
      </Field>

      {state.fejlbesked ? (
        <Besked slags="fejl">{state.fejlbesked}</Besked>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Sender…" : "Send besked"}
        </Button>
        <span className="text-xs text-muted">{SVARTID}</span>
      </div>

      {/*
        OPLYSNINGSPLIGTEN SKAL OPFYLDES DÉR, HVOR DER INDSAMLES — ikke kun i en
        politik, ingen åbner. Linjen KAN derfor ikke bare fjernes: et navn og
        en mailadresse er personoplysninger, og GDPR art. 13 kræver, at den,
        der afgiver dem, får at vide hvad der sker med dem.

        MEN DEN VAR TRE SÆTNINGER OG NÆVNTE SELSKABET. "…i vores mailboks hos
        Nem Media ApS" var hverken et krav eller en hjælp — den, der skriver,
        har aldrig hørt om Nem Media, og navnet hører hjemme dér, hvor loven
        beder om en identifikation (footeren, betingelserne, aftalen). Nu er
        det én sætning: hvad vi bruger det til, at det ikke gemmes, og
        advarslen, der faktisk beskytter afsenderen.
      */}
      {/* `max-w-lg` og ikke `xl`: linjen er 12 px skrift, og 36rem giver 96
          tegn — lige over dét, oejet kan foelge tilbage til venstre kant.
          Spalten skal foelge skriftstoerrelsen og ikke omvendt. */}
      <p className="max-w-lg text-xs leading-relaxed text-muted">
        Vi bruger kun det, du skriver, til at svare dig, og beskeden gemmes
        ikke i systemet — skriv derfor ikke følsomme oplysninger her. Se{" "}
        <a href="/privatliv" className="font-medium text-accent">
          privatlivspolitikken
        </a>
        .
      </p>
    </form>
  );
}
