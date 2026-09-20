"use client";

import { useState } from "react";
import Link from "next/link";
import { Stars } from "@/components/ui/stars";
import { Badge } from "@/components/ui/badge";
import { KundeAvatar } from "@/components/ui/avatar";
import { FordelingSoejler } from "@/components/ui/fordeling-soejler";

type TabKey = "anmeldelser" | "feedback" | "loyalitet" | "synlighed" | "indsigt";

/**
 * De fem områder.
 *
 * PUNKTERNE ER PRODUKTET OG IKKE SALGSSPROG. Afsnittet havde en overskrift og
 * en brødtekst pr. område, og det er nok til at sige HVAD et område handler
 * om — men ikke til at svare på "hvad får jeg så?". Tre punkter gør det, og
 * de er derfor skrevet som funktioner, der findes, og efterprøvet i koden:
 * platformvalget og det egne link (`stands.ts`), opfølgningen og dens vægt i
 * kundescoren (`omdoemme.ts`), begge loyalitetsformer (`loyalty/`),
 * opslagets tekst, baggrund og logo (`/dashboard/opslag`) og tallene på
 * oversigten (`data.ts`, `FordelingSoejler`).
 *
 * `platform-sektion.test.ts` holder fast i, at de to former står side om side
 * under Loyalitet — det er dét punkt, der er blevet glemt hver gang før.
 */
const TABS: {
  key: TabKey;
  label: string;
  headline: string;
  body: string;
  punkter: string[];
}[] = [
  {
    key: "anmeldelser",
    label: "Anmeldelser",
    headline: "Få flere kunder til at dele deres oplevelse",
    body: "Gør det let for kunderne at finde derhen, hvor du gerne vil anmeldes. Flere gode anmeldelser gør, at nye kunder vælger dig frem for naboen.",
    punkter: [
      "Kunden vælger selv Google, Trustpilot eller Facebook",
      "Skift hvor koden fører hen — uden at trykke standeren om",
      "Dit eget link ved siden af, fx menukort eller booking",
    ],
  },
  {
    key: "feedback",
    label: "Feedback",
    headline: "Fang problemer, før du mister kunden",
    body: "Utilfredse kunder kan sende deres oplevelse direkte til dig. Du kan svare, følge op og rette op — mens kunden stadig er din.",
    punkter: [
      "Kritikken lander i din indbakke og ikke offentligt",
      "Markér som fulgt op, så intet bliver glemt",
      "Opfølgningen tæller med i din kundescore",
    ],
  },
  {
    key: "loyalitet",
    label: "Loyalitet",
    /*
      BEGGE FORMER I TEKSTEN, ÉN I BILLEDET — se mockuppen nedenfor, hvor
      point og stempler står på samme kort, fordi det er dét, kunden ser.
    */
    headline: "Giv kunderne en grund til at komme igen",
    body: "Digitale stempelkort og pointprogrammer gør førstegangsbesøg til stamkunder. Kunden tilmelder sig selv uden app, og personalet stempler eller giver point med ét scan.",
    punkter: [
      "Stempelkort, pointprogram — eller begge dele",
      "Ingen app og ingen konto for kunden",
      "Du bestemmer selv belønningen og reglerne",
    ],
  },
  {
    key: "synlighed",
    label: "Synlighed",
    headline: "Bliv ved med at være synlig",
    body: "Lav færdige opslag ud af det, der allerede sker i din forretning. Mere aktivitet betyder, at flere nye kunder opdager dig.",
    punkter: [
      "Lav et opslag ud af en rigtig anmeldelse",
      "Vælg tekst og baggrund, hent billedet og del det selv",
      "Dit logo og dine farver på opslaget",
    ],
  },
  {
    key: "indsigt",
    label: "Indsigt",
    headline: "Se hvad der faktisk virker",
    body: "Anmeldelser, feedback, medlemmer, stempler og genbesøg samlet ét sted — så du kan gøre mere af det, der virker.",
    punkter: [
      "Scanninger, feedback, klik og rating i realtid",
      "Fordelt på hvert af dine steder",
      "Hele stjernefordelingen — ikke bare et gennemsnit",
    ],
  },
];

