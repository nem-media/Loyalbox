"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { bestilUdenKonto, type BestillingResultat } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { SkiltPreview } from "@/components/skilt-preview";
import { FOD_FORKLARING } from "@/lib/skilt-format";
import {
  MAX_QTY,
  TERMS_VERSION,
  VOLUME_DISCOUNTS,
  priceFor,
  type Product,
} from "@/lib/constants";
import {
  FRONT_TEKSTER,
  STANDARD_STANDERFARVE,
  STANDER_FARVER,
  frontFarve,
  normaliserHex,
  type StanderFarve,
  STANDARD_ACCENT,
} from "@/lib/stander-tilvalg";
import { LOGO_KRAV, LOGO_TEKSTER, laesPngHoved, validerLogo } from "@/lib/logo";
import { DESTINATIONER } from "@/lib/bestilling-uden-konto";
import { formatCurrency } from "@/lib/utils";

/** Sender browseren til Stripe. Uden for komponenten — se stander-designer.tsx. */
function gaaTil(url: string): void {
  window.location.href = url;
}

/**
 * Bestilling af et skilt UDEN konto.
 *
 * Der oprettes hverken login eller dashboard. Kunden køber ét skilt, får det
 * sendt, og skal ikke administrere noget bagefter.
 *
 * DERFOR NÆVNES DATABEHANDLERAFTALEN IKKE. Skiltet får ingen LoyalSum-side:
 * QR'en viderestiller til kundens eget link, og der indsamles ingen feedback.
 * Vi behandler altså ingen oplysninger om kundens kunder, og så er der ingen
 * databehandlerrolle at aftale. Det er ikke en udeladelse — det er hele
 * pointen med at gøre Basic til et skilt frem for et system.
 *
 * FORMULAREN ER EN RIGTIG FORMULAR med navngivne felter, så server-handlingen
 * læser dem direkte fra FormData. Logofilen sendes med som en del af den, og
 * uploades på serveren: en besøgende uden login kan ikke skrive i lageret.
 */
