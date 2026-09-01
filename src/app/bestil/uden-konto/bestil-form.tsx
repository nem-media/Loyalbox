"use client";

import Link from "next/link";
import { useActionState, useId, useRef, useState } from "react";
import { bestilUdenKonto, type BestillingResultat } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { SkiltPreview } from "@/components/skilt-preview";
import { FormSektion, TilvalgRaekke } from "@/components/ui/form-sektion";
import { StoreIcon, StandIcon, LinkIcon } from "@/components/nav-icons";
import { FRONT_MAAL } from "@/lib/skilt-format";
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
  ACCENT_TEKSTER,
  farveTillaegTekst,
  farveTillaegNote,
  frontFarve,
  normaliserHex,
  type StanderFarve,
  STANDARD_ACCENT,
} from "@/lib/stander-tilvalg";
import { LOGO_TEKSTER, laesPngHoved, validerLogo } from "@/lib/logo";
import { LogoFelt } from "@/components/logo-felt";
import { DESTINATIONER } from "@/lib/bestilling-uden-konto";
import { DESTINATION_INTRO } from "@/components/destination-felt";
import { formatCurrency } from "@/lib/utils";

/** Sender browseren til Stripe. Uden for komponenten — se stander-designer.tsx. */
function gaaTil(url: string): void {
  window.location.href = url;
}

/**
 * Ruller hen til det første felt, serveren afviste.
 *
 * KNAPPEN OG FELTERNE ER IKKE SAMME STED. Bestillingen er to spalter: man
 * trykker "Gå til betaling" i højre spalte, mens felterne står til venstre og
 * for længst er rullet op forbi skærmkanten. Afvises noget, tegnes fejlen et
 * sted, man ikke kigger — og siden ser ud til bare at stå stille.
 *
 * Browserens egen validering gør det samme af sig selv; det her er den
 * tilsvarende hjælp for de kontroller, kun serveren kan lave (er CVR'et
 * knyttet til en konto, holder linket).
 */
function visFoersteFejl(fejl: Record<string, string | undefined>): void {
  const navn = Object.keys(fejl).find((k) => fejl[k]);
  if (!navn) return;
  const felt = document.querySelector<HTMLElement>(`[name="${navn}"]`);
  felt?.scrollIntoView({ block: "center", behavior: "smooth" });
  felt?.focus({ preventScroll: true });
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
      else if (svar.fejl) visFoersteFejl(svar.fejl);
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

  /*
   * REFERENCEN ER DET ENESTE, DER KAN TØMME ET FILFELT.
   *
   * Et <input type="file"> kan ikke sættes til "ingen fil" gennem React —
   * værdien er skrivebeskyttet af sikkerhedsgrunde og kan kun nulstilles på
   * elementet selv. Uden den sad kunden fast med det første logo, de kom til
   * at vælge, og serveren ville få filen med i formulardataene alligevel.
   */
  const logoInput = useRef<HTMLInputElement>(null);

  const frontId = useId();
  const accentId = useId();
  const vilkaarId = useId();

  const front = frontFarve(standerFarve, egenFront ? hex : null);
  const brugtAccent =
    egenAccent && normaliserHex(accent) ? normaliserHex(accent) : null;
  const visAccent = brugtAccent ?? STANDARD_ACCENT;
  const pris = priceFor(product, qty, {
    egenFrontfarve: front.egen,
    standerFarve,
  });
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

  /** Fortryd et valgt logo. Feltet tømmes, så filen heller ikke sendes med. */
  function fjernLogo() {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    setLogoUrl(null);
    setLogoFejl(null);
    setAdvarsler([]);
    if (logoInput.current) logoInput.current.value = "";
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
        >
          <div className="space-y-3">
            {/* To korte felter side om side frem for to fulde bredder under
                hinanden — hverken et firmanavn eller otte cifre fylder en
                linje. */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Firmanavn" fejl={fejl.firmanavn}>
                <Input name="firmanavn" required autoComplete="organization" />
              </Field>
              <Field label="CVR-nummer (valgfrit)" fejl={fejl.cvr}>
                <Input name="cvr" inputMode="numeric" placeholder="12345678" />
              </Field>
            </div>
            <Field
              label="E-mail"
              fejl={fejl.email}
              hint="Hertil sender vi kvittering og besked, når skiltet er afsendt."
            >
              <Input name="email" type="email" required autoComplete="email" />
            </Field>
          </div>
        </FormSektion>

        {/* ----------------------------------------------------- dit skilt */}
        <FormSektion
          titel="Dit skilt"
          beskrivelse="Farve, logo og de to farvevalg. Alt, du ændrer, ses med det samme i previewet."
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
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {f.navn}
                      </span>
                      {/* Prisen står ved selve valget og ikke kun i
                          opsummeringen: et tillæg, man først opdager i
                          totalen, føles som noget, der blev lagt oveni
                          bagefter. */}
                      <span className="block text-xs text-muted">
                        {farveTillaegTekst(f.vaerdi)}
                      </span>
                    </span>
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
            <LogoFelt
              name="logo"
              inputRef={logoInput}
              onChange={vaelgFil}
              onFjern={fjernLogo}
              valgt={Boolean(logoUrl)}
              fejl={logoFejl}
              advarsler={advarsler}
            />

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
              navn={ACCENT_TEKSTER.tilvalg}
              pris={ACCENT_TEKSTER.pris}
              gratis
              forklaring={ACCENT_TEKSTER.forklaring}
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
          /* Ordlyden ligger i DESTINATION_INTRO, så bestillingen uden konto,
             designeren og genbestillingen siger det samme. Her stod før, at
             koden peger på en LoyalSum-adresse, og at destinationen derfor
             kunne skiftes senere — det passede ikke med resten af systemet. */
          fodnote={DESTINATION_INTRO}
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
              fejl={fejl.destinationUrl}
              hint={valgtDestination.hjaelp}
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
                className="w-full max-w-[12rem]"
              />
            </div>
            {/* "Farve:" og ikke "Front:" — sætningen efter begynder med
                "Fronten er 12 cm bred", og to gange front i træk læste som
                en gentagelse. */}
            <p className="mt-3 text-center text-xs text-muted">
              Farve: {front.beskrivelse}
            </p>
            <p className="mt-1 text-center text-xs leading-relaxed text-muted">
              {FRONT_MAAL}
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
                  {pris.farveTillaeg > 0 ? (
                    <span className="block text-xs text-muted">
                      {farveTillaegNote(formatCurrency(pris.farveTillaeg))}
                    </span>
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
                    ex moms
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
          {/* EN AFVISNING MÅ ALDRIG VÆRE TAVS DÉR, MAN TRYKKER. Fejlene står
              ved deres felter i venstre spalte, som man ikke kan se herfra —
              så uden denne linje ser et klik ud til ikke at gøre noget. */}
          {fejl.accepterVilkaar ? (
            <p role="alert" className="mb-2 text-sm text-danger">
              {fejl.accepterVilkaar}
            </p>
          ) : Object.values(fejl).some(Boolean) ? (
            <p role="alert" className="mb-2 text-sm text-danger">
              Der er noget galt i felterne ovenfor — de er markeret med rødt.
            </p>
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