/* ---------------------------------------------------------------- mockups */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    /* SKÆRMEN I MOCKUPPEN SKAL LIGNE EN SKÆRM.
       Panelet lå med én bred, mørk skygge — en drop shadow. I produktfotoet
       har den bærbare en stram kant tæt på fladen OG en lang, varm skygge
       under; det er de to lag sammen, der gør, at noget ligger PÅ noget.
       Her er det samme greb i CSS, tonet mod #6b5f57 som i fotoet. */
    <div className="box-shape border border-border bg-card p-5 shadow-[0_1px_2px_rgba(107,95,87,0.08),0_16px_30px_-14px_rgba(107,95,87,0.22),0_40px_64px_-30px_rgba(107,95,87,0.28)]">
      {children}
    </div>
  );
}

function Raekke({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <li
      className={
        "btn-shape flex items-center justify-between gap-3 border border-border bg-surface-subtle px-3 py-2.5 " +
        (className ?? "")
      }
    >
      {children}
    </li>
  );
}

function ReviewsMock() {
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight">Din anmeldelsesside</p>
        <Stars value={5} size={14} />
      </div>
      <ul className="mt-4 space-y-2">
        {["Google", "Trustpilot", "Facebook"].map((p) => (
          <Raekke key={p}>
            <span className="text-sm">{p}</span>
            <Badge tone="success">Aktiv</Badge>
          </Raekke>
        ))}
      </ul>
      {/* Det egne link er IKKE en anmeldelsesplatform og står derfor for sig
          selv — se `reviewstander-valg.ts` for hvorfor det aldrig må ligge
          som en fjerde chip ved siden af de tre. */}
      <div className="btn-shape mt-3 border border-border bg-accent-tint/60 px-3 py-2.5">
        <p className="etiket">Eget link</p>
        <p className="mt-0.5 text-sm font-medium">Menukort</p>
      </div>
    </Panel>
  );
}

function FeedbackMock() {
  return (
    <Panel>
      <p className="text-sm font-semibold tracking-tight">Privat feedback</p>
      <div className="btn-shape mt-4 border border-border bg-surface-subtle p-3">
        <div className="flex items-start gap-2.5">
          {/* Initialer og aldrig et ansigt — samme regel som i panelet. */}
          <KundeAvatar navn="Mette K." size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Mette K.</span>
              <span className="text-xs text-muted">i går</span>
            </div>
            <div className="mt-1">
              <Stars value={2} size={13} />
            </div>
          </div>
        </div>
        <p className="btn-shape mt-2.5 border-l-2 border-accent/30 bg-card px-3 py-2 text-sm leading-relaxed text-foreground/85">
          &ldquo;Der var lang ventetid, da jeg kom forbi i frokostpausen.&rdquo;
        </p>
        {/*
          KUN "FULGT OP". Her stod før også "Bonusstempel sendt", og dét er en
          funktion, produktet ikke har: der sendes ingenting automatisk som
          svar på en tilbagemelding. Et stempel gives ved disken af personalet.
          En mockup, der viser en automatik, vi ikke har, er et løfte.
        */}
        <div className="mt-3">
          <Badge tone="success">Fulgt op</Badge>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        Kritikken lander hos dig — ikke offentligt — så du kan nå at rette op.
      </p>
    </Panel>
  );
}

/**
 * Loyalitet — BEGGE former på ét kort, fordi det er dét, kunden ser.
 *
 * Mockuppen var et stempelkort alene, og så sagde billedet noget andet end
 * teksten ved siden af. Kundens eget kort (`/kort/<token>`) viser pointsaldoen
 * øverst og stempelkortet under, når butikken kører begge dele — og det er den
 * rækkefølge, der er tegnet her.
 */
