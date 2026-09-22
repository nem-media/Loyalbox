"use client";

import { useRef, useState } from "react";
import { synligeUdtalelser, initialer, type Udtalelse } from "@/lib/testimonials";

/**
 * Udtalelser fra butikker, der bruger LoyalSum.
 *
 * SEKTIONEN TEGNER INGENTING, NÅR DER IKKE ER NOGET AT SIGE. Det er hele
 * pointen: designet står klar, men en tom ramme med "her kommer udtalelser"
 * er værre end ingen sektion — den fortæller den besøgende, at ingen har
 * sagt noget endnu. Filtreringen ligger i `synligeUdtalelser()`.
 *
 * EN SLIDER AF SCROLL-SNAP OG IKKE AF ET BIBLIOTEK.
 *
 * Projektet har intet carousel-bibliotek, og det skal det ikke have for seks
 * citater. `overflow-x-auto` med `snap-x` giver GRATIS det, et bibliotek
 * ellers skal levere: rigtig swipe med fysik på en telefon, træk med musen på
 * en pegefelt, tastaturrulning når området har fokus, og en rulleposition,
 * browseren selv holder styr på. Pilene kalder bare `scrollBy`.
 *
 * DER ER INGEN AUTOPLAY OG INGEN LOOP. Begge dele er valgt fra, ikke glemt.
 * Autoplay flytter tekst, mens man læser den, og et loop kan ikke laves
 * robust med scroll-snap uden at klone kort og hoppe i rullepositionen — et
 * hop, der rammer netop den, der bruger tastatur eller skærmlæser. Pilene
 * slår fra i hver ende i stedet, så man kan se, at der ikke er mere.
 *
 * TILGÆNGELIGHED: rullefladen er selv et fokuspunkt (`tabIndex=0`), fordi et
 * rulbart område, man ikke kan nå med tastaturet, er indhold, man ikke kan
 * nå. Den er mærket som et navngivet område, listen indeni er stadig en
 * liste (så optællingen af citater bevares), pilene har rigtige labels, og
 * hvert citat står i `figure`/`blockquote`/`figcaption` — den opmærkning, en
 * skærmlæser bruger til at sige "citat af …".
 */

/** Hvor langt en pil flytter: ét kort, uanset hvor mange der er synlige. */
function rulEtKort(el: HTMLElement, retning: 1 | -1) {
  const foerste = el.querySelector<HTMLElement>("[data-kort]");
  /* Bredden MÅLES og regnes ikke ud af et breakpoint: kortene er 1, 2 eller
     3 ad gangen, og et tal her ville skulle holdes i takt med CSS'en. */
  const skridt = foerste
    ? foerste.getBoundingClientRect().width + 20 /* gap-5 */
    : el.clientWidth;

  /* `prefers-reduced-motion` slår den bløde rulning fra. Reglen i
     globals.css dækker overgange og animationer, ikke `scrollBy`, så den
     skal spørges her. */
  const dæmpet =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  el.scrollBy({ left: skridt * retning, behavior: dæmpet ? "auto" : "smooth" });
}

