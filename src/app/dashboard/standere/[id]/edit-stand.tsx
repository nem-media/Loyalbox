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

/**
 * EKSEMPLERNE I NAVNEFELTET.
 *
 * Stod som "Fx jameda" i begge rækker. Jameda er en TYSK lægeportal — den
 * siger ingenting til en dansk café eller et hotel, og en pladsholder, man
 * ikke genkender, forklarer ikke hvad feltet er til. To forskellige og
 * velkendte navne gør samtidig noget, én ikke kan: de viser, at der er plads
 * til mere end ét sted.
 *
 * Falder listen kortere end `MAKS_EGNE_PLATFORME`, bruges en neutral tekst —
 * så kan tallet hæves uden at en række står med en tom pladsholder.
 */
const EGEN_PLATFORM_EKSEMPLER = ["Fx Tripadvisor.dk", "Fx Booking.com"];

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
          </div>

          {/*
            ANDRE ANMELDELSESPLATFORME (0032).
            Google, Trustpilot og Facebook har hver sin kolonne, fordi vi
            kender deres navne. Her skriver butikken selv både navn og
            adresse — et hotel vil på Booking.com, en restaurant på
            Tripadvisor, en tandlæge på en brancheportal, og dem kan vi ikke
            forudse alle sammen.

            IKKE DET SAMME SOM "eget link" NEDENFOR: dét er menukortet eller
            bookingen og hedder aldrig "Anmeld os på". Netop derfor står de to
            ting hver for sig nu — de blev læst som det samme, da feltet lå
            oppe mellem anmeldelseslinkene.
          */}
          <div className="mt-6">
            <p className="etiket">Andre anmeldelsesplatforme</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Bruger dine kunder en anden portal end Google, Trustpilot og
              Facebook? Skriv den her. De står som “Anmeld os på …” på den
              side, kunden kommer til efter “Anmeld os” — ikke på
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
                        placeholder={EGEN_PLATFORM_EKSEMPLER[i] ?? "Fx en brancheportal"}
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

          {/*
            EGET LINK STÅR FOR SIG SELV OG TIL SIDST.

            Felterne lå før oppe i gitteret mellem Google-, Trustpilot- og
            Facebook-linkene, og dét var to fejl på én gang. Dels blev de læst
            som endnu en anmeldelsesplatform — og eget link er præcis dét
            modsatte: det er menukortet eller bookingen, det står på
            HOVEDsiden ved siden af “Anmeld os”, og det hedder aldrig “Anmeld
            os på …”. Dels delte gitterets to kolonner dem op på hver sin
            række, så adressen og teksten til den samme knap stod med et helt
            felt imellem sig.

            De hører sammen og står derfor side om side i deres eget gitter.
          */}
          <div className="mt-6">
            <p className="etiket">Eget link</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Vil du sende kunden et helt andet sted hen end en anmeldelse —
              fx menukortet eller en booking? Linket står på hovedsiden ved
              siden af “Anmeld os” og tæller ikke som en anmeldelse.
            </p>

            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <Field label="Eget link (fx menukort)">
                <Input
                  name="custom_url"
                  defaultValue={stand.custom_url ?? ""}
                  placeholder="https://…"
                />
              </Field>
              <Field
                label="Tekst på eget link"
                hint="Hovedsiden spørger “Hvad vil du gerne?”, så teksten skal kunne svare på det."
              >
                <Input
                  name="custom_label"
                  defaultValue={stand.custom_label ?? ""}
                  placeholder="Se menukort"
                />
              </Field>
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
