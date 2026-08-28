"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { laesBetalingssvar } from "@/lib/betalingssvar";
import {
  DestinationFelt,
  DESTINATION_INTRO,
  destinationKlar,
} from "@/components/destination-felt";
import { FormSektion, TilvalgRaekke } from "@/components/ui/form-sektion";
import { StandIcon, LinkIcon } from "@/components/nav-icons";
import type { DestinationType } from "@/lib/types/database";

import { Input } from "@/components/ui/input";
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
  EGEN_FRONTFARVE_PRIS,
  FRONT_TEKSTER,
  STANDARD_STANDERFARVE,
  STANDER_FARVER,
  frontFarve,
  normaliserHex,
  type StanderFarve,
  STANDARD_ACCENT,
} from "@/lib/stander-tilvalg";
import {
  LOGO_TEKSTER,
  laesPngHoved,
  validerLogo,
  type PngHoved,
} from "@/lib/logo";
import { LogoFelt } from "@/components/logo-felt";
import { formatCurrency } from "@/lib/utils";

/**
 * Uploader logoet og giver den offentlige adresse tilbage.
 *
 * Ligger UDEN FOR komponenten, fordi den bruger et tilfældigt navn og skriver
 * til lageret. React Compiler afviser urene kald i en komponentkrop — med
 * rette: den krop kan køre igen ved enhver gentegning.
 *
 * Filnavnet er tilfældigt og genbruges aldrig. Havde det fulgt kundens eget
 * filnavn, ville en ny upload af "logo.png" overskrive originalen fra et
 * tidligere design — og så ville et gammelt skilt ikke kunne trykkes igen.
 */
