"use client";

import { useActionState, useRef, useState } from "react";
import { updateCompany, type FormResult } from "../actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { tierCan, PRODUCTS, type Tier } from "@/lib/constants";
import type { Database } from "@/lib/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];

/**
 * Varerne, der låser logoet op. Udledt og ikke skrevet af: et abonnement
 * giver niveau `pro`, og `pro` har `customBranding`. Skifter en vare navn,
 * følger opsalget med.
 */
const MED_BRANDING = PRODUCTS.filter((p) => p.monthlyPrice && !p.addon).map(
  (p) => p.name,
);

export function ProfileForm({ company }: { company: Company }) {
  const plan = (company.plan ?? "basic") as Tier;
  const canBrand = tierCan(plan, "customBranding");
  const [state, action, pending] = useActionState<FormResult, FormData>(
    updateCompany,
    {},
  );
  const [logoUrl, setLogoUrl] = useState(company.logo_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const path = `${company.id}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("logos").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Kunne ikke uploade logo.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardBody>
        {/* GRUPPERET EFTER HVOR OPLYSNINGEN ENDER.
            Siden var én flad liste felter uden at sige, hvad de bruges til,
            og overskriften påstod, at dem alle stod på anmeldelsessiden. Kun
            navn og logo gør det; CVR, mail, telefon og adresse er vores egne
            til ordrer og faktura. Uden opdelingen kan man ikke se, om det gør
            noget, at et felt står tomt.

            Feltet "Ønsket tekst på standeren" er FJERNET. Det blev gemt og
            læst af ingenting, og hjælpeteksten lovede, at det stod på den
            fysiske stander — hvilket det aldrig har gjort. Standerens
            udseende sættes i designflowet, som ikke har et fritekstfelt. */}
        <form action={action} className="space-y-8">
          <input type="hidden" name="logo_url" value={logoUrl} />

          <section>
            <h2 className="etiket">Det dine kunder ser</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Navn og logo står øverst på den side, kunden lander på, når de
              scanner din stander — og på deres stempelkort.
            </p>

            <div className="mt-4 space-y-5">
              <div>
                <p className="mb-1.5 text-sm font-medium">Logo</p>
                {canBrand ? (
                  <div className="flex items-center gap-4">
                    <div className="box-shape grid h-16 w-16 place-items-center overflow-hidden border border-border bg-background">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logoUrl}
                          alt="Logo"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-muted">Intet</span>
                      )}
                    </div>
                    <div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFile}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? "Uploader…" : "Upload logo"}
                      </Button>
                      {uploadError ? (
                        <p className="mt-1 text-xs text-danger">
                          {uploadError}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  /* HENVISTE TIL "Premium" via TIER_LABELS. Premium er et
                     adgangsniveau, ingen vare giver — `planForProduct()`
                     svarer kun `pro` eller `basic` — så kunden blev bedt om at
                     opgradere til noget, der ikke kan købes. Navnene hentes nu
                     fra de varer, der FAKTISK låser logoet op. */
                  <div className="box-shape border border-accent/20 bg-accent/5 p-4 text-sm text-muted">
                    Dit eget logo på den side, dine kunder lander på, følger med{" "}
                    {MED_BRANDING.join(" og ")}.{" "}
                    <a
                      href="/dashboard/abonnement"
                      className="font-medium text-accent"
                    >
                      Se dit abonnement →
                    </a>
                  </div>
                )}
              </div>

              <Field
                label="Firmanavn"
                hint="Det navn, kunden ser — ikke nødvendigvis det juridiske."
              >
                <Input name="name" defaultValue={company.name} required />
              </Field>
            </div>
          </section>

          <section>
            <h2 className="etiket">Til ordrer og faktura</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Bruger vi, når du bestiller, og når vi skal have fat i dig om en
              ordre. Dine kunder ser det ikke.
            </p>

            <div className="mt-4 space-y-5">
              <Field
                label="CVR-nummer"
                hint="Otte cifre. Står på fakturaen og er påkrævet for at kunne købe."
              >
                <Input
                  name="cvr"
                  defaultValue={company.cvr ?? ""}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="12345678"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Kontaktmail"
                  hint="Hertil sender vi om din ordre."
                >
                  <Input
                    type="email"
                    name="contact_email"
                    defaultValue={company.contact_email ?? ""}
                  />
                </Field>
                <Field label="Telefon" hint="Kun hvis noget skal afklares.">
                  <Input name="phone" defaultValue={company.phone ?? ""} />
                </Field>
              </div>

              <Field label="Adresse" hint="Dit skilt sendes hertil.">
                <Input name="address" defaultValue={company.address ?? ""} />
              </Field>
            </div>
          </section>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Gemmer…" : "Gem ændringer"}
            </Button>
            {state.ok ? (
              <span className="text-sm text-success">Gemt!</span>
            ) : null}
            {state.error ? (
              <span className="text-sm text-danger">{state.error}</span>
            ) : null}
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
