"use client";

import { useActionState } from "react";
import { updateStand, type FormResult } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import type { Database } from "@/lib/types/database";
import { DESTINATION_LABELS } from "@/lib/constants";
import {
  laesEgnePlatforme,
  MAKS_EGNE_PLATFORME,
  MAKS_ANMELDELSESLINKS,
  EGEN_PLATFORM_NAVN_MAKS,
} from "@/lib/stands";

type Stand = Database["public"]["Tables"]["stands"]["Row"];

const DESTINATIONS = ["google", "trustpilot", "facebook", "custom"] as const;

export function EditStand({
  stand,
  canDynamicLinks,
}: {
  stand: Stand;
  canDynamicLinks: boolean;
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    updateStand,
    {},
  );

  /* Kolonnen er jsonb og læses forsvarligt — se `laesEgnePlatforme`. */
  const egne = laesEgnePlatforme(stand.egne_platforme);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="stand_id" value={stand.id} />

      <Field label="Navn på stander">
        <Input name="name" defaultValue={stand.name} required />
      </Field>

      {canDynamicLinks ? (
        <>
          <Field
            label="Primær destination"
            hint="Hvor kunden sendes hen som standard, når de vil skrive en offentlig anmeldelse."
          >
            <select
              name="destination_type"
              defaultValue={stand.destination_type}
              className="box-shape h-11 w-full border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {DESTINATIONS.map((d) => (
                <option key={d} value={d}>
                  {DESTINATION_LABELS[d]}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Google Review-link">
              <Input
                name="google_review_url"
                defaultValue={stand.google_review_url ?? ""}
                placeholder="https://g.page/r/…"
              />
            </Field>
            <Field label="Trustpilot-link">
              <Input
                name="trustpilot_url"
                defaultValue={stand.trustpilot_url ?? ""}
                placeholder="https://trustpilot.com/…"
              />
            </Field>
            <Field label="Facebook-link">
              <Input
                name="facebook_url"
                defaultValue={stand.facebook_url ?? ""}
                placeholder="https://facebook.com/…"
              />
            </Field>
            <Field
              label="Eget link (fx menukort)"
              hint="Står på hovedsiden ved siden af “Del din oplevelse” — ikke blandt anmeldelsesknapperne."
            >
              <Input
                name="custom_url"
                defaultValue={stand.custom_url ?? ""}
                placeholder="https://…"
              />
            </Field>
            <Field
              label="Tekst på eget link"
              hint="Fx “Se menukort” eller “Booke bord”. Hovedsiden spørger “Hvad vil du gerne?”, så teksten skal kunne svare på det."
            >
              <Input
                name="custom_label"
                defaultValue={stand.custom_label ?? ""}
                placeholder="Se menukort"
              />
            </Field>
          </div>

          {/*
            DINE EGNE ANMELDELSESPLATFORME (0032).
            Google, Trustpilot og Facebook har hver sin kolonne, fordi vi
            kender deres navne. Her skriver butikken selv både navn og
            adresse — en tandlæge vil på jameda, et værksted på en
            brancheportal, og dem kan vi ikke forudse.

            IKKE DET SAMME SOM "eget link" ovenfor: dét er menukortet eller
            bookingen og hedder aldrig "Anmeld os på".
          */}
          <div className="mt-6">
            <p className="etiket">Dine egne anmeldelsesplatforme</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Bruger dine kunder en anden portal end Google, Trustpilot og
              Facebook? Skriv den her. De står som “Anmeld os på …” på den
              side, kunden kommer til efter “Del din oplevelse” — ikke på
              hovedsiden. Der kan stå{" "}
              <strong>højst {MAKS_ANMELDELSESLINKS} anmeldelsesknapper</strong>{" "}
              på siden ad gangen — ryd et link, hvis du vil bytte. Alle knapper
              vejer det samme, og en lang liste vælger reelt for kunden.
            </p>

            <div className="mt-4 space-y-4">
              {Array.from({ length: MAKS_EGNE_PLATFORME }, (_, i) => {
                const p = egne[i];
                return (
                  <div key={i} className="grid gap-5 sm:grid-cols-[14rem_1fr]">
                    <Field label={`Navn ${i + 1}`} hint="Står på knappen.">
                      <Input
                        name={`egen_navn_${i}`}
                        defaultValue={p?.navn ?? ""}
                        maxLength={EGEN_PLATFORM_NAVN_MAKS}
                        placeholder="Fx jameda"
                      />
                    </Field>
                    <Field label={`Link ${i + 1}`}>
                      <Input
                        name={`egen_url_${i}`}
                        type="url"
                        defaultValue={p?.url ?? ""}
                        placeholder="https://…"
                      />
                    </Field>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Teksten sagde før "Glade kunder (4-5 stjerner) sendes til din
              Google-anmeldelse". Det var en beskrivelse af REVIEW GATING og
              stammede fra dengang, flowet delte ved fire stjerner. Adfærden
              blev fjernet (se `reviewChoices()`), men teksten blev stående —
              så panelet lovede stadig en funktion, der både er væk og er
              ulovlig efter markedsføringslovens bilag 1, nr. 23c. */}
          <Field
            label="Google Review-link"
            hint="Alle kunder får linket — uanset hvor mange stjerner de giver."
          >
            <Input
              name="google_review_url"
              defaultValue={stand.google_review_url ?? ""}
              placeholder="https://g.page/r/…"
            />
          </Field>
          <div className="box-shape border border-accent/20 bg-accent/5 p-4 text-sm text-muted">
            Flere destinationstyper (Trustpilot, Facebook, eget link) og
            dynamiske links, du kan skifte når som helst, er en del af Pro.{" "}
            <a href="/dashboard/abonnement" className="font-medium text-accent">
              Opgrader til Pro →
            </a>
          </div>
        </>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={stand.is_active}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        Stander er aktiv
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Gemmer…" : "Gem stander"}
        </Button>
        {state.ok ? <span className="text-sm text-success">Gemt!</span> : null}
        {state.error ? (
          <span className="text-sm text-danger">{state.error}</span>
        ) : null}
      </div>
    </form>
  );
}
