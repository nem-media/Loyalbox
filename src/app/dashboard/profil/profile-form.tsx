"use client";

import { useActionState, useRef, useState } from "react";
import { updateCompany, type FormResult } from "../actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { tierCan, TIER_LABELS, type Tier } from "@/lib/constants";
import type { Database } from "@/lib/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];

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
        <form action={action} className="space-y-5">
          <input type="hidden" name="logo_url" value={logoUrl} />

          {/* Logo */}
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
                    <p className="mt-1 text-xs text-danger">{uploadError}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="box-shape border border-accent/20 bg-accent/5 p-4 text-sm text-muted">
                Eget logo og tilpasset design er en del af{" "}
                {TIER_LABELS.premium}.{" "}
                <a
                  href="/dashboard/abonnement"
                  className="font-medium text-accent"
                >
                  Opgrader for at tilføje dit logo →
                </a>
              </div>
            )}
          </div>

          <Field label="Firmanavn">
            <Input name="name" defaultValue={company.name} required />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Kontaktmail">
              <Input
                type="email"
                name="contact_email"
                defaultValue={company.contact_email ?? ""}
              />
            </Field>
            <Field label="Telefon">
              <Input name="phone" defaultValue={company.phone ?? ""} />
            </Field>
          </div>

          <Field label="Adresse">
            <Input name="address" defaultValue={company.address ?? ""} />
          </Field>

          <Field
            label="Ønsket tekst på standeren"
            hint="Vises på din fysiske stander, fx “Anmeld os og hjælp os med at blive bedre”."
          >
            <Textarea name="stand_text" defaultValue={company.stand_text ?? ""} />
          </Field>

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
