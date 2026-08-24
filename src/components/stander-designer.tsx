"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { laesBetalingssvar } from "@/lib/betalingssvar";
import {
  DestinationFelt,
  destinationKlar,
} from "@/components/destination-felt";
import type { DestinationType } from "@/lib/types/database";

import { Input } from "@/components/ui/input";
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
} from "@/lib/stander-tilvalg";
import {
  LOGO_KRAV,
  LOGO_TEKSTER,
  laesPngHoved,
  validerLogo,
  type PngHoved,
} from "@/lib/logo";
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

  // Den valgte hex tæller kun, når tilvalget er slået til. Slår kunden det fra,
  // forsvinder både farven og prisen med det samme — feltet bliver stående, så
  // de kan fortryde uden at skulle finde farven igen.
  const front = frontFarve(standerFarve, egenFront ? hex : null);
  const pris = priceFor(product, qty, { egenFrontfarve: front.egen });
  const rabatter = VOLUME_DISCOUNTS.filter((v) => v.discountPct > 0);

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
    <div className="space-y-5">
      {/* ------------------------------------------------------------ antal */}
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
      </div>

      {/* ------------------------------------------------------ standerfarve */}
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
            </label>
          ))}
        </div>
      </fieldset>

      {/* --------------------------------------------------------- logo */}
      <div className="box-shape border border-border bg-card p-5">
        <p className="text-sm font-medium">{LOGO_TEKSTER.overskrift}</p>
        <p className="mt-1 text-xs text-muted">{LOGO_TEKSTER.hjaelp}</p>

        <input
          type="file"
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

      {/* ------------------------------------------------------ egen front */}
      <div className="box-shape border border-border bg-card p-5">
        <div className="flex items-start gap-2.5">
          <input
            id={frontId}
            type="checkbox"
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
              placeholder="#26616e"
              aria-label="Frontfarve som hex"
              className="max-w-32 font-mono"
            />
            {!normaliserHex(hex) ? (
              <span className="text-xs text-danger">Ugyldig farvekode</span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* --------------------------------------------------------- preview */}
      <div className="box-shape border border-border bg-card p-5">
        <p className="text-sm font-medium">Sådan bliver den trykt</p>
        <div className="mt-3 flex justify-center">
          <div
            className="box-shape grid h-44 w-36 place-items-center overflow-hidden border border-border p-4"
            style={{ background: front.hex }}
          >
            {logoUrl ? (
              // BEVIDST uden maskering: har logoet en hvid baggrund, skal den
              // ses her. Skjulte vi den, ville kunden først opdage det på det
              // trykte skilt.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Dit logo som det bliver trykt"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span
                className="text-center text-xs"
                style={{
                  color: standerFarve === "hvid" ? "#8a8a8a" : "#9a9a9a",
                }}
              >
                Dit logo
              </span>
            )}
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          Front: {front.beskrivelse} · Stander:{" "}
          {STANDER_FARVER.find(
            (f) => f.vaerdi === standerFarve,
          )!.navn.toLowerCase()}
        </p>
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
            <dt>I alt nu</dt>
            <dd className="tabular-nums">
              {formatCurrency(pris.oneTimeTotal)}
            </dd>
          </div>

          {pris.monthly > 0 ? (
            <div className="flex justify-between text-muted">
              <dt>Derefter</dt>
              <dd className="tabular-nums">
                {formatCurrency(pris.monthly)} pr. måned
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-2 text-xs text-muted">Alle priser er uden moms.</p>
      </div>

      {/* -------------------------------------------------------- betaling */}
      <div>
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

        {kraeverDestination ? (
          <div className="mb-4">
            <DestinationFelt
              type={destType}
              url={destUrl}
              onType={setDestType}
              onUrl={setDestUrl}
              visFejl={proevet}
            />
          </div>
        ) : null}

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

        <p className="mt-2 text-xs text-muted">
          Tillægget på {EGEN_FRONTFARVE_PRIS} kr. betales kun første gang et
          design med egen farve bestilles. Genbestiller du samme design, koster
          farven ikke noget.
        </p>
      </div>
    </div>
  );
}
