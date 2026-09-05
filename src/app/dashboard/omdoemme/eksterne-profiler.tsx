"use client";

import { useActionState, useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { gemProfil, sletProfil, type FormResult } from "./actions";
import { PLATFORME, platformNavn } from "@/lib/omdoemme";
import type { OmdoemmeProfil } from "@/lib/omdoemme-data";

/**
 * Eksterne profiler — virksomhedens egne, selvoplyste ratings.
 *
 * INGEN PLATFORMS-BRANDING. Der er ingen Google-logo, ingen TrustStars og
 * ingen Tripadvisor-bobler. Vi har ikke ret til at bruge dem, og en side, der
 * efterligner dem, ville desuden få vores eget tal til at ligne en officiel
 * vurdering. Simple tekstlabels i LoyalSums eget design.
 *
 * FORMULAREN ER INLINE OG IKKE EN MODAL. En modal på en telefon dækker det,
 * man lige har set, og skal lukkes for at kunne sammenligne. Her folder
 * formularen sig ud på plads, og listen bliver stående ovenover.
 *
 * "OPLYST AF VIRKSOMHEDEN" STÅR PÅ HVER ENESTE RÆKKE. Ikke som en note
 * nederst: den, der kigger, skal kunne se det på den række, de kigger på.
 */

function komma(n: number): string {
  const s = n % 1 === 0 ? String(n) : n.toFixed(1);
  return s.replace(".", ",");
}

/** Dansk dato, kort. "i dag" når det er i dag — det er dét, man vil vide. */
function opdateret(iso: string): string {
  const d = new Date(iso);
  const iDag = new Date().toDateString() === d.toDateString();
  if (iDag) return "i dag";
  return d.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Profilform({
  profil,
  onLuk,
}: {
  profil?: OmdoemmeProfil;
  onLuk: () => void;
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    async (prev, fd) => {
      const res = await gemProfil(prev, fd);
      if (res.ok) onLuk();
      return res;
    },
    {},
  );

  const [platform, setPlatform] = useState(profil?.platform ?? "google");
  const valgt = PLATFORME.find((p) => p.vaerdi === platform);
  // Facebook har ikke stjerner mere; "anden" definerer selv sin skala.
  const brugerProcent = platform === "facebook";
  const egenSkala = valgt?.skala === null && platform !== "facebook";

  return (
    <Card className="mt-4">
      <CardBody>
        <form action={action} className="space-y-4">
          {profil ? <input type="hidden" name="id" value={profil.id} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Platform">
              <select
                name="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="box-shape h-11 w-full border border-border bg-background px-3 text-sm"
              >
                {PLATFORME.map((p) => (
                  <option key={p.vaerdi} value={p.vaerdi}>
                    {p.navn}
                  </option>
                ))}
              </select>
            </Field>

            {platform === "anden" ? (
              <Field label="Navn på platformen">
                <Input
                  name="visningsnavn"
                  defaultValue={profil?.visningsnavn ?? ""}
                  placeholder="Fx Booking.com"
                />
              </Field>
            ) : null}
          </div>

          {brugerProcent ? (
            <Field label="Andel der anbefaler (%)">
              <Input
                name="anbefaling_procent"
                inputMode="decimal"
                defaultValue={
                  profil?.anbefalingProcent === null ||
                  profil?.anbefalingProcent === undefined
                    ? ""
                    : String(profil.anbefalingProcent)
                }
                placeholder="94"
              />
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rating">
                <Input
                  name="rating"
                  inputMode="decimal"
                  defaultValue={
                    profil?.rating === null || profil?.rating === undefined
                      ? ""
                      : String(profil.rating)
                  }
                  placeholder="4,6"
                />
              </Field>
              <Field label={egenSkala ? "Ud af (skala)" : "Ud af"}>
                <Input
                  name="rating_skala"
                  inputMode="decimal"
                  defaultValue={String(
                    profil?.ratingSkala ?? valgt?.skala ?? 5,
                  )}
                  readOnly={!egenSkala}
                />
              </Field>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Antal anmeldelser">
              <Input
                name="antal_anmeldelser"
                inputMode="numeric"
                defaultValue={String(profil?.antalAnmeldelser ?? 0)}
                placeholder="281"
              />
            </Field>
            <Field label="Link til profil (valgfrit)">
              <Input
                name="profil_url"
                type="url"
                defaultValue={profil?.profilUrl ?? ""}
                placeholder="https://…"
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Gemmer…" : "Gem"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onLuk}
              disabled={pending}
            >
              Annullér
            </Button>
            {state.error ? (
              <span className="text-sm text-danger">{state.error}</span>
            ) : null}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function Slet({ id }: { id: string }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    sletProfil,
    {},
  );
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Slet profilen? Din score bliver regnet uden den."))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        {pending ? "Sletter…" : "Slet"}
      </Button>
      {state.error ? (
        <span className="ml-2 text-xs text-danger">{state.error}</span>
      ) : null}
    </form>
  );
}

export function EksterneProfiler({ profiler }: { profiler: OmdoemmeProfil[] }) {
  const [tilfoejer, setTilfoejer] = useState(false);
  const [redigerer, setRedigerer] = useState<string | null>(null);

  return (
    <div>
      {profiler.length === 0 && !tilfoejer ? (
        <Card>
          <CardBody>
            <p className="text-sm text-muted">
              Tilføj dine eksterne ratings for at få et mere komplet billede af
              dit omdømme.
            </p>
            <Button
              size="sm"
              className="mt-4"
              onClick={() => setTilfoejer(true)}
            >
              Tilføj profil
            </Button>
          </CardBody>
        </Card>
      ) : null}

      {profiler.length > 0 ? (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-border">
              {profiler.map((p) => (
                <li key={p.id} className="p-4 sm:p-5">
                  {redigerer === p.id ? (
                    <Profilform
                      profil={p}
                      onLuk={() => setRedigerer(null)}
                    />
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {p.platform === "anden"
                            ? (p.visningsnavn ?? "Anden platform")
                            : platformNavn(p.platform)}
                        </p>
                        <p className="mt-0.5 text-sm">
                          {p.rating !== null && p.ratingSkala !== null ? (
                            <>
                              <span className="font-medium">
                                {komma(p.rating)}
                              </span>{" "}
                              <span className="text-muted">
                                / {komma(p.ratingSkala)}
                              </span>
                            </>
                          ) : p.anbefalingProcent !== null ? (
                            <span className="font-medium">
                              {komma(p.anbefalingProcent)} % anbefaler
                            </span>
                          ) : (
                            <span className="text-muted">Ingen rating</span>
                          )}
                          {p.antalAnmeldelser > 0 ? (
                            <span className="text-muted">
                              {" · "}
                              {p.antalAnmeldelser} anmeldelser
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Oplyst af virksomheden · senest opdateret{" "}
                          {opdateret(p.opdateretDen)}
                          {p.profilUrl ? (
                            <>
                              {" · "}
                              <a
                                href={p.profilUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-accent hover:underline"
                              >
                                Åbn profil
                              </a>
                            </>
                          ) : null}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRedigerer(p.id)}
                        >
                          Rediger
                        </Button>
                        <Slet id={p.id} />
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {tilfoejer ? (
        <Profilform onLuk={() => setTilfoejer(false)} />
      ) : profiler.length > 0 ? (
        <Button
          size="sm"
          variant="outline"
          className="mt-4"
          onClick={() => setTilfoejer(true)}
        >
          Tilføj profil
        </Button>
      ) : null}
    </div>
  );
}