function LoyaltyMock() {
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight">Café Aurora</p>
        <span className="etiket">Dit kort</span>
      </div>

      <div className="btn-shape mt-4 flex items-center justify-between border border-border bg-accent-tint/60 px-3.5 py-3">
        <div>
          <p className="etiket">Dine point</p>
          <p className="mt-0.5 text-2xl font-semibold leading-none tracking-tight text-dark">
            320
          </p>
        </div>
        <Badge tone="accent">Gratis kaffe: 250</Badge>
      </div>

      <div className="mt-3">
        <p className="etiket">Dit stempelkort</p>
        <div className="mt-2 flex items-center gap-1.5" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className={
                "h-5 flex-1 rounded-full " +
                (i < 7 ? "bg-accent" : "border border-border bg-surface-subtle")
              }
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          7 af 10 stempler — den tiende kop er gratis
        </p>
      </div>
    </Panel>
  );
}

function SocialMock() {
  return (
    <Panel>
      <p className="text-sm font-semibold tracking-tight">Færdigt opslag</p>
      <div className="btn-shape mt-4 overflow-hidden border border-border">
        <div className="bg-dark p-5 text-white">
          <Stars value={5} size={15} />
          <p className="mt-3 text-sm font-medium leading-snug">
            &ldquo;Byens bedste flat white — og de husker altid min
            bestilling.&rdquo;
          </p>
          <p className="mt-3 text-xs text-white/60">Café Aurora</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        Du vælger tekst og baggrund, henter billedet og deler det selv.
      </p>
    </Panel>
  );
}

/**
 * Indsigt — de tal, oversigten FAKTISK viser.
 *
 * Her stod før et søjlediagram over "aktivitet de seneste 6 måneder". Det
 * findes ikke i produktet: der er ingen tidsserie nogen steder, og en mockup
 * af en graf, vi ikke har, er et løfte om en funktion. Tegnet er nu
 * nøgletallene fra oversigten og stjernefordelingen fra omdømmesiden — begge
 * dele findes, og fordelingen tegnes endda med den samme komponent, kunden
 * møder i panelet.
 */
function InsightsMock() {
  return (
    <Panel>
      <p className="text-sm font-semibold tracking-tight">Overblik</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { k: "Scanninger", v: "412" },
          { k: "Feedback", v: "34" },
          { k: "Rating", v: "4,8" },
        ].map((s) => (
          <div
            key={s.k}
            className="btn-shape border border-border bg-surface-subtle p-3"
          >
            <p className="text-lg font-semibold tracking-tight text-dark">
              {s.v}
            </p>
            <p className="text-[11px] text-muted">{s.k}</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <p className="etiket">Fordeling</p>
        <FordelingSoejler
          className="mt-2"
          raekker={[
            { navn: "5 stjerner", antal: 31, trin: 5 },
            { navn: "4 stjerner", antal: 9, trin: 4 },
            { navn: "3 stjerner", antal: 3, trin: 3 },
            { navn: "2 stjerner", antal: 1, trin: 2 },
            { navn: "1 stjerne", antal: 1, trin: 1 },
          ]}
        />
      </div>
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
                  ? "knap-flade btn-shape px-4 py-2.5 text-sm font-medium text-accent-fg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  : "btn-shape border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground/75 shadow-[var(--hoejde-1)] transition-all duration-200 hover:-translate-y-px hover:border-accent/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
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
          <h3 className="text-2xl font-bold tracking-tight">
            {activeTab.headline}
          </h3>
          <p className="mt-3 text-muted">{activeTab.body}</p>

          {/* Punkterne svarer på "hvad får jeg så?", som overskriften og
              brødteksten ikke gør. Fluebenet er husets eget og ikke et
              listepunkt: en prik siger "her er en opremsning", et flueben
              siger "det her er med". */}
          <ul className="mt-5 space-y-2.5">
            {activeTab.punkter.map((punkt) => (
              <li key={punkt} className="flex items-start gap-2.5 text-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                >
                  <path d="m4.5 12.5 4.5 4.5 10-10" />
                </svg>
                <span className="text-foreground/85">{punkt}</span>
              </li>
            ))}
          </ul>

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
