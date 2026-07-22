"use client";

import { useState, useTransition } from "react";
import { submitFeedback } from "./actions";
import { StarIcon } from "@/components/ui/stars";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

export interface PublicLink {
  type: string;
  url: string;
  platform: string;
}

interface Props {
  standId: string;
  companyId: string;
  /** Kun de anmeldelses-platforme forretningen har valgt (udfyldt link til). */
  publicLinks: PublicLink[];
  /** Valgfrit ekstra link (menukort, booking m.m.) — ikke en anmeldelse. */
  extraUrl?: string | null;
}

export function ReviewFlow({
  standId,
  companyId,
  publicLinks,
  extraUrl,
}: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [step, setStep] = useState<"rating" | "actions" | "private" | "done">(
    "rating",
  );
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isHappy = rating >= 4;
  const hasPublic = publicLinks.length > 0;

  function choose(n: number) {
    setRating(n);
    setStep("actions");
  }

  function goPublicTo(url: string) {
    setError(null);
    startTransition(async () => {
      // Registrér klikket (ikke-blokerende for redirect hvis det fejler).
      await submitFeedback({
        standId,
        companyId,
        rating,
        comment,
        customerName: name,
        customerEmail: email,
        publicReviewClicked: true,
      });
      window.location.href = url;
    });
  }

  function sendPrivate() {
    setError(null);
    startTransition(async () => {
      const res = await submitFeedback({
        standId,
        companyId,
        rating,
        comment,
        customerName: name,
        customerEmail: email,
        publicReviewClicked: false,
      });
      if (res.ok) setStep("done");
      else setError(res.error ?? "Noget gik galt. Prøv igen.");
    });
  }

  if (step === "done") {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-success/10 text-success">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold">Tak for din feedback!</h2>
        <p className="mt-2 text-sm text-muted">
          Vi sætter stor pris på, at du tog dig tiden.
        </p>
        {extraUrl ? (
          <a href={extraUrl} className="mt-4 inline-block text-sm font-medium text-accent">
            Se mere →
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stjerner */}
      <div>
        <p className="text-center text-sm font-medium">
          Hvordan var din oplevelse?
        </p>
        <div
          className="mt-3 flex justify-center gap-1"
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} stjerner`}
              onMouseEnter={() => setHover(n)}
              onClick={() => choose(n)}
              className="p-1 text-star transition-transform hover:scale-110"
            >
              <StarIcon filled={n <= (hover || rating)} className="h-9 w-9" />
            </button>
          ))}
        </div>
      </div>

      {step !== "rating" && (
        <>
          {/* Kommentar (valgfri, delt) */}
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              isHappy
                ? "Vil du fortælle hvad der gjorde din oplevelse god? (valgfrit)"
                : "Fortæl os hvad vi kan gøre bedre…"
            }
          />

          {/* Kontaktfelter ved privat feedback */}
          {(step === "private" || !isHappy) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dit navn (valgfrit)"
              />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Din e-mail (valgfrit)"
              />
            </div>
          )}

          {error ? (
            <p className="text-center text-sm text-danger">{error}</p>
          ) : null}

          {/* Handlinger */}
          <div className="space-y-2">
            {isHappy ? (
              <>
                {hasPublic && step !== "private" ? (
                  <>
                    {publicLinks.length > 1 ? (
                      <p className="text-center text-sm font-medium">
                        Vælg hvor du vil anmelde os
                      </p>
                    ) : null}
                    {publicLinks.map((link) => (
                      <Button
                        key={link.type}
                        className="w-full"
                        size="lg"
                        onClick={() => goPublicTo(link.url)}
                        disabled={pending}
                      >
                        Anmeld os på {link.platform}
                      </Button>
                    ))}
                  </>
                ) : null}
                {step === "private" ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={sendPrivate}
                    disabled={pending}
                  >
                    {pending ? "Sender…" : "Send privat feedback"}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant="ghost"
                    onClick={() => setStep("private")}
                    disabled={pending}
                  >
                    Send privat feedback i stedet
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={sendPrivate}
                  disabled={pending}
                >
                  {pending ? "Sender…" : "Send feedback til virksomheden"}
                </Button>
                {hasPublic ? (
                  <Button
                    className="w-full"
                    variant="ghost"
                    onClick={() => goPublicTo(publicLinks[0].url)}
                    disabled={pending}
                  >
                    Skriv offentlig anmeldelse
                  </Button>
                ) : null}
              </>
            )}
          </div>

          {/* Valgfrit ekstra link (menukort, booking m.m.) */}
          {extraUrl ? (
            <div className="text-center">
              <a href={extraUrl} className="text-sm font-medium text-accent">
                Se mere →
              </a>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
