"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_LABELS,
  POST_BACKGROUNDS,
  renderCaption,
  templatesFor,
  type PostCategory,
} from "@/lib/posts/templates";
import type { OpslagReview } from "./page";

const CATEGORIES: PostCategory[] = ["testimonial", "milestone", "generic"];

export function Composer({
  companyName,
  reviews,
  fiveStarCount,
}: {
  companyName: string;
  reviews: OpslagReview[];
  fiveStarCount: number;
}) {
  // Milepæl giver kun mening med mindst én 5-stjernet.
  const categories = CATEGORIES.filter((c) => c !== "milestone" || fiveStarCount > 0);
  const [category, setCategory] = useState<PostCategory>(
    reviews.length ? "testimonial" : "generic",
  );
  const [reviewId, setReviewId] = useState<string | null>(reviews[0]?.id ?? null);
  const templates = templatesFor(category);
  const [templateId, setTemplateId] = useState<number>(templates[0].id);
  const [bgId, setBgId] = useState<string>("navy");
  const [showStars, setShowStars] = useState(true);
  const [showLogo, setShowLogo] = useState(true);
  const [emojis, setEmojis] = useState(true);
  const [showName, setShowName] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedReview = reviews.find((r) => r.id === reviewId) ?? null;
  const template =
    templates.find((t) => t.id === templateId) ?? templates[0];

  const captionVars = {
    firmanavn: companyName,
    anmeldelse: category === "testimonial" ? selectedReview?.comment : null,
    antal: fiveStarCount,
  };

  // Kopi-tekst: behold emoji-stjerner (der er ingen SVG-række i ren tekst).
  const caption = renderCaption(template.text, captionVars, { emojis });

  const canName = category === "testimonial" && Boolean(selectedReview?.customerName);

  const imageParams = new URLSearchParams({
    template: String(template.id),
    bg: bgId,
    logo: showLogo ? "1" : "0",
    stars: showStars ? "1" : "0",
    emojis: emojis ? "1" : "0",
    name: showName && canName ? "1" : "0",
  });
  if (category === "testimonial" && selectedReview) imageParams.set("feedback", selectedReview.id);
  const imageUrl = `/dashboard/opslag/image?${imageParams.toString()}`;

  function pickCategory(c: PostCategory) {
    setCategory(c);
    setTemplateId(templatesFor(c)[0].id);
    if (c !== "testimonial") setShowName(false);
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const noTestimonials = category === "testimonial" && reviews.length === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(300px,380px)]">
      {/* Kontroller */}
      <div className="space-y-6">
        {/* Type */}
        <section>
          <h2 className="mb-2 text-sm font-semibold">Type</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => pickCategory(c)}
                className={`box-shape border px-3 py-2 text-sm transition-colors ${
                  category === c
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-card hover:bg-muted-bg"
                }`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </section>

        {/* Anmeldelse (kun testimonial) */}
        {category === "testimonial" ? (
          <section>
            <h2 className="mb-2 text-sm font-semibold">Vælg anmeldelse</h2>
            {noTestimonials ? (
              <p className="box-shape border border-border bg-muted-bg p-3 text-sm text-muted">
                Ingen 5-stjernede anmeldelser med tekst endnu. Prøv{" "}
                <button className="font-medium text-accent" onClick={() => pickCategory("milestone")}>
                  Milepæl
                </button>{" "}
                eller{" "}
                <button className="font-medium text-accent" onClick={() => pickCategory("generic")}>
                  Generisk tak
                </button>
                .
              </p>
            ) : (
              <div className="space-y-2">
                {reviews.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setReviewId(r.id)}
                    className={`box-shape block w-full border p-3 text-left text-sm transition-colors ${
                      reviewId === r.id ? "border-accent bg-accent/5" : "border-border bg-card hover:bg-muted-bg"
                    }`}
                  >
                    <span className="text-star">★★★★★</span>
                    <span className="mt-1 block">&ldquo;{r.comment}&rdquo;</span>
                    {r.customerName ? (
                      <span className="mt-1 block text-xs text-muted">— {r.customerName}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {/* Skabelon */}
        {!noTestimonials ? (
          <section>
            <h2 className="mb-2 text-sm font-semibold">Tekst</h2>
            <div className="space-y-2">
              {templates.map((t) => {
                const preview = renderCaption(t.text, captionVars, { emojis });
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className={`box-shape block w-full border p-3 text-left text-sm transition-colors ${
                      templateId === t.id ? "border-accent bg-accent/5" : "border-border bg-card hover:bg-muted-bg"
                    }`}
                  >
                    {preview}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Baggrund */}
        {!noTestimonials ? (
          <section>
            <h2 className="mb-2 text-sm font-semibold">Baggrund</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {POST_BACKGROUNDS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBgId(b.id)}
                  title={b.description}
                  className={`box-shape overflow-hidden border text-left transition-colors ${
                    bgId === b.id ? "border-accent ring-1 ring-accent" : "border-border"
                  }`}
                >
                  <span
                    className="block h-12 w-full"
                    style={{ background: b.bgImage ?? b.bgColor }}
                  />
                  <span className="block px-2 py-1.5 text-xs font-medium">{b.name}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* Toggles */}
        {!noTestimonials ? (
          <section>
            <h2 className="mb-2 text-sm font-semibold">Vis</h2>
            <div className="flex flex-wrap gap-4 text-sm">
              <Toggle label="Stjerner" checked={showStars} onChange={setShowStars} />
              <Toggle label="Logo" checked={showLogo} onChange={setShowLogo} />
              <Toggle label="Emojis" checked={emojis} onChange={setEmojis} />
              {canName ? (
                <Toggle label="Kundenavn" checked={showName} onChange={setShowName} />
              ) : null}
            </div>
            {canName && showName ? (
              <p className="mt-2 text-xs text-muted">
                Del kun kundens navn, hvis du har fået lov. I er selv ansvarlige for det, I udgiver.
              </p>
            ) : null}
          </section>
        ) : null}
      </div>

      {/* Preview + handlinger */}
      {!noTestimonials ? (
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="box-shape overflow-hidden border border-border bg-muted-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={imageUrl}
              src={imageUrl}
              alt="Forhåndsvisning af opslag"
              width={1080}
              height={1080}
              className="block aspect-square w-full"
            />
          </div>

          <div className="mt-3 flex gap-2">
            <a
              href={imageUrl}
              download="opslag.png"
              className="btn-shape inline-flex h-11 flex-1 items-center justify-center gap-2 bg-accent px-5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
            >
              Download billede
            </a>
            <Button variant="outline" onClick={copyText} className="flex-1">
              {copied ? "Kopieret!" : "Kopiér tekst"}
            </Button>
          </div>

          <div className="mt-3 box-shape border border-border bg-card p-3 text-sm">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Tekst til opslaget</p>
            <p className="whitespace-pre-wrap">{caption}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--accent)]"
      />
      <span>{label}</span>
    </label>
  );
}
