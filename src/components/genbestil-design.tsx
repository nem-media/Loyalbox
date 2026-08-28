"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { laesBetalingssvar } from "@/lib/betalingssvar";
import {
  DestinationFelt,
  destinationKlar,
} from "@/components/destination-felt";
import type { DestinationType } from "@/lib/types/database";
import {
  MAX_QTY,
  TERMS_VERSION,
  VOLUME_DISCOUNTS,
  priceFor,
  type Product,
} from "@/lib/constants";
import { FRONT_TEKSTER } from "@/lib/stander-tilvalg";
import { formatCurrency } from "@/lib/utils";

/** Sender browseren til Stripe. Uden for komponenten — se stander-designer.tsx. */
function gaaTil(url: string): void {
  window.location.href = url;
}

export interface GemtDesign {
  id: string;
  navn: string;
  stander_farve: "sort" | "hvid";
  front_hex: string;
  front_beskrivelse: string;
  logo_url: string | null;
  /** Er tillægget for frontfarven allerede betalt for dette design? */
  frontfarve_betalt: boolean;
  /** Har designet overhovedet en egen frontfarve? */
  egen_frontfarve: boolean;
}

/**
 * Genbestilling af et design, butikken allerede har.
 *
 * DEN VIGTIGE FORSKEL FRA DESIGNEREN: her vælges der ingenting om udseendet.
 * Kunden har truffet valgene, betalt for opsætningen, og skal bare have flere.
 * Eneste input er antallet.
 *
 * PRISEN VISES UDEN TILLÆGGET, når det er betalt — og det siges højt frem for
 * bare at lade tallet være lavt. En kunde, der husker at have betalt 139 for
 * farven, skal kunne se, at de ikke gør det igen.
 *
 * Serveren regner prisen selv ud fra designets `frontfarve_betalt`; det her er
 * kun visningen. Sendte klienten beløbet, kunne enhver sætte det til nul.
 */
export function GenbestilDesign({
  product,
  design,
  kraeverDpa = true,
  standId,
  kraeverDestination = false,
  destinationStart,
}: {
  product: Product;
  design: GemtDesign;
  kraeverDpa?: boolean;
  /**
   * Standeren, skiltet skal trykkes med (0022).
   *
   * Følger med fra `/dashboard/standere/<id>` gennem `/bestil?stand=<id>`.
   * Uden den ved produktionen ikke, hvilken QR-adresse der skal på skiltet,
   * når butikken har mere end en stander.
   */
  standId?: string;
  /** Se `kraeverDestination()` i commerce.ts — samme regel som ruten bruger. */
  kraeverDestination?: boolean;
  /** Forudfyldes fra standeren, hvis den allerede har en destination. */
  destinationStart?: { type: DestinationType; url: string };
}) {
  const clamp = (n: number) =>
    Math.max(1, Math.min(MAX_QTY, Math.floor(n) || 1));
  const [qty, setQty] = useState(1);
  const [accepteret, setAccepteret] = useState(false);
  const [destType, setDestType] = useState<DestinationType>(
    destinationStart?.type ?? "google",
  );
  const [destUrl, setDestUrl] = useState(destinationStart?.url ?? "");
  const [proevet, setProevet] = useState(false);
  const [pending, setPending] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const vilkaarId = useId();

  const betalerFarve = design.egen_frontfarve && !design.frontfarve_betalt;
  const pris = priceFor(product, qty, { egenFrontfarve: betalerFarve });
  const rabatter = VOLUME_DISCOUNTS.filter((v) => v.discountPct > 0);

  async function betal() {
    setPending(true);
    setFejl(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produkt: product.slug,
          antal: qty,
          accepterVilkaar: accepteret,
          design_id: design.id,
          ...(standId ? { stand: standId } : {}),
          ...(kraeverDestination
            ? { destination_type: destType, destination_url: destUrl.trim() }
            : {}),
        }),
      });
      const svar = await laesBetalingssvar(res);
      if (!svar.url) {
        setFejl(svar.fejl!);
        setPending(false);
        return;
      }
      gaaTil(svar.url);
    } catch {
      setFejl("Der opstod en fejl. Prøv igen.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------- hvad bestilles */}
      <div className="box-shape border border-border bg-card p-5">
        <p className="text-sm font-medium">Du bestiller flere af</p>
        <div className="mt-3 flex items-center gap-4">
          <div
            className="box-shape grid h-24 w-20 shrink-0 place-items-center overflow-hidden border border-border p-2"
            style={{ background: design.front_hex }}
          >
            {design.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={design.logo_url}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{design.navn}</p>
            <p className="mt-0.5 text-sm text-muted">
              Stander: {design.stander_farve} · Front:{" "}
              {design.front_beskrivelse}
            </p>
            <p className="mt-1 text-xs text-muted">
              Samme design som sidst — du vælger kun antallet.
            </p>
          </div>
        </div>
      </div>

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

          {/* Det betalte tillæg siges HØJT frem for bare at være væk. En kunde,
              der husker at have betalt for farven, skal kunne se hvorfor de
              ikke gør det igen. */}
          {design.egen_frontfarve && design.frontfarve_betalt ? (
            <div className="flex justify-between text-accent">
              <dt>{FRONT_TEKSTER.tilvalg}</dt>
              <dd>Betalt · 0 kr.</dd>
            </div>
          ) : null}

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
        <p className="mt-2 text-xs text-muted">Alle priser er ex moms.</p>
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
          disabled={pending || !accepteret}
        >
          {pending ? "Åbner betaling…" : "Gå til betaling"}
        </Button>

        {fejl ? <p className="mt-2 text-sm text-danger">{fejl}</p> : null}
      </div>
    </div>
  );
}
