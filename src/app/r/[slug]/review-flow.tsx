"use client";

import { useState, useTransition } from "react";
import { submitFeedback } from "./actions";
import { StarIcon } from "@/components/ui/stars";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

interface Props {
  standId: string;
  companyId: string;
  publicUrl: string | null;
  publicLabel: string;
}

export function ReviewFlow({
  standId,
  companyId,
  publicUrl,
  publicLabel,
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

  function choose(n: number) {
    setRating(n);
    setStep("actions");
  }

  function goPublic() {
    setError(null);
    startTransition(async () => {
      // Record the click (non-blocking to the redirect if it fails).
      await submitFeedback({
        standId,
        companyId,
        rating,
        comment,
        customerName: name,
        customerEmail: email,
        publicReviewClicked: true,
      });
      if (publicUrl) {
        window.location.href = publicUrl;
      } else {
        setStep("done");
      }
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stars */}
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
              <StarIcon
                filled={n <= (hover || rating)}
                className="h-9 w-9"
              />
            </button>
          ))}
        </div>
      </div>

      {step !== "rating" && (
        <>
          {/* Comment (optional, shared) */}
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              isHappy
                ? "Vil du fortælle hvad der gjorde din oplevelse god? (valgfrit)"
                : "Fortæl os hvad vi kan gøre bedre…"
            }
          />

          {/* Private contact fields shown when sending private feedback */}
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

          {/* Actions */}
          <div className="space-y-2">
            {isHappy ? (
              <>
                {publicUrl ? (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={goPublic}
                    disabled={pending}
                  >
                    {publicLabel}
                  </Button>
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
                {publicUrl ? (
                  <Button
                    className="w-full"
                    variant="ghost"
                    onClick={goPublic}
                    disabled={pending}
                  >
                    Skriv offentlig anmeldelse
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
