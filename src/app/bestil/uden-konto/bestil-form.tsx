"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { bestilUdenKonto, type BestillingResultat } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { SkiltPreview } from "@/components/skilt-preview";
import { FormSektion, TilvalgRaekke } from "@/components/ui/form-sektion";
import { StoreIcon, StandIcon, LinkIcon } from "@/components/nav-icons";
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
import { DESTINATION_INTRO } from "@/components/destination-felt";
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
    <form
      action={action}
      /*
       * TO SPALTER: VALGENE TIL VENSTRE, RESULTATET TIL HØJRE.
       *
       * Bestillingen lå før i én bane på en halv skærmbredde — otte ens
       * kasser i en stak, hvor previewet først dukkede op, når man havde
       * rullet forbi alle valgene. Man kunne altså ikke se, hvad man lavede,
       * mens man lavede det.
       *
       * `items-start` er ikke pynt: uden den strækkes spalterne til samme
       * højde, og så har den klæbende kolonne ingen plads at klæbe i.
       *
       * PÅ EN TELEFON falder de to spalter i én, og højre spalte lander
       * NEDERST — altså preview → antal → pris i netop den rækkefølge,
       * bestillingen skal læses i.
       */
      className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-8"
    >
      <input type="hidden" name="produkt" value={product.slug} />
      <input type="hidden" name="antal" value={qty} />
      <input type="hidden" name="standerFarve" value={standerFarve} />
      <input type="hidden" name="accentHex" value={brugtAccent ?? ""} />
      <input type="hidden" name="frontHex" value={egenFront ? hex : ""} />

      {/* ================================================ venstre: valgene */}
      <div className="space-y-5 lg:col-span-7">
        {/* --------------------------------------------------- virksomhed */}
        <FormSektion
          titel="Din virksomhed"
          beskrivelse="Bruges til fakturaen og til at sende skiltet."
          icon={StoreIcon}
          /* Forklaringen på det valgfrie CVR stod før som hjælpetekst under
             feltet. I en halv spaltebredde blev den tre linjer og skubbede
             e-mailfeltet ned; den hører til hele sektionen, ikke til ét felt. */
          fodnote="Vi sælger kun til virksomheder — men du kan bestille uden CVR-nummer og give os det senere."
        >
          <div className="space-y-3">
            {/* To korte felter side om side frem for to fulde bredder under
                hinanden — hverken et firmanavn eller otte cifre fylder en
                linje. */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Firmanavn" hint={fejl.firmanavn}>
                <Input name="firmanavn" required autoComplete="organization" />
              </Field>
              <Field label="CVR-nummer (valgfrit)" hint={fejl.cvr}>
                <Input name="cvr" inputMode="numeric" placeholder="12345678" />
              </Field>
            </div>
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
        </FormSektion>

        {/* ----------------------------------------------------- dit skilt */}
        <FormSektion
          titel="Dit skilt"
          beskrivelse="Farve, logo og de to farvevalg. Alt, du ændrer, ses med det samme."
          icon={StandIcon}
          fodnote={
            <>
              {LOGO_TEKSTER.somUploadet} {LOGO_TEKSTER.baggrundsforbehold}{" "}
              {LOGO_TEKSTER.vikontrollerer}
            </>
          }
        >
          <div className="divide-y divide-border">
            {/* ---------------------------------------- standerens farve */}
            <fieldset className="pb-4">
              <legend className="mb-2 text-sm font-medium">Vælg stander</legend>
              <div className="grid grid-cols-2 gap-3">
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
                    {/* Et flueben frem for kun en ramme: forskellen mellem
                        valgt og fravalgt var en stregfarve, og den kan man
                        ikke se uden at have de to ved siden af hinanden. */}
                    {standerFarve === f.vaerdi ? (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="ml-auto h-4 w-4 shrink-0 text-accent"
                      >
                        <path d="m5 13 4 4L19 7" />
                      </svg>
                    ) : null}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* ----------------------------------------------------- logo */}
            <div className="py-4">
              <p className="text-sm font-medium">{LOGO_TEKSTER.overskrift}</p>
              <p className="mt-0.5 text-xs text-muted">{LOGO_TEKSTER.hjaelp}</p>

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
              {!logoUrl ? (
                <p className="mt-2 text-xs text-muted">
                  Uden logo trykkes feltet med pladsholderen “Dit logo”.
                </p>
              ) : null}
            </div>

            {/* ----------------------------------------------- egen front */}
            <TilvalgRaekke
              id={frontId}
              name="egenFrontfarve"
              checked={egenFront}
              onChange={setEgenFront}
              navn={FRONT_TEKSTER.tilvalg}
              pris={FRONT_TEKSTER.pris}
              forklaring={`${FRONT_TEKSTER.forklaring} ${FRONT_TEKSTER.prisNote}`}
            >
              <div className="mt-3 flex flex-wrap items-center gap-3 pl-7">
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
              {fejl.frontHex ? (
                <p className="mt-2 pl-7 text-sm text-danger">{fejl.frontHex}</p>
              ) : null}
            </TilvalgRaekke>

            {/* ---------------------------------------------- egen accent */}
            {/* Samme tilvalg som i designeren for en kunde med konto — de to
                bestillingsveje skal give det samme skilt. */}
            <TilvalgRaekke
              id={accentId}
              checked={egenAccent}
              onChange={setEgenAccent}
              navn="Egen farve på stjerner og tekst"
              pris="uden beregning"
              gratis
              forklaring="Stjernerne, rammen om logofeltet og “Scan eller tap”. Det er den samme trykfil med en anden farvekode, så den koster ikke ekstra."
              proeve={STANDARD_ACCENT}
            >
              <div className="mt-3 flex flex-wrap items-center gap-3 pl-7">
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
            </TilvalgRaekke>
          </div>
        </FormSektion>

        {/* --------------------------------------------------- destination */}
        <FormSektion
          titel="Hvor QR-koden fører hen"
          icon={LinkIcon}
          /* Her stod før, at koden peger på en LoyalSum-adresse, og at
             destinationen derfor kunne skiftes senere. Det passede ikke med
             resten af systemet: `kraeverDestination()` spørger netop, fordi
             linket afgøres én gang for alle ved trykket. Nu står der det
             samme som i designeren — se DESTINATION_INTRO. */
          fodnote={`${DESTINATION_INTRO} QR-koden fører direkte til dit link, uden om LoyalSum — så skiltet virker, uanset hvad der sker med os.`}
        >
          <div className="space-y-3">
            <select
              name="destinationType"
              aria-label="Hvor QR-koden fører hen"
              value={destination}
              onChange={(e) =>
                setDestination(e.target.value as typeof destination)
              }
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
          </div>
        </FormSektion>

        {/* Det med småt stod før under knappen i den klæbende spalte, hvor
            det skubbede "Gå til betaling" ud over skærmkanten. Her kan det
            læses uden at koste plads dér, hvor der skal trykkes. */}
        <p className="text-xs leading-relaxed text-muted">
          Levering i Danmark. Du får ingen konto og intet login — skiltet
          sendes til dig, og det er det. Vil du senere have statistik,
          feedback og stempelkort, kan du altid oprette en konto og opgradere.
        </p>
      </div>

      {/* =============================================== højre: resultatet */}
      {/*
        SKILTET, ANTALLET OG PRISEN HØRER SAMMEN — ét kort, ikke tre.
        Det er svaret på alt til venstre: sådan ser den ud, så mange får du,
        så meget koster det. `sticky` holder det på skærmen, mens man vælger.
      */}
      {/*
        HØJDEN ER LOFTET, OG DET ER IKKE PYNT. Kortet plus knappen er omkring
        750 px; på en bærbar med 800 px synligt ville "Gå til betaling" ligge
        under skærmkanten på en flade, der ikke kan rulles — `sticky` fastgør
        toppen, og alt under kanten bliver uopnåeligt, indtil venstre spalte er
        forbi. Med et loft og `overflow-y-auto` kan man altid nå knappen, og på
        en høj skærm ses der ingen rullebjælke overhovedet.

        `top-20` går fri af den faste sidehoved.
      */}
      <div className="mt-5 lg:sticky lg:top-20 lg:col-span-5 lg:mt-0 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-contain">
        <div className="box-shape overflow-hidden border border-border bg-card">
          {/* Skiltet står på råhvid og ikke på kortets hvide: en flade at
              hvile på gør det til et produktbillede frem for endnu et felt. */}
          <div className="bg-muted-bg px-5 py-5">
            <p className="etiket text-center text-muted">
              Sådan bliver den trykt
            </p>
            <div className="mt-3 flex justify-center">
              <SkiltPreview
                standerFarve={standerFarve}
                baggrund={front.egen ? front.hex : null}
                accent={visAccent}
                logoUrl={logoUrl}
                className="w-full max-w-[9.5rem]"
              />
            </div>
            {/* "Farve:" og ikke "Front:" — sætningen efter begynder med
                "Fronten er 12 cm bred", og to gange front i træk læste som
                en gentagelse. */}
            <p className="mt-3 text-center text-xs text-muted">
              Farve: {front.beskrivelse}
            </p>
            <p className="mt-1 text-center text-xs leading-relaxed text-muted">
              {FOD_FORKLARING}
            </p>
          </div>

          {/* ----------------------------------------------------- antal */}
          <div className="border-t border-border px-5 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Antal standere</p>
                <p className="text-xs text-muted">
                  Mængderabat fra {rabatter[0]?.minQty} stk.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
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

          {/* ------------------------------------------------------ pris */}
          {/* Den ENE tonede flade på siden. Farven bruges dér, hvor
              beslutningen tages, og ikke som dekoration. */}
          <div className="border-t border-border bg-accent/8 px-5 py-3">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt>
                  {qty} × stander
                  {pris.discountPct > 0 ? (
                    <span className="text-accent"> (−{pris.discountPct} %)</span>
                  ) : null}
                </dt>
                <dd className="tabular-nums">
                  {formatCurrency(pris.standTotal)}
                </dd>
              </div>
              {pris.frontfarve > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt>{FRONT_TEKSTER.tilvalg}</dt>
                  <dd className="tabular-nums">
                    {formatCurrency(pris.frontfarve)}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2">
                <dt className="font-medium">I alt</dt>
                <dd className="text-xl font-bold tracking-tight tabular-nums">
                  {formatCurrency(pris.oneTimeTotal)}{" "}
                  <span className="text-xs font-normal text-muted">
                    ex. moms
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* ----------------------------------------------------- betaling */}
        <div className="mt-4">
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
        </div>
      </div>
    </form>
  );
}

