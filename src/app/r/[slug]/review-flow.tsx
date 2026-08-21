"use client";

import { useState, useTransition } from "react";
import { submitFeedback } from "./actions";
import { StarIcon } from "@/components/ui/stars";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
  reviewChoices,
  commentPrompt,
  CHOICE_HEADING,
  type PublicLink,
} from "@/lib/review-flow";

export type { PublicLink };

export interface ExtraLink {
  url: string;
  label: string;
}

interface Props {
  standId: string;
  companyId: string;
  /** Kun de anmeldelses-platforme forretningen har valgt (udfyldt link til). */
  publicLinks: PublicLink[];
  /** Valgfrit ekstra link (menukort, booking m.m.) — ikke en anmeldelse. */
  extra?: ExtraLink | null;
}

/**
 * Anmeldelsesflowet.
 *
 * Det egne link vises KUN på kvitteringsskærmen til sidst. Som valg hører
 * det hjemme på landingssiden ved siden af de andre — se stand-landing.tsx.
 * Her er det en venlig udgang, ikke et valg der konkurrerer med at sende
 * feedback.
 *
 * VALGENE ER ENS FOR ALLE BEDØMMELSER. Det er ikke en designpræference, men et
 * krav — se kommentaren øverst i src/lib/review-flow.ts. Kun ordlyden i
 * kommentarfeltet følger stjernerne, og den nævner aldrig en platform.
 *
 * Derfor må denne fil ALDRIG få en `isHappy`-variabel tilbage. Har du brug for
 * at vide, om kunden var tilfreds, så spørg dig selv hvorfor: bruges det til at
 * ændre hvilke knapper der vises, er det review gating.
 */
export function ReviewFlow({
  standId,
  companyId,
  publicLinks,
  extra,
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

  const choices = reviewChoices(publicLinks);

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
        {extra ? (
          <a href={extra.url} className="mt-4 inline-block text-sm font-medium text-accent">
            {extra.label} →
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
          {/* Kommentar (valgfri, følger med begge veje) */}
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={commentPrompt(rating)}
          />

          {error ? (
            <p className="text-center text-sm text-danger">{error}</p>
          ) : null}

          {step === "private" ? (
            <>
              {/* Kontaktfelter — kun relevante, når feedbacken går til butikken,
                  og begge frivillige. */}
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
              <div className="space-y-2">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={sendPrivate}
                  disabled={pending}
                >
                  {pending ? "Sender…" : "Send feedback"}
                </Button>
                <Button
                  className="w-full"
                  variant="ghost"
                  onClick={() => setStep("actions")}
                  disabled={pending}
                >
                  Tilbage
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-sm font-medium">{CHOICE_HEADING}</p>
              {/* Samme størrelse og samme variant på hvert valg. Ændrer du det
                  for ét af dem, sorterer siden igen. */}
              {choices.map((choice) => (
                <Button
                  key={choice.key}
                  className="w-full"
                  size="lg"
                  onClick={() =>
                    choice.url ? goPublicTo(choice.url) : setStep("private")
                  }
                  disabled={pending}
                >
                  {choice.label}
                </Button>
              ))}
            </div>
          )}

        </>
      )}
    </div>
  );
}