async function uploadLogo(companyId: string, fil: File): Promise<string> {
  const supabase = createClient();
  const ext = fil.name.split(".").pop()?.toLowerCase() || "png";
  const sti = `${companyId}/design-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("logos")
    .upload(sti, fil, { upsert: false });
  if (error) throw new Error("Logoet kunne ikke uploades. Prøv igen.");

  return supabase.storage.from("logos").getPublicUrl(sti).data.publicUrl;
}

/** Sender browseren til Stripe. Udenfor af samme grund som uploaden. */
function gaaTil(url: string): void {
  window.location.href = url;
}

/**
 * Bestillingen af et fysisk skilt: antal, farve, logo, front og betaling.
 *
 * ALT LIGGER I ÉN KOMPONENT, fordi der kun må findes ÉN pris. Var antallet og
 * tilvalgene i hver sin boks, kunne de to vise hver sit beløb, og kunden ville
 * opdage forskellen på fakturaen.
 *
 * FRONTEN FØLGER STANDEREN AF SIG SELV. Kunden tager kun stilling, hvis de
 * aktivt slår "egen farve" til — og prisen kommer og går med den kontakt.
 * `frontFarve()` afgør resultatet både her og på serveren, så visningen og
 * fakturaen ikke kan komme til at være uenige.
 *
 * LOGOET UPLOADES FØRST VED BETALING. Previewet er en lokal adresse i
 * browseren, så en formular, kunden forlader, ikke efterlader filer i lageret.
 */
export function StanderDesigner({
  product,
  companyId,
  initialQty = 1,
  kraeverDpa = true,
  standId,
  kraeverDestination = false,
  destinationStart,
}: {
  product: Product;
  companyId: string;
  initialQty?: number;
  kraeverDpa?: boolean;
  /**
   * Standeren, skiltet skal trykkes med (0022).
   *
   * Følger med fra `/dashboard/standere/<id>` gennem `/bestil?stand=<id>`.
   * Uden den ved produktionen ikke, hvilken QR-adresse der skal på skiltet,
   * når butikken har mere end en stander.
   */
  standId?: string;
  /**
   * Skal kunden oplyse, hvad skiltet peger på?
   *
   * Afgøres af `kraeverDestination()` i commerce.ts — samme funktion, som
   * ruten spørger. Vises feltet uden at være krævet (eller omvendt), er
   * det en fejl, kunden opdager først ved betalingen.
   */
  kraeverDestination?: boolean;
  /** Forudfyldes fra standeren, hvis den allerede har en destination. */
  destinationStart?: { type: DestinationType; url: string };
}) {
  const clamp = (n: number) =>
    Math.max(1, Math.min(MAX_QTY, Math.floor(n) || 1));

  const [qty, setQty] = useState(clamp(initialQty));
  const [standerFarve, setStanderFarve] = useState<StanderFarve>(
    STANDARD_STANDERFARVE,
  );
  const [egenFront, setEgenFront] = useState(false);
  const [hex, setHex] = useState("#26616e");
  /*
   * Accentfarven: stjernerne, ringen og "Scan eller tap".
   *
   * GRATIS, i modsætning til frontfarven. Det er ikke en venlighed, men en
   * konsekvens: accenten er den samme trykfil med en anden farvekode, mens
   * baggrunden er et selvstændigt tryk. Prisen skal følge, hvad der faktisk
   * koster os noget.
   *
   * Starter på LoyalSums egen — den, designet er tegnet med.
   */
  const [egenAccent, setEgenAccent] = useState(false);
  const [accent, setAccent] = useState(STANDARD_ACCENT);
  const [fil, setFil] = useState<File | null>(null);
  const [hoved, setHoved] = useState<PngHoved | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFejl, setLogoFejl] = useState<string | null>(null);
  const [advarsler, setAdvarsler] = useState<string[]>([]);
  const [accepteret, setAccepteret] = useState(false);
  const [destType, setDestType] = useState<DestinationType>(
    destinationStart?.type ?? "google",
  );
  const [destUrl, setDestUrl] = useState(destinationStart?.url ?? "");
  const [proevet, setProevet] = useState(false);
  const [pending, setPending] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);

  const vilkaarId = useId();
  const frontId = useId();
  const accentId = useId();

  // Den valgte hex tæller kun, når tilvalget er slået til. Slår kunden det fra,
  // forsvinder både farven og prisen med det samme — feltet bliver stående, så
  // de kan fortryde uden at skulle finde farven igen.
  const front = frontFarve(standerFarve, egenFront ? hex : null);

  /*
   * Den accent, der FAKTISK trykkes — og null, når det er vores egen.
   *
   * `null` og ikke "#4ea4ad": så kan et gammelt design ikke komme til at se
   * ud som om, kunden aktivt har valgt vores farve. Falder hexkoden ud som
   * ugyldig, bruges vores igen frem for at trykke noget tilfældigt.
   */
  const brugtAccent =
    egenAccent && normaliserHex(accent) ? normaliserHex(accent) : null;
  const visAccent = brugtAccent ?? STANDARD_ACCENT;

  const pris = priceFor(product, qty, { egenFrontfarve: front.egen });
  const rabatter = VOLUME_DISCOUNTS.filter((v) => v.discountPct > 0);

  /*
   * REFERENCEN ER DET ENESTE, DER KAN TØMME ET FILFELT. Værdien er
   * skrivebeskyttet af sikkerhedsgrunde og kan kun nulstilles på elementet
   * selv — uden den sad kunden fast med det første logo, de valgte.
   */
  const logoInput = useRef<HTMLInputElement>(null);

  /** Fortryd et valgt logo. Filen skal også væk, ellers uploades den ved betalingen. */
  function fjernLogo() {
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    setFil(null);
    setHoved(null);
    setLogoUrl(null);
    setLogoFejl(null);
    setAdvarsler([]);
    if (logoInput.current) logoInput.current.value = "";
  }

  async function vaelgFil(e: React.ChangeEvent<HTMLInputElement>) {
    const valgt = e.target.files?.[0] ?? null;
    setLogoFejl(null);
    setAdvarsler([]);

    if (logoUrl) URL.revokeObjectURL(logoUrl);

    if (!valgt) {
      setFil(null);
      setHoved(null);
      setLogoUrl(null);
      return;
    }

    // Målene læses ud af PNG'ens egne bytes. Ingen upload, intet bibliotek,
    // intet serverkald — checkout bliver ikke tungere af kontrollen.
    const png =
      valgt.type === "image/png"
        ? laesPngHoved(await valgt.arrayBuffer())
        : null;
    const kontrol = validerLogo(
      { navn: valgt.name, type: valgt.type, storrelse: valgt.size },
      png,
    );

    if (!kontrol.ok) {
      setFil(null);
      setHoved(null);
      setLogoUrl(null);
      setLogoFejl(kontrol.fejl ?? "Filen kan ikke bruges.");
      e.target.value = "";
      return;
    }

    setFil(valgt);
    setHoved(png);
    setAdvarsler(kontrol.advarsler);
    setLogoUrl(URL.createObjectURL(valgt));
  }

  async function betal() {
    setPending(true);
    setFejl(null);
    try {
      const uploadet = fil ? await uploadLogo(companyId, fil) : null;

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produkt: product.slug,
          antal: qty,
          accepterVilkaar: accepteret,
          ...(standId ? { stand: standId } : {}),
          ...(kraeverDestination
            ? { destination_type: destType, destination_url: destUrl.trim() }
            : {}),
          design: {
            stander_farve: standerFarve,
            front_type: front.egen ? "egen" : "matcher",
            front_hex: front.egen ? front.hex : null,
            accent_hex: brugtAccent,
            logo_url: uploadet,
            logo_filnavn: fil?.name ?? null,
            logo_mime: fil?.type ?? null,
            logo_bytes: fil?.size ?? null,
            logo_bredde: hoved?.bredde ?? null,
            logo_hoejde: hoved?.hoejde ?? null,
            logo_transparent: hoved?.harAlfa ?? null,
          },
        }),
      });

      const svar = await laesBetalingssvar(res);
      if (!svar.url) {
        setFejl(svar.fejl!);
        setPending(false);
        return;
      }
      gaaTil(svar.url);
    } catch (err) {
      setFejl((err as Error).message || "Der opstod en fejl. Prøv igen.");
      setPending(false);
    }
  }

  return (
    /*
     * SAMME OPSTILLING SOM BESTILLINGEN UDEN KONTO — valgene til venstre,
     * resultatet til højre og klæbende. De to veje ind i en bestilling skal
     * ikke bare give det samme skilt; de skal også ligne hinanden, ellers
     * ser en kunde, der opgraderer, en anden side end den, de kender.
     *
     * `items-start`: uden den strækkes spalterne til samme højde, og så har
     * den klæbende kolonne ingen plads at klæbe i.
     */
    <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
      {/* ================================================ venstre: valgene */}
      <div className="space-y-5 lg:col-span-7">
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
                      name="standerfarve"
                      value={f.vaerdi}
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
            <LogoFelt
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
            </TilvalgRaekke>

            {/* ---------------------------------------------- egen accent */}
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

        {/* -------------------------------------------------- destination */}
        {/* Feltet lå før INDE i betalingsblokken, lige over knappen. Det er
            et valg om skiltet på linje med farve og logo — ikke en detalje
            ved betalingen — så det står nu blandt de andre valg. */}
        {kraeverDestination ? (
          <FormSektion
            titel="Hvor QR-koden fører hen"
            beskrivelse={DESTINATION_INTRO}
            icon={LinkIcon}
          >
            <DestinationFelt
              bar
              type={destType}
              url={destUrl}
              onType={setDestType}
              onUrl={setDestUrl}
              visFejl={proevet}
            />
          </FormSektion>
        ) : null}

        {/* Det med småt stod før under knappen i den klæbende spalte, hvor
            det skubbede "Gå til betaling" ud over skærmkanten. Her kan det
            læses uden at koste plads dér, hvor der skal trykkes. */}
        <p className="text-xs leading-relaxed text-muted">
          Tillægget på {EGEN_FRONTFARVE_PRIS} kr. betales kun første gang et
          design med egen farve bestilles. Genbestiller du samme design, koster
          farven ikke noget.
        </p>
      </div>

      {/* =============================================== højre: resultatet */}
      {/*
        HØJDEN ER LOFTET: kortet plus knappen er omkring 750 px, og på en
        bærbar ville "Gå til betaling" ligge under skærmkanten på en flade,
        `sticky` har fastgjort og som derfor ikke kan rulles.
      */}
      <div className="mt-5 lg:sticky lg:top-20 lg:col-span-5 lg:mt-0 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-contain">
        <div className="box-shape overflow-hidden border border-border bg-card">
          {/*
            SKILTET SOM DET BLIVER TRYKT — ikke en antydning.
            Det var før et farvet felt med logoet i, som ikke lignede
            resultatet. Nu tegnes det af den SAMME funktion, der laver
            trykfilen (se /api/skilt og src/lib/skilt.ts), så kunden ikke kan
            godkende ét skilt og få et andet.

            Der maskeres ikke: har logoet en hvid baggrund eller er det mørkt
            på en sort stander, ses det her. Det er hele pointen — kunden
            finder sin egen fejl, mens den stadig kan rettes.
          */}
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
              Farve: {front.beskrivelse} · Stander:{" "}
              {STANDER_FARVER.find(
                (f) => f.vaerdi === standerFarve,
              )!.navn.toLowerCase()}
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
          </div>

          {/* ------------------------------------------------------ pris */}
          {/* Den ENE tonede flade — farven bruges dér, hvor beslutningen
              tages, og ikke som dekoration. */}
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
                <dt className="font-medium">I alt nu</dt>
                <dd className="text-xl font-bold tracking-tight tabular-nums">
                  {formatCurrency(pris.oneTimeTotal)}{" "}
                  <span className="text-xs font-normal text-muted">
                    ex. moms
                  </span>
                </dd>
              </div>

              {pris.monthly > 0 ? (
                <div className="flex justify-between gap-4 text-muted">
                  <dt>Derefter</dt>
                  <dd className="tabular-nums">
                    {formatCurrency(pris.monthly)} pr. måned
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>

        {/* ----------------------------------------------------- betaling */}
        <div className="mt-4">
          <div className="mb-3 flex items-start gap-2.5">
            <input
              id={vilkaarId}
              type="checkbox"
              checked={accepteret}
              onChange={(e) => setAccepteret(e.target.checked)}
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
              (version {TERMS_VERSION})
              {kraeverDpa ? (
                <>
                  {" "}
                  og{" "}
                  <Link
                    href="/databehandleraftale"
                    className="font-medium text-accent hover:underline"
                  >
                    databehandleraftalen
                  </Link>
                </>
              ) : null}
              , og at jeg køber som virksomhed.
            </label>
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => {
              setProevet(true);
              if (kraeverDestination && !destinationKlar(destUrl)) return;
              void betal();
            }}
            disabled={
              pending || !accepteret || (egenFront && !normaliserHex(hex))
            }
          >
            {pending ? "Åbner betaling…" : "Gå til betaling"}
          </Button>

          {fejl ? <p className="mt-2 text-sm text-danger">{fejl}</p> : null}
        </div>
      </div>
    </div>
  );
}