export function BestilUdenKontoForm({
  product,
  initialQty = 1,
}: {
  product: Product;
  /** Antallet, kunden valgte på produktsiden. Se `/bestil/uden-konto/page.tsx`. */
  initialQty?: number;
}) {
  const [state, action, pending] = useActionState<BestillingResultat, FormData>(
    async (prev, formData) => {
      const svar = await bestilUdenKonto(prev, formData);
      if (svar.url) gaaTil(svar.url);
      return svar;
    },
    {},
  );

  const clamp = (n: number) =>
    Math.max(1, Math.min(MAX_QTY, Math.floor(n) || 1));
  const [qty, setQty] = useState(clamp(initialQty));
  const [standerFarve, setStanderFarve] = useState<StanderFarve>(
    STANDARD_STANDERFARVE,
  );
  const [egenFront, setEgenFront] = useState(false);
  const [hex, setHex] = useState("#26616e");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  // Accenten er gratis at skifte — se STANDARD_ACCENT i stander-tilvalg.ts.
  const [egenAccent, setEgenAccent] = useState(false);
  const [accent, setAccent] = useState(STANDARD_ACCENT);
  const [logoFejl, setLogoFejl] = useState<string | null>(null);
  const [advarsler, setAdvarsler] = useState<string[]>([]);
  const [destination, setDestination] = useState(DESTINATIONER[0].vaerdi);

  const frontId = useId();
  const accentId = useId();
  const vilkaarId = useId();

  const front = frontFarve(standerFarve, egenFront ? hex : null);
  const brugtAccent =
    egenAccent && normaliserHex(accent) ? normaliserHex(accent) : null;
  const visAccent = brugtAccent ?? STANDARD_ACCENT;
  const pris = priceFor(product, qty, { egenFrontfarve: front.egen });
  const rabatter = VOLUME_DISCOUNTS.filter((v) => v.discountPct > 0);
  const fejl = state.fejl ?? {};

  async function vaelgFil(e: React.ChangeEvent<HTMLInputElement>) {
    const valgt = e.target.files?.[0] ?? null;
    setLogoFejl(null);
    setAdvarsler([]);
    if (logoUrl) URL.revokeObjectURL(logoUrl);

    if (!valgt) {
      setLogoUrl(null);
      return;
    }

    const png =
      valgt.type === "image/png"
        ? laesPngHoved(await valgt.arrayBuffer())
        : null;
    const kontrol = validerLogo(
      { navn: valgt.name, type: valgt.type, storrelse: valgt.size },
      png,
    );

    if (!kontrol.ok) {
      setLogoUrl(null);
      setLogoFejl(kontrol.fejl ?? "Filen kan ikke bruges.");
      e.target.value = "";
      return;
    }

    setAdvarsler(kontrol.advarsler);
    setLogoUrl(URL.createObjectURL(valgt));
  }

  const valgtDestination = DESTINATIONER.find((d) => d.vaerdi === destination)!;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="produkt" value={product.slug} />
      <input type="hidden" name="antal" value={qty} />
      <input type="hidden" name="standerFarve" value={standerFarve} />
      <input type="hidden" name="accentHex" value={brugtAccent ?? ""} />
      <input type="hidden" name="frontHex" value={egenFront ? hex : ""} />

      {/* ------------------------------------------------------ virksomhed */}
      <div className="box-shape space-y-4 border border-border bg-card p-5">
        <p className="text-sm font-medium">Din virksomhed</p>

        <Field label="Firmanavn" hint={fejl.firmanavn}>
          <Input name="firmanavn" required autoComplete="organization" />
        </Field>

        <Field
          label="CVR-nummer (valgfrit)"
          hint={
            fejl.cvr ??
            "Otte cifre. Vi sælger kun til virksomheder — men du kan bestille uden og give os nummeret senere."
          }
        >
          <Input name="cvr" inputMode="numeric" placeholder="12345678" />
        </Field>

        <Field
          label="E-mail"
          hint={
            fejl.email ??
            "Hertil sender vi kvittering og besked, når skiltet er afsendt."
          }
        >
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
      </div>

      {/* ---------------------------------------------------- standerfarve */}
      <fieldset className="box-shape border border-border bg-card p-5">
        <legend className="px-1 text-sm font-medium">Vælg stander</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {STANDER_FARVER.map((f) => (
            <label
              key={f.vaerdi}
              className={`box-shape flex cursor-pointer items-center gap-3 border p-3 transition-colors ${
                standerFarve === f.vaerdi
                  ? "border-accent bg-accent/5"
                  : "border-border hover:bg-muted-bg"
              }`}
            >
              <input
                type="radio"
                checked={standerFarve === f.vaerdi}
                onChange={() => setStanderFarve(f.vaerdi)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="h-8 w-8 shrink-0 rounded-full border border-border"
                style={{ background: f.hex }}
              />
              <span className="text-sm font-medium">{f.navn}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* ------------------------------------------------------------ logo */}
      <div className="box-shape border border-border bg-card p-5">
        <p className="text-sm font-medium">{LOGO_TEKSTER.overskrift}</p>
        <p className="mt-1 text-xs text-muted">{LOGO_TEKSTER.hjaelp}</p>

        <input
          type="file"
          name="logo"
          accept={LOGO_KRAV.typer.join(",")}
          onChange={vaelgFil}
          className="mt-3 block w-full text-sm file:btn-shape file:mr-3 file:border file:border-border file:bg-transparent file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-muted-bg"
        />

        {logoFejl ? (
          <p className="mt-2 text-sm text-danger">{logoFejl}</p>
        ) : null}
        {advarsler.map((a) => (
          <p
            key={a}
            className={`mt-2 text-sm ${
              a === LOGO_TEKSTER.transparentFundet
                ? "text-accent"
                : "text-muted"
            }`}
          >
            {a}
          </p>
        ))}

        <p className="mt-3 text-xs leading-relaxed text-muted">
          {LOGO_TEKSTER.somUploadet} {LOGO_TEKSTER.baggrundsforbehold}{" "}
          {LOGO_TEKSTER.vikontrollerer}
        </p>
      </div>

      {/* ------------------------------------------------------ destination */}
      <div className="box-shape space-y-3 border border-border bg-card p-5">
        <p className="text-sm font-medium">Hvor skal QR-koden føre hen?</p>
        <select
          name="destinationType"
          value={destination}
          onChange={(e) => setDestination(e.target.value as typeof destination)}
          className="box-shape h-11 w-full border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {DESTINATIONER.map((d) => (
            <option key={d.vaerdi} value={d.vaerdi}>
              {d.navn}
            </option>
          ))}
        </select>

        <Field
          label="Link"
          hint={fejl.destinationUrl ?? valgtDestination.hjaelp}
        >
          <Input
            name="destinationUrl"
            type="url"
            placeholder="https://…"
            required
          />
        </Field>

        <p className="text-xs leading-relaxed text-muted">
          QR-koden peger på en LoyalSum-adresse, der sender dine kunder videre
          til linket. Det betyder, at du kan skifte destination senere uden at
          skulle have nye skilte — skriv til os, så retter vi det.
        </p>
      </div>

      {/* ------------------------------------------------------ egen front */}
      <div className="box-shape border border-border bg-card p-5">
        <div className="flex items-start gap-2.5">
          <input
            id={frontId}
            type="checkbox"
            name="egenFrontfarve"
            value="1"
            checked={egenFront}
            onChange={(e) => setEgenFront(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-accent"
          />
          <label htmlFor={frontId} className="text-sm leading-relaxed">
            <span className="font-medium">{FRONT_TEKSTER.tilvalg}</span>{" "}
            <span className="text-muted">{FRONT_TEKSTER.pris}</span>
            <span className="mt-0.5 block text-xs text-muted">
              {FRONT_TEKSTER.forklaring} {FRONT_TEKSTER.prisNote}
            </span>
          </label>
        </div>

        {egenFront ? (
          <div className="mt-4 flex items-center gap-3">
            <input
              type="color"
              value={normaliserHex(hex) ?? "#26616e"}
              onChange={(e) => setHex(e.target.value)}
              aria-label="Vælg frontfarve"
              className="h-10 w-14 cursor-pointer border border-border bg-transparent p-1"
            />
            <Input
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              aria-label="Frontfarve som hex"
              className="max-w-32 font-mono"
            />
            {!normaliserHex(hex) ? (
              <span className="text-xs text-danger">Ugyldig farvekode</span>
            ) : null}
          </div>
        ) : null}
        {fejl.frontHex ? (
          <p className="mt-2 text-sm text-danger">{fejl.frontHex}</p>
        ) : null}
      </div>

      {/* ----------------------------------------------------- egen accent */}
      {/* Samme tilvalg som i designeren for en kunde med konto — de to
          bestillingsveje skal give det samme skilt. */}
      <div className="box-shape border border-border bg-card p-5">
        <div className="flex items-start gap-2.5">
          <input
            id={accentId}
            type="checkbox"
            checked={egenAccent}
            onChange={(e) => setEgenAccent(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-accent"
          />
          <label htmlFor={accentId} className="text-sm leading-relaxed">
            <span className="font-medium">Egen farve på stjerner og tekst</span>{" "}
            <span className="text-muted">— uden beregning</span>
            <span className="mt-0.5 block text-xs text-muted">
              Stjernerne, rammen om logofeltet og “Scan eller tap”. Det er den samme
              trykfil med en anden farvekode, så den koster ikke ekstra.
            </span>
          </label>
        </div>

        {egenAccent ? (
          <div className="mt-4 flex items-center gap-3">
            <input
              type="color"
              value={normaliserHex(accent) ?? STANDARD_ACCENT}
              onChange={(e) => setAccent(e.target.value)}
              aria-label="Vælg farve på stjerner og tekst"
              className="h-10 w-14 cursor-pointer border border-border bg-transparent p-1"
            />
            <Input
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              placeholder={STANDARD_ACCENT}
              aria-label="Farve på stjerner og tekst som hex"
              className="max-w-32 font-mono"
            />
            {!normaliserHex(accent) ? (
              <span className="text-xs text-danger">Ugyldig farvekode</span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* --------------------------------------------------------- preview */}
      <div className="box-shape border border-border bg-card p-5">
        <p className="text-sm font-medium">Sådan bliver den trykt</p>
        <div className="mt-3 flex justify-center">
          <SkiltPreview
            standerFarve={standerFarve}
            baggrund={front.egen ? front.hex : null}
            accent={visAccent}
            logoUrl={logoUrl}
            className="w-full max-w-[15rem]"
          />
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          Front: {front.beskrivelse}
        </p>
        <p className="mt-1 text-center text-xs text-muted">{FOD_FORKLARING}</p>
        {!logoUrl ? (
          <p className="mt-2 text-center text-xs text-muted">
            Læg dit logo op, så fylder det hele feltet øverst.
          </p>
        ) : null}
      </div>

      {/* --------------------------------------------------------- antal */}
      <div className="box-shape border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Antal standere</p>
            <p className="text-xs text-muted">
              Mængderabat fra {rabatter[0]?.minQty} stk.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Færre"
              onClick={() => setQty(clamp(qty - 1))}
              disabled={qty <= 1}
              className="btn-shape grid h-10 w-10 place-items-center border border-border text-lg font-bold transition-colors hover:bg-muted-bg disabled:opacity-40"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={MAX_QTY}
              value={qty}
              onChange={(e) => setQty(clamp(Number(e.target.value)))}
              aria-label="Antal standere"
              className="box-shape h-10 w-16 border border-border bg-background text-center text-base font-semibold [appearance:textfield] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              aria-label="Flere"
              onClick={() => setQty(clamp(qty + 1))}
              disabled={qty >= MAX_QTY}
              className="btn-shape grid h-10 w-10 place-items-center border border-border text-lg font-bold transition-colors hover:bg-muted-bg disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>
        {fejl.antal ? (
          <p className="mt-2 text-sm text-danger">{fejl.antal}</p>
        ) : null}
      </div>

      {/* ------------------------------------------------------------ pris */}
      <div className="box-shape border border-accent/30 bg-accent/5 p-5">
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt>
              {qty} × stander
              {pris.discountPct > 0 ? (
                <span className="text-accent"> (−{pris.discountPct} %)</span>
              ) : null}
            </dt>
            <dd className="tabular-nums">{formatCurrency(pris.standTotal)}</dd>
          </div>
          {pris.frontfarve > 0 ? (
            <div className="flex justify-between">
              <dt>{FRONT_TEKSTER.tilvalg}</dt>
              <dd className="tabular-nums">
                {formatCurrency(pris.frontfarve)}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
            <dt>I alt</dt>
            <dd className="tabular-nums">
              {formatCurrency(pris.oneTimeTotal)}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted">
          Alle priser er uden moms. Levering i Danmark.
        </p>
      </div>

      {/* -------------------------------------------------------- betaling */}
      <div>
        <div className="mb-3 flex items-start gap-2.5">
          <input
            id={vilkaarId}
            type="checkbox"
            name="accepterVilkaar"
            value="1"
            className="mt-1 h-4 w-4 shrink-0 accent-accent"
          />
          <label htmlFor={vilkaarId} className="text-sm leading-relaxed">
            Jeg accepterer{" "}
            <Link
              href="/handelsbetingelser"
              className="font-medium text-accent hover:underline"
            >
              handelsbetingelserne
            </Link>{" "}
            (version {TERMS_VERSION}), og at jeg køber som virksomhed.
          </label>
        </div>
        {fejl.accepterVilkaar ? (
          <p className="mb-2 text-sm text-danger">{fejl.accepterVilkaar}</p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending || (egenFront && !normaliserHex(hex))}
        >
          {pending ? "Sender…" : "Gå til betaling"}
        </Button>

        {state.besked ? (
          <p className="mt-2 text-sm text-danger">{state.besked}</p>
        ) : null}

        <p className="mt-3 text-xs leading-relaxed text-muted">
          Du får ingen konto og intet login — skiltet sendes til dig, og det er
          det. Vil du senere have statistik, feedback og stempelkort, kan du
          altid oprette en konto og opgradere.
        </p>
      </div>
    </form>
  );
}