export function Udtalelser() {
  const udtalelser = synligeUdtalelser();
  const baneRef = useRef<HTMLDivElement>(null);
  /* Hvor langt vi er — bruges KUN til at slå pilene fra i enderne. En pil,
     der ikke kan gøre noget, skal se sådan ud. */
  const [kanTilbage, setKanTilbage] = useState(false);
  const [kanFrem, setKanFrem] = useState(true);

  if (udtalelser.length === 0) return null;

  const erPladsholder = udtalelser.some((u) => u.isPlaceholder);

  function opdaterPile(el: HTMLElement) {
    /* 2 px slør: `scrollWidth` og `clientWidth` kan ligge et delpixel fra
       hinanden ved skalering, og uden sløret blev "frem" aldrig slået fra. */
    setKanTilbage(el.scrollLeft > 2);
    setKanFrem(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }

  return (
    /*
      SEKTIONEN LIGGER PÅ DEN LYSE GRUND OG IKKE PÅ HVIDT.
      Kortene er hvide, og et hvidt kort på en hvid flade holdes kun oppe af
      en 1 px streg — præcis dét, der fik panelet til at ligne "hvide
      firkanter med grå kontur", før `--app-bg` kom til. Sektionen efter
      denne er også lys, og de to smelter IKKE sammen: hver af dem har sin
      egen hårlinje og sit eget `sektion-skaer` øverst, så lyset starter
      forfra ved grænsen. Efterprøvet på et skærmbillede af overgangen.
    */
    <section
      aria-labelledby="udtalelser-titel"
      className="sektion-skaer border-t border-border bg-muted-bg"
    >
      <div className="mx-auto max-w-side px-4 py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="etiket">Udtalelser</p>
            <h2
              id="udtalelser-titel"
              className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Sagt af dem, der bruger det
            </h2>
          </div>

          {/* PILENE STÅR VED OVERSKRIFTEN og ikke under kortene: dér er de
              synlige, uden at man først skal rulle forbi indholdet for at
              opdage, at det kan rulles. */}
          <div className="flex shrink-0 gap-2">
            <Pil
              retning={-1}
              label="Forrige udtalelser"
              slaaet={!kanTilbage}
              baneRef={baneRef}
            />
            <Pil
              retning={1}
              label="Næste udtalelser"
              slaaet={!kanFrem}
              baneRef={baneRef}
            />
          </div>
        </div>

        {erPladsholder ? (
          /* Kun synlig under udvikling — se `synligeUdtalelser()`. Den er
             bevidst grim: et mærke, man kan overse, er ikke et mærke. */
          <p className="btn-shape mt-6 inline-block border border-danger/40 bg-danger/5 px-3 py-1.5 text-xs font-semibold text-danger-tekst">
            PLADSHOLDERE — vises kun under udvikling. Erstat med godkendte
            citater i src/lib/testimonials.ts
          </p>
        ) : null}

        {/*
          RULLEFLADEN ER EN `div`, OG LISTEN ER STADIG EN LISTE.
          Første udgave satte `role="group"` og `tabIndex` direkte på `<ul>`
          — og en rolle på et listeelement OVERSKRIVER listesemantikken, så
          en skærmlæser holder op med at sige "liste med 6 elementer". Det er
          netop dén optælling, der fortæller, hvor meget der er at rulle
          igennem. Rollen ligger derfor på en beholder udenom.

          `tabIndex={0}` er ikke pynt: et område, man kun kan nå ved at rulle
          med musen, er indhold, en tastaturbruger ikke kan nå. Med fokus kan
          piletasterne rulle det, og det er browserens egen opførsel — ikke
          noget, vi skal bygge.
        */}
        <div
          ref={baneRef}
          onScroll={(e) => opdaterPile(e.currentTarget)}
          tabIndex={0}
          role="region"
          aria-label="Udtalelser fra kunder — rul til siden for at se flere"
          className="skjul-rullepanel mt-8 overflow-x-auto pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ul className="flex snap-x snap-mandatory items-stretch gap-5">
            {udtalelser.map((u) => (
              <Kort key={u.id} udtalelse={u} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/**
 * Ét kort.
 *
 * BREDDEN ER SAT I PROCENT OG IKKE I ET GITTER, fordi kortene ligger i en
 * rulleflade: tre ad gangen på desktop, to på tablet, ét på telefon.
 * `calc` trækker mellemrummet fra, så det tredje kort ikke stikker ud.
 *
 * `items-stretch` på banen gør dem lige høje, og `mt-auto` holder afsenderen
 * i bunden — ellers ville et kort med to linjers citat have sin billedtekst
 * oppe midt i fladen, mens naboens stod nede. Samme greb som nøgletallene.
 */
function Kort({ udtalelse }: { udtalelse: Udtalelse }) {
  return (
    <li
      data-kort
      className="w-[calc(100%-0.5rem)] shrink-0 snap-start sm:w-[calc(50%-0.625rem)] laptop:w-[calc(33.333%-0.834rem)]"
    >
      <figure className="box-shape teal-skaer flex h-full flex-col border border-border bg-card p-6 shadow-[var(--hoejde-1)]">
        {/* Citattegnet er sat som tekst og ikke som et ikon: det er
            typografi, det hører til i skriften, og et SVG ville se ud som et
            fremmedelement i en tekstflade. */}
        <span
          aria-hidden="true"
          className="font-serif text-5xl leading-none text-accent/25"
        >
          &ldquo;
        </span>

        <blockquote className="mt-1 flex-1 text-sm leading-relaxed text-foreground/85">
          {udtalelse.citat}
        </blockquote>

        <figcaption className="mt-auto flex items-center gap-3 pt-5">
          {/*
            INITIALER AF KATEGORIEN — OG BEVIDST IKKE `KundeAvatar`.
            Den komponent tegner et MENNESKE: den laver initialer af et navn
            og falder tilbage på et persontegn, når der ikke er et. Her er
            der ingen person — "Bager i København" er en branche og en
            landsdel — og et persontegn ville være præcis den påstand om et
            menneske, som hele reglen i `testimonials.ts` handler om.
          */}
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-accent/20 bg-accent-tint text-xs font-semibold tracking-wide text-accent shadow-[var(--hoejde-1)]"
          >
            {initialer(udtalelse.afsender)}
          </span>
          <span className="min-w-0 text-sm font-medium text-muted">
            {udtalelse.afsender}
          </span>
        </figcaption>
      </figure>
    </li>
  );
}

/** En af de to pile. Slået fra i enden, så den ikke lover noget, den ikke kan. */
function Pil({
  retning,
  label,
  slaaet,
  baneRef,
}: {
  retning: 1 | -1;
  label: string;
  slaaet: boolean;
  baneRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={slaaet}
      onClick={() => baneRef.current && rulEtKort(baneRef.current, retning)}
      className="trykmaal-min grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-accent shadow-[var(--hoejde-1)] transition-all duration-200 hover:-translate-y-px hover:shadow-[var(--hoejde-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`h-[18px] w-[18px] ${retning === 1 ? "" : "rotate-180"}`}
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}
