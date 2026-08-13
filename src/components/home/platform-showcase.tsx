"use client";

import { useState } from "react";
import Link from "next/link";
import { Stars } from "@/components/ui/stars";
import { StampCardPreview } from "@/components/loyalty/stamp-card-preview";

type TabKey = "anmeldelser" | "feedback" | "loyalitet" | "synlighed" | "indsigt";

const TABS: { key: TabKey; label: string; headline: string; body: string }[] = [
  {
    key: "anmeldelser",
    label: "Anmeldelser",
    headline: "Få flere kunder til at dele deres oplevelse",
    body: "Gør det let for kunderne at finde derhen, hvor du gerne vil anmeldes. Flere gode anmeldelser gør, at nye kunder vælger dig frem for naboen.",
  },
  {
    key: "feedback",
    label: "Feedback",
    headline: "Fang problemer, før du mister kunden",
    body: "Utilfredse kunder kan sende deres oplevelse direkte til dig. Du kan svare, følge op og rette op — mens kunden stadig er din.",
  },
  {
    key: "loyalitet",
    label: "Loyalitet",
    headline: "Giv kunderne en grund til at komme igen",
    body: "Digitale stempelkort og belønninger gør førstegangsbesøg til stamkunder. Kunden tilmelder sig selv, og personalet stempler med ét scan.",
  },
  {
    key: "synlighed",
    label: "Synlighed",
    headline: "Bliv ved med at være synlig",
    body: "Lav færdige opslag ud af det, der allerede sker i din forretning. Mere aktivitet betyder, at flere nye kunder opdager dig.",
  },
  {
    key: "indsigt",
    label: "Indsigt",
    headline: "Se hvad der faktisk virker",
    body: "Anmeldelser, feedback, medlemmer, stempler og genbesøg samlet ét sted — så du kan gøre mere af det, der virker.",
  },
];

/* ---------------------------------------------------------------- mockups */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="box-shape border border-border bg-card p-5 shadow-[0_24px_48px_-32px_rgba(0,0,0,0.45)]">
      {children}
    </div>
  );
}

function ReviewsMock() {
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight">Anmeldelser</p>
        <Stars value={5} size={14} />
      </div>
      <ul className="mt-4 space-y-2">
        {["Google", "Trustpilot", "Facebook"].map((p) => (
          <li
            key={p}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
          >
            <span className="text-sm">{p}</span>
            <span className="text-xs font-medium text-accent">Aktiv</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-lg bg-muted-bg px-3 py-2.5">
        <p className="text-xs text-muted">Eget link</p>
        <p className="text-sm font-medium">Menukort</p>
      </div>
    </Panel>
  );
}

function FeedbackMock() {
  return (
    <Panel>
      <p className="text-sm font-semibold tracking-tight">Privat feedback</p>
      <div className="mt-4 rounded-lg border border-border p-3">
        <div className="flex items-center gap-2">
          <Stars value={2} size={13} />
          <span className="text-xs text-muted">i går</span>
        </div>
        <p className="mt-2 text-sm text-foreground/85">
          &ldquo;Der var lang ventetid, da jeg kom forbi i frokostpausen.&rdquo;
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            Besvaret
          </span>
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            Bonusstempel sendt
          </span>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        Kritikken lander hos dig — ikke offentligt — så du kan nå at rette op.
      </p>
    </Panel>
  );
}

function LoyaltyMock() {
  return (
    <StampCardPreview
      name="Kaffeklub"
      companyName="Café Aurora"
      requiredStamps={10}
      filled={7}
      rewardName="Gratis kaffe"
      cardText="Saml 10 stempler — få en gratis kop."
    />
  );
}

function SocialMock() {
  return (
    <Panel>
      <p className="text-sm font-semibold tracking-tight">Færdigt opslag</p>
      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        <div className="bg-dark p-5 text-white">
          <Stars value={5} size={15} />
          <p className="mt-3 text-sm font-medium leading-snug">
            &ldquo;Byens bedste flat white — og de husker altid min bestilling.&rdquo;
          </p>
          <p className="mt-3 text-xs text-white/60">Café Aurora</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <span className="rounded-full bg-muted-bg px-2.5 py-1 text-xs font-medium">
          Facebook
        </span>
        <span className="rounded-full bg-muted-bg px-2.5 py-1 text-xs font-medium">
          Instagram
        </span>
      </div>
    </Panel>
  );
}

function InsightsMock() {
  const bars = [38, 52, 44, 66, 58, 74];
  return (
    <Panel>
      <p className="text-sm font-semibold tracking-tight">Overblik</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { k: "Anmeldelser", v: "48" },
          { k: "Medlemmer", v: "312" },
          { k: "Genbesøg", v: "196" },
        ].map((s) => (
          <div key={s.k} className="rounded-lg bg-muted-bg p-3">
            <p className="text-lg font-bold tracking-tight">{s.v}</p>
            <p className="text-[11px] text-muted">{s.k}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex h-24 items-end gap-2" aria-hidden="true">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-accent/80"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Aktivitet de seneste 6 måneder</p>
    </Panel>
  );
}

const MOCKS: Record<TabKey, React.ReactNode> = {
  anmeldelser: <ReviewsMock />,
  feedback: <FeedbackMock />,
  loyalitet: <LoyaltyMock />,
  synlighed: <SocialMock />,
  indsigt: <InsightsMock />,
};

/* ------------------------------------------------------------------- tabs */

export function PlatformShowcase() {
  const [active, setActive] = useState<TabKey>("anmeldelser");
  const activeTab = TABS.find((t) => t.key === active) ?? TABS[0];

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const i = TABS.findIndex((t) => t.key === active);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = e.key === "ArrowRight" ? i + 1 : i - 1;
      const wrapped = (next + TABS.length) % TABS.length;
      setActive(TABS[wrapped].key);
      document.getElementById(`tab-${TABS[wrapped].key}`)?.focus();
    }
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Områder i LoyalSum"
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-2"
      >
        {TABS.map((t) => {
          const selected = t.key === active;
          return (
            <button
              key={t.key}
              id={`tab-${t.key}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`panel-${t.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.key)}
              className={
                selected
                  ? "btn-shape bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  : "btn-shape border border-border bg-card px-4 py-2 text-sm font-medium text-foreground/75 transition-colors hover:bg-muted-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        id={`panel-${activeTab.key}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab.key}`}
        tabIndex={0}
        className="mt-8 grid items-center gap-10 focus-visible:outline-none md:grid-cols-2"
      >
        <div>
          <h3 className="text-2xl font-bold tracking-tight">{activeTab.headline}</h3>
          <p className="mt-3 text-muted">{activeTab.body}</p>

          {activeTab.key === "anmeldelser" ? (
            <p className="mt-5 text-sm text-foreground/80">
              Vil du gøre det endnu nemmere ved disken? Brug LoyalSums NFC/QR-stander.{" "}
              <Link
                href="/reviewstander"
                className="font-medium text-accent underline-offset-4 hover:underline"
              >
                Se Reviewstanderen →
              </Link>
            </p>
          ) : null}
        </div>

        <div className="mx-auto w-full max-w-sm">{MOCKS[activeTab.key]}</div>
      </div>

      <p className="mt-6 text-xs text-muted">
        Illustration af LoyalSum-panelet. Tal og indhold er eksempler.
      </p>
    </div>
  );
}
