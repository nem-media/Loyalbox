"use client";

import { useActionState } from "react";
import { updateStandLinks, type FormResult } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { qrAdresseFor } from "@/lib/qr-adresse";
import { DESTINATION_LABELS } from "@/lib/constants";
import type { Database } from "@/lib/types/database";

type Stand = Database["public"]["Tables"]["stands"]["Row"];
const DESTINATIONS = ["google", "trustpilot", "facebook", "custom"] as const;

export function AdminStandLinks({ stand }: { stand: Stand }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    updateStandLinks,
    {},
  );

  /*
   * ADRESSEN, DER STÅR I QR-KODEN — ikke `/r/<slug>` pr. automatik.
   *
   * Her stod før slug'en for hver eneste stander. Uden abonnement peger
   * koden DIREKTE på butikkens eget link, og `/r/`-adressen findes reelt
   * ikke for den kunde: åbnede man linket, viderestillede den bare. Admin
   * læste altså en adresse, der aldrig blev trykt.
   *
   * `qrAdresseFor()` er den samme funktion, som tegner trykfilen, så de to
   * ikke kan komme til at sige hver sit.
   */
  const qrAdresse = qrAdresseFor(stand);

  return (
    <form action={action} className="box-shape space-y-4 border border-border p-4">
      <input type="hidden" name="stand_id" value={stand.id} />
      <input type="hidden" name="company_id" value={stand.company_id} />

      <div className="flex items-center justify-between">
        <p className="font-medium">{stand.name}</p>
        {qrAdresse ? (
          <a
            href={qrAdresse}
            target="_blank"
            rel="noreferrer"
            className="max-w-[60%] truncate text-xs text-accent"
            title={qrAdresse}
          >
            {qrAdresse}
          </a>
        ) : (
          <span className="text-xs text-muted">Ingen destination</span>
        )}
      </div>

      <p className="-mt-2 text-xs text-muted">
        {stand.kun_viderestilling
          ? "Uden abonnement: QR-koden peger direkte på linket herunder. Et trykt skilt kan derfor ikke flyttes — en ændring her gælder kun nye tryk."
          : "Med abonnement: QR-koden peger på /r/" +
            stand.slug +
            ", så en ændring her slår igennem på skilte, der allerede står ude."}
      </p>

      <Field label="Primær destination">
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

      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="google_review_url" defaultValue={stand.google_review_url ?? ""} placeholder="Google-link" />
        <Input name="trustpilot_url" defaultValue={stand.trustpilot_url ?? ""} placeholder="Trustpilot-link" />
        <Input name="facebook_url" defaultValue={stand.facebook_url ?? ""} placeholder="Facebook-link" />
        <Input name="custom_url" defaultValue={stand.custom_url ?? ""} placeholder="Valgfrit link" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={stand.is_active} className="h-4 w-4 accent-[var(--accent)]" />
        Aktiv
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Gemmer…" : "Gem links"}
        </Button>
        {state.ok ? <span className="text-sm text-success">Gemt!</span> : null}
        {state.error ? <span className="text-sm text-danger">{state.error}</span> : null}
      </div>
    </form>
  );
}
