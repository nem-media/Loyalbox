"use client";

import { useActionState } from "react";
import { updateStand, type FormResult } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import type { Database } from "@/lib/types/database";
import { DESTINATION_LABELS } from "@/lib/constants";

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
            hint="Hvor glade kunder (4-5 stjerner) sendes hen som standard."
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
            <Field label="Valgfrit link">
              <Input
                name="custom_url"
                defaultValue={stand.custom_url ?? ""}
                placeholder="https://…"
              />
            </Field>
          </div>
        </>
      ) : (
        <>
          <Field
            label="Google Review-link"
            hint="Glade kunder (4-5 stjerner) sendes til din Google-anmeldelse."
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
            <a
              href="/dashboard/abonnement"
              className="font-medium text-accent"
            >
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
