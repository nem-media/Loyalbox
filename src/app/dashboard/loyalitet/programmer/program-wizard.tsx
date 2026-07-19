"use client";

import { useActionState, useState } from "react";
import { createProgram, type FormResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field, Label } from "@/components/ui/input";
import { StampCardPreview } from "@/components/loyalty/stamp-card-preview";
import {
  EARN_MODEL_LABELS,
  EARN_MODEL_HELP,
  REWARD_TYPE_LABELS,
  PROGRAM_TEMPLATES,
  type EarnModel,
  type RewardType,
} from "@/lib/loyalty/constants";

const STEPS = [
  "Grundlæggende",
  "Optjening",
  "Belønning",
  "Design",
  "Regler",
  "Gennemse",
];

const selectClass =
  "box-shape h-11 w-full border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function ProgramWizard({ companyName }: { companyName?: string | null }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    createProgram,
    {},
  );
  const [step, setStep] = useState(0);

  // Felt-state (styrer live forhåndsvisning; alle inputs er altid monteret)
  const [name, setName] = useState("");
  const [internalName, setInternalName] = useState("");
  const [description, setDescription] = useState("");
  const [earnModel, setEarnModel] = useState<EarnModel>("per_purchase");
  const [stampsPerEarn, setStampsPerEarn] = useState("1");
  const [amountPerStamp, setAmountPerStamp] = useState("");
  const [rewardType, setRewardType] = useState<RewardType>("free_product");
  const [rewardName, setRewardName] = useState("");
  const [requiredStamps, setRequiredStamps] = useState("10");
  const [rewardDescription, setRewardDescription] = useState("");
  const [rewardValue, setRewardValue] = useState("");
  const [color, setColor] = useState("#19375c");
  const [icon, setIcon] = useState("star");
  const [cardText, setCardText] = useState("");
  const [resetOnRedeem, setResetOnRedeem] = useState(true);
  const [keepOverflow, setKeepOverflow] = useState(false);
  const [maxPerTxn, setMaxPerTxn] = useState("1");
  const [maxPerDay, setMaxPerDay] = useState("");
  const [minMinutes, setMinMinutes] = useState("0");
  const [requireStaffConfirm, setRequireStaffConfirm] = useState(true);
  const [stampsExpire, setStampsExpire] = useState(false);
  const [stampExpiryDays, setStampExpiryDays] = useState("");
  const [publishNow, setPublishNow] = useState(false);

  function applyTemplate(key: string) {
    const t = PROGRAM_TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    setEarnModel(t.earnModel);
    setRequiredStamps(String(t.requiredStamps));
    setRewardName(t.rewardName);
    setRewardType(t.rewardType);
    setRewardValue(t.rewardValue ? String(t.rewardValue) : "");
    if (!name) setName(`${t.label} stempelkort`);
  }

  const required = Math.max(1, parseInt(requiredStamps || "1", 10) || 1);
  const canNext =
    (step !== 0 || name.trim().length > 0) &&
    (step !== 2 || rewardType === "none" || rewardName.trim().length > 0);
  const last = step === STEPS.length - 1;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <form action={action}>
        {/* Trin-indikator */}
        <ol className="mb-6 flex flex-wrap gap-2 text-xs">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={
                "box-shape px-2.5 py-1 " +
                (i === step
                  ? "bg-accent text-accent-fg"
                  : i < step
                    ? "bg-accent/10 text-accent"
                    : "bg-muted-bg text-muted")
              }
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>

        {/* Skjulte felter, der altid indgår i indsendelsen */}
        <input type="hidden" name="earn_model" value={earnModel} />
        <input type="hidden" name="reward_type" value={rewardType} />
        <input type="hidden" name="color" value={color} />
        <input type="hidden" name="icon" value={icon} />
        <input type="hidden" name="status" value={publishNow ? "active" : "draft"} />

        {/* Trin 1 — Grundlæggende */}
        <div hidden={step !== 0} className="space-y-5">
          <div className="box-shape border border-border bg-muted-bg/40 p-4">
            <p className="mb-2 text-sm font-medium">Start hurtigt med en skabelon</p>
            <div className="flex flex-wrap gap-2">
              {PROGRAM_TEMPLATES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => applyTemplate(t.key)}
                  className="box-shape border border-border bg-background px-3 py-1.5 text-sm hover:border-accent"
                  title={t.hint}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <Field label="Navn på stempelkort">
            <Input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Fx Kaffeklub" />
          </Field>
          <Field label="Kort beskrivelse" hint="Vises til kunden på kortet.">
            <Textarea name="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Internt navn" hint="Kun til dig — vises ikke for kunden.">
            <Input name="internal_name" value={internalName} onChange={(e) => setInternalName(e.target.value)} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Startdato (valgfri)">
              <Input type="date" name="start_date" />
            </Field>
            <Field label="Slutdato (valgfri)">
              <Input type="date" name="end_date" />
            </Field>
          </div>
        </div>

        {/* Trin 2 — Optjening */}
        <div hidden={step !== 1} className="space-y-5">
          <Field label="Hvordan optjener kunden stempler?">
            <select className={selectClass} value={earnModel} onChange={(e) => setEarnModel(e.target.value as EarnModel)}>
              {(Object.keys(EARN_MODEL_LABELS) as EarnModel[]).map((m) => (
                <option key={m} value={m}>{EARN_MODEL_LABELS[m]}</option>
              ))}
            </select>
          </Field>
          <p className="text-sm text-muted">{EARN_MODEL_HELP[earnModel]}</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Antal stempler pr. optjening">
              <Input type="number" min={1} name="stamps_per_earn" value={stampsPerEarn} onChange={(e) => setStampsPerEarn(e.target.value)} />
            </Field>
            {earnModel === "per_amount" ? (
              <Field label="Beløb pr. stempel (kr.)" hint="Fx 100 = 1 stempel pr. 100 kr.">
                <Input type="number" min={1} name="amount_per_stamp" value={amountPerStamp} onChange={(e) => setAmountPerStamp(e.target.value)} />
              </Field>
            ) : null}
          </div>
        </div>

        {/* Trin 3 — Belønning */}
        <div hidden={step !== 2} className="space-y-5">
          <Field label="Hvad får kunden?">
            <select className={selectClass} value={rewardType} onChange={(e) => setRewardType(e.target.value as RewardType)}>
              {(Object.keys(REWARD_TYPE_LABELS) as RewardType[]).map((r) => (
                <option key={r} value={r}>{REWARD_TYPE_LABELS[r]}</option>
              ))}
            </select>
          </Field>
          {rewardType !== "none" ? (
            <>
              <Field label="Efter hvor mange stempler skal kunden have en belønning?">
                <Input type="number" min={1} name="required_stamps" value={requiredStamps} onChange={(e) => setRequiredStamps(e.target.value)} />
              </Field>
              <Field label="Navn på belønning">
                <Input name="reward_name" value={rewardName} onChange={(e) => setRewardName(e.target.value)} placeholder="Fx Gratis kaffe" />
              </Field>
              {(rewardType === "amount_off" || rewardType === "percent_off") ? (
                <Field label={rewardType === "percent_off" ? "Rabat i procent" : "Rabat i kroner"}>
                  <Input type="number" min={0} name="reward_value" value={rewardValue} onChange={(e) => setRewardValue(e.target.value)} />
                </Field>
              ) : null}
              <Field label="Beskrivelse (valgfri)">
                <Textarea name="reward_description" value={rewardDescription} onChange={(e) => setRewardDescription(e.target.value)} />
              </Field>
              <div className="box-shape border border-border p-4">
                <p className="mb-2 text-sm font-medium">Når belønningen er indløst</p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="reset_on_redeem" checked={resetOnRedeem} onChange={(e) => setResetOnRedeem(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
                  Nulstil kortet
                </label>
                {resetOnRedeem ? (
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" name="keep_overflow" checked={keepOverflow} onChange={(e) => setKeepOverflow(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
                    Behold overskydende stempler (fx 11 → 1)
                  </label>
                ) : null}
              </div>
            </>
          ) : (
            <input type="hidden" name="required_stamps" value={requiredStamps} />
          )}
        </div>

        {/* Trin 4 — Design */}
        <div hidden={step !== 3} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Farve">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-full cursor-pointer rounded-md border border-border" />
            </Field>
            <Field label="Ikon">
              <select className={selectClass} value={icon} onChange={(e) => setIcon(e.target.value)}>
                <option value="star">Stjerne</option>
                <option value="heart">Hjerte</option>
                <option value="coffee">Kaffe</option>
                <option value="check">Flueben</option>
              </select>
            </Field>
          </div>
          <Field label="Tekst på kortet (valgfri)">
            <Input name="card_text" value={cardText} onChange={(e) => setCardText(e.target.value)} placeholder="Fx Tak for dit besøg!" />
          </Field>
        </div>

        {/* Trin 5 — Regler */}
        <div hidden={step !== 4} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Maks. stempler pr. transaktion">
              <Input type="number" min={1} name="max_stamps_per_txn" value={maxPerTxn} onChange={(e) => setMaxPerTxn(e.target.value)} />
            </Field>
            <Field label="Maks. stempler pr. dag (valgfri)">
              <Input type="number" min={1} name="max_stamps_per_day" value={maxPerDay} onChange={(e) => setMaxPerDay(e.target.value)} />
            </Field>
          </div>
          <Field label="Minimumstid mellem stempler (minutter)" hint="Beskytter mod misbrug. 0 = ingen grænse.">
            <Input type="number" min={0} name="min_minutes_between" value={minMinutes} onChange={(e) => setMinMinutes(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="require_staff_confirm" checked={requireStaffConfirm} onChange={(e) => setRequireStaffConfirm(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            Medarbejder skal bekræfte hvert stempel (anbefalet)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="stamps_expire" checked={stampsExpire} onChange={(e) => setStampsExpire(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            Stempler udløber
          </label>
          {stampsExpire ? (
            <Field label="Udløb efter (dage)">
              <Input type="number" min={1} name="stamp_expiry_days" value={stampExpiryDays} onChange={(e) => setStampExpiryDays(e.target.value)} />
            </Field>
          ) : null}
        </div>

        {/* Trin 6 — Gennemse */}
        <div hidden={step !== 5} className="space-y-4">
          <div className="box-shape border border-border p-5 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div><dt className="text-muted">Navn</dt><dd className="font-medium">{name || "—"}</dd></div>
              <div><dt className="text-muted">Optjening</dt><dd className="font-medium">{EARN_MODEL_LABELS[earnModel]}</dd></div>
              <div><dt className="text-muted">Belønning</dt><dd className="font-medium">{rewardType === "none" ? "Ingen" : `${rewardName || "—"} efter ${required} stempler`}</dd></div>
              <div><dt className="text-muted">Ved indløsning</dt><dd className="font-medium">{resetOnRedeem ? (keepOverflow ? "Behold overskydende" : "Nulstil til 0") : "Bevar saldo"}</dd></div>
              <div><dt className="text-muted">Maks/dag</dt><dd className="font-medium">{maxPerDay || "Ingen grænse"}</dd></div>
              <div><dt className="text-muted">Min. tid mellem</dt><dd className="font-medium">{minMinutes} min</dd></div>
            </dl>
          </div>
          <label className="box-shape flex items-start gap-2 border border-accent/30 bg-accent/5 p-4 text-sm">
            <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
            <span>Aktivér stempelkortet med det samme. Lad være markeret for at gemme som kladde.</span>
          </label>
        </div>

        {state.error ? (
          <p className="mt-4 text-sm text-danger">{state.error}</p>
        ) : null}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Tilbage
          </Button>
          {last ? (
            <Button type="submit" disabled={pending}>
              {pending ? "Opretter…" : publishNow ? "Opret og aktivér" : "Gem som kladde"}
            </Button>
          ) : (
            <Button type="button" onClick={() => canNext && setStep((s) => s + 1)} disabled={!canNext}>
              Næste
            </Button>
          )}
        </div>
      </form>

      {/* Live forhåndsvisning */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Label>Forhåndsvisning</Label>
        <StampCardPreview
          name={name}
          color={color}
          requiredStamps={required}
          filled={0}
          rewardName={rewardType === "none" ? null : rewardName}
          cardText={cardText}
          companyName={companyName}
        />
        <p className="mt-2 text-xs text-muted">Sådan ser kundens kort ud.</p>
      </div>
    </div>
  );
}
