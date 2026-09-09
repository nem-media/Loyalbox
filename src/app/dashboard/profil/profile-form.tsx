"use client";

import { useActionState, useRef, useState } from "react";
import { updateCompany, type FormResult } from "../actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import {
  tierCan,
  PRODUCTS,
  LEVERINGSLAND_NAVN,
  type Tier,
} from "@/lib/constants";
import {
  LOGO_KRAV,
  LOGO_TEKSTER,
  laesPngHoved,
  validerLogo,
} from "@/lib/logo";
import { LOGOFELT_CM, cmTekst } from "@/lib/skilt-format";
import type { Adresse } from "@/lib/adresse";
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

export function ProfileForm({
  company,
  adresseFraOrdre,
}: {
  company: Company;
  /** Seneste ordres adresse — kun sat, når kunden ikke selv har skrevet en. */
  adresseFraOrdre: Adresse | null;
}) {
  const plan = (company.plan ?? "basic") as Tier;
  const canBrand = tierCan(plan, "customBranding");
  const [state, action, pending] = useActionState<FormResult, FormData>(
    updateCompany,
    {},
  );
  const [logoUrl, setLogoUrl] = useState(company.logo_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [advarsler, setAdvarsler] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    /*
     * FILEN KONTROLLERES HER OGSÅ — den gjorde den ikke før.
     *
     * Feltet stod med `accept="image/*"` og uploadede alt, hvad der blev
     * valgt, direkte i lageret: en JPEG (som vi BEVIDST ikke tager imod, se
     * LOGO_KRAV), en 40 MB fil eller et 80 px ikon gik lige igennem. Samme
     * fil ender på det trykte skilt som den, designeren kræver PNG eller SVG
     * for — så de to steder gav to forskellige svar på samme spørgsmål.
     *
     * Kontrollen er den SAMME funktion, designeren bruger, og ikke en kopi
     * af reglerne: `validerLogo` afviser det ubrugelige og ADVARER om det
     * tvivlsomme. Målene læses ud af PNG'ens egne bytes uden serverkald.
     */
    const png =
      file.type === "image/png" ? laesPngHoved(await file.arrayBuffer()) : null;
    const kontrol = validerLogo(
      { navn: file.name, type: file.type, storrelse: file.size },
      png,
    );

    setAdvarsler(kontrol.advarsler);
    if (!kontrol.ok) {
      setUploadError(kontrol.fejl ?? "Filen kan ikke bruges.");
      e.target.value = "";
      return;
    }

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
                        accept={LOGO_KRAV.typer.join(",")}
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
                      {advarsler.map((a) => (
                        <p
                          key={a}
                          className={`mt-1 text-xs ${
                            a === LOGO_TEKSTER.transparentFundet
                              ? "text-accent"
                              : "text-muted"
                          }`}
                        >
                          {a}
                        </p>
                      ))}
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

                {/*
                  HVAD MAN SKAL UPLOADE — STÅR NU, FØR MAN VÆLGER FILEN.

                  Feltet sagde intet om format, størrelse eller form, og det
                  er ikke en detalje: SAMME fil ender både på kundens side og
                  på det TRYKTE skilt, hvor den ikke kan laves om bagefter.

                  Rådene hentes fra `LOGO_KRAV` og `LOGOFELT_CM` frem for at
                  blive skrevet af. En hjælpetekst med sine egne tal ville
                  før eller siden love noget andet, end kontrollen håndhæver
                  — og et flyttet logofelt i en ny Canva-eksport retter nu
                  teksten af sig selv.

                  VISES OGSÅ UDEN BRANDING: den, der overvejer at opgradere,
                  skal kunne have filen klar til den dag.
                */}
                <ul className="mt-3 space-y-1 text-xs leading-relaxed text-muted">
                  <li>{LOGO_TEKSTER.raadFormat}</li>
                  <li>{LOGO_TEKSTER.raadBredde}</li>
                  <li>
                    Feltet på standeren er {cmTekst(LOGOFELT_CM.bredde)} ×{" "}
                    {cmTekst(LOGOFELT_CM.hoejde)} cm — altså bredere end højt.
                    Et bredt logo fylder det ud; et kvadratisk står lille med
                    luft i siderne.
                  </li>
                  <li>{LOGO_TEKSTER.raadFormaal}</li>
                </ul>
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
                hint="Otte cifre. Står på fakturaen, så du kan trække momsen fra. Du kan købe uden."
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

              {/*
                ADRESSEN STYRER NU LEVERINGEN — den gjorde den ikke før.

                Feltet var én fritekstlinje, der blev gemt og læst af
                ingenting, mens hjælpeteksten lovede "Dit skilt sendes
                hertil". Handelsbetingelserne siger noget andet og rigtigt:
                der sendes til den adresse, du oplyser ved betalingen. Kunden
                kunne altså rette sin adresse uden nogen virkning.

                Nu forudfylder adressen checkouten, så en kunde, der er
                flyttet, får sit NÆSTE skilt sendt det nye sted hen uden at
                skulle huske det, mens de betaler. Delt i tre felter, fordi
                Stripe vil have vejnavn, postnummer og by hver for sig — se
                src/lib/adresse.ts for hvorfor fritekst ikke kan deles op.

                Teksten siger stadig, at adressen bekræftes ved betalingen.
                Det er sandt, og det er dét, der gør, at en enkelt levering
                til en anden adresse stadig er mulig uden at ændre profilen.
              */}
              <div className="space-y-5">
                <Field
                  label="Vejnavn og nummer"
                  hint="Herfra forudfyldes leveringen, næste gang du bestiller. Du kan altid ændre den undervejs i betalingen."
                >
                  <Input
                    name="address"
                    defaultValue={company.address ?? adresseFraOrdre?.address ?? ""}
                    autoComplete="street-address"
                  />
                </Field>

                <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
                  <Field label="Postnummer" hint="Fire cifre.">
                    <Input
                      name="postnummer"
                      defaultValue={
                        company.postnummer ?? adresseFraOrdre?.postnummer ?? ""
                      }
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="2630"
                    />
                  </Field>
                  <Field label="By" hint={`Vi sender kun i ${LEVERINGSLAND_NAVN}.`}>
                    <Input
                      name="by"
                      defaultValue={company.by ?? adresseFraOrdre?.by ?? ""}
                      autoComplete="address-level2"
                    />
                  </Field>
                </div>
              </div>
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
