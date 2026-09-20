import { COMPANY, BRAND_NAVN, SITE_NAME } from "./constants";
import { laesBlokke, type Blok } from "./mail-blokke";

/**
 * KUNDEMAILENS UDSEENDE — ét sted, præcis som skiltet og ikonfeltet.
 *
 * EN MAIL ER IKKE EN SIDE, og næsten intet fra `globals.css` kan bruges her.
 * Outlook tegner med Words motor: ingen flexbox, intet grid, ingen
 * `box-shadow`. Gmail fjerner `<style>` i nogle visninger. Derfor er alt
 * TABELLER og INLINE stil — ikke af gammel vane, men fordi alternativet er en
 * mail, der falder fra hinanden hos den, der bruger Outlook på arbejde.
 *
 * FARVERNE ER HUSETS, SKRIFTEN ER DET IKKE. Geist findes ikke i en indbakke,
 * og en webfont, der ikke loader, giver en tilfældig erstatning — systemets
 * egen stak er både hurtigere og mere forudsigelig.
 *
 * FORMEN FØLGER MED: det skarpe øverste venstre hjørne er husets mærke.
 * Outlook ignorerer `border-radius` og tegner firkantet — en acceptabel
 * nedgradering, for mailen er stadig rigtig, bare mindre vores.
 *
 * BILLEDER ER SLÅET FRA HOS MANGE. Logoet må derfor ikke bære noget, teksten
 * ikke også siger: `alt` er brandnavnet, og farven er sat, så alt-teksten står
 * hvidt på den mørke bjælke i stedet for at forsvinde.
 *
 * MØRK TILSTAND VENDER FARVER OM AF SIG SELV i Apple Mail og Outlook, hvis man
 * ikke siger andet. `color-scheme: light` og en EKSPLICIT baggrund på hver
 * eneste celle er dét, der holder mailen lys — en tabel uden baggrund bliver
 * sort med sort tekst.
 *
 * DER ER INGEN AFMELDING, og det er ikke en forglemmelse: det her er
 * transaktionsmails — en ordrebekræftelse, et kortlink, en sletningsfrist. Man
 * kan ikke framelde sig kvitteringen for noget, man har købt, og en
 * afmeldingsknap, der ikke virker, er værre end ingen.
 */

/** Husets farver, skrevet som hex — en mail kan ikke slå en variabel op. */
const F = {
  grund: "#f6f4ee",
  kort: "#ffffff",
  streg: "#e6e1d7",
  tekst: "#1e1c1a",
  daempet: "#5f5b55",
  accent: "#26616e",
  accentTint: "#eaf1f2",
  accentStreg: "#d5e5e8",
  moerk: "#1e1c1a",
} as const;

const SKRIFT = [
  "-apple-system",
  "BlinkMacSystemFont",
  "Segoe UI",
  "Roboto",
  "Helvetica",
  "Arial",
  "sans-serif",
].join(",");

/** Husets form. Skarpt øverste venstre hjørne. */
const FORM = "border-radius:0 14px 14px 14px;";

/**
 * HTML-tegn i kundens EGNE data.
 *
 * Firmanavnet, adressen og butiksnavnet kommer fra felter, kunden selv har
 * udfyldt. Et `&` i "Bang & Olufsen" ville ellers stå som en halv entitet, og
 * et `<` ville lukke mailens opbygning op. Det er ikke en teoretisk
 * bekymring: navnet går direkte fra basen ind i beskeden.
 */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Gør adresser i løbende tekst klikbare.
 *
 * Mailen siger "skriv til kontakt@loyalsum.dk", og i en indbakke forventer
 * man, at dét kan trykkes. Kun e-mail og http(s) — og ALTID efter `esc`, så de
 * indsatte tags ikke selv bliver undsluppet.
 */
function linkOp(undsluppet: string): string {
  return undsluppet
    .replace(
      /(https?:\/\/[^\s<]+[^\s<.,)])/g,
      `<a href="$1" style="color:${F.accent};text-decoration:underline;">$1</a>`,
    )
    .replace(
      /*
        SLUTTER PÅ ET BOGSTAV OG IKKE PÅ ET PUNKTUM. Sætningen ender med
        "… skriv til kontakt@loyalsum.dk." — og et grådigt `[\w.]+` tager
        punktummet med ind i adressen, så linket peger på en mailadresse, der
        ikke findes. Det kan ikke ses i teksten, kun i det, der bliver klikket.
      */
      /([\w.+-]+@[\w-]+\.[\w.]*\w)/g,
      `<a href="mailto:$1" style="color:${F.accent};text-decoration:underline;">$1</a>`,
    );
}

const afsnitStil = `margin:0 0 14px;font-size:15px;line-height:1.65;color:${F.tekst};`;
const etiketStil = `margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:${F.daempet};`;
const saetningStil = `margin:0 0 10px;font-size:15px;line-height:1.55;color:${F.tekst};`;

/**
 * VERSALER ER TIL ETIKETTER, IKKE TIL SÆTNINGER.
 *
 * "SENDES TIL" er en etiket og skal stå som en. "Du har også kort, der er
 * gemt på en konto:" er en SÆTNING — sat i versaler med sperring bliver den
 * en mur, man springer over, og netop dén linje er forklaringen på, hvorfor
 * der ikke står et link under. Grænsen er, hvor et ord holder op med at være
 * et mærkat: over ca. tre ord læser man det, og så skal det se læseligt ud.
 */
const ER_ETIKET = (s: string) => s.length <= 28;

/** Cellens polstring i kvitteringen. Første række har lidt mere luft foroven. */
const celle = (foerste: boolean, sidste: boolean) =>
  `padding:${foerste ? "14px" : "11px"} 16px 11px;font-size:14px;background-color:${F.grund};` +
  (foerste ? "" : `border-top:1px solid ${F.streg};`) +
  (sidste ? "padding-bottom:14px;" : "");

function tegnBlok(b: Blok, nr: number, antal: number): string {
  switch (b.slags) {
    case "hilsen":
      return `<p style="margin:0 0 18px;font-size:19px;font-weight:700;line-height:1.35;color:${F.tekst};">${esc(b.tekst)}</p>`;

    case "afsnit":
      return b.linjer
        .map((l) => `<p style="${afsnitStil}">${linkOp(esc(l))}</p>`)
        .join("");

    case "overskrift":
      return (
        `<p style="margin:${nr === 0 ? "0" : "22px"} 0 10px;font-size:16px;font-weight:700;line-height:1.4;color:${F.tekst};">${esc(b.tekst)}</p>` +
        b.linjer
          .map((l) => `<p style="${afsnitStil}">${linkOp(esc(l))}</p>`)
          .join("")
      );

    /*
      KVITTERINGEN ER MAILENS MIDTPUNKT, og det er dén, der gør forskellen på
      en besked og et bevis. I ren tekst var beløbene stillet op med mellemrum
      — det holder kun i en skrift med fast bredde, og en indbakke bruger ikke
      sådan en. Her får de en rigtig tabel: etiketten dæmpet til venstre,
      tallet fedt til højre, så øjet kan løbe ned ad kolonnen.
    */
    case "tabel":
      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;border-collapse:collapse;background-color:${F.grund};${FORM}">` +
        b.raekker
          .map((r, i) => {
            const f = i === 0;
            const s = i === b.raekker.length - 1;
            return (
              `<tr>` +
              `<td style="${celle(f, s)}color:${F.daempet};">${esc(r.etiket)}</td>` +
              `<td align="right" style="${celle(f, s)}font-weight:700;color:${F.tekst};">${esc(r.vaerdi)}</td>` +
              `</tr>`
            );
          })
          .join("") +
        `</table>`
      );

    case "vaerdier":
      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;border-collapse:collapse;">` +
        `<tr><td style="padding:14px 16px;background-color:${F.grund};${FORM}">` +
        (b.etiket
          ? ER_ETIKET(b.etiket)
            ? `<p style="${etiketStil}">${esc(b.etiket.replace(/:$/, ""))}</p>`
            : `<p style="${saetningStil}">${esc(b.etiket)}</p>`
          : "") +
        b.vaerdier
          .map(
            (v) =>
              `<p style="margin:0 0 3px;font-size:15px;line-height:1.55;color:${F.tekst};">${linkOp(esc(v))}</p>`,
          )
          .join("") +
        `</td></tr></table>`
      );

    /*
      ADRESSEN STÅR PÅ SKRIFT, OG DER STÅR ALDRIG "KLIK HER".
      To grunde, og begge vejer tungere end at panelet ville se renere ud med
      et kort ord: (1) på et skilt uden abonnement trykkes QR-koden FAST, og
      mailen er sidste lejlighed til at opdage en tastefejl — man kan ikke
      kontrollere en adresse, man ikke kan se; (2) en mail fra en virksomhed,
      der håndterer betalinger, skal vise hvor et link fører hen. En knap, der
      skjuler sit mål, er præcis den form, folk lærer at klikke på i god tro.
      Panelet er stort nok til en tommelfinger og er selv linket.
    */
    case "link":
      return (
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;border-collapse:collapse;">` +
        `<tr><td style="padding:0;background-color:${F.accentTint};border:1px solid ${F.accentStreg};${FORM}">` +
        `<a href="${esc(b.url)}" style="display:block;padding:15px 18px;text-decoration:none;color:${F.accent};">` +
        (b.etiket
          ? `<span style="display:block;margin:0 0 5px;font-size:15px;font-weight:700;color:${F.tekst};">${esc(b.etiket.replace(/:$/, ""))}</span>`
          : "") +
        `<span style="display:block;font-size:14px;line-height:1.5;color:${F.accent};word-break:break-all;">${esc(b.url)}</span>` +
        `</a></td></tr></table>`
      );

    case "hilsenTil":
      return `<p style="margin:${antal > 1 ? "26px" : "0"} 0 0;font-size:15px;line-height:1.65;color:${F.daempet};">${esc(b.hilsen)}<br><strong style="color:${F.tekst};">${esc(b.navn)}</strong></p>`;
  }
}

/**
 * Teksten, der står i indbakkens forhåndsvisning.
 *
 * Uden den tager klienten de første ord, den kan finde — og det er logoets
 * alt-tekst plus "Hej <firmanavn>", altså to gange dét, der allerede står i
 * emnefeltet. Her tages mailens første rigtige sætning i stedet.
 */
function forhaandsvisning(blokke: Blok[]): string {
  for (const b of blokke) {
    if (b.slags === "afsnit" && b.linjer[0]) return b.linjer[0];
    if (b.slags === "overskrift" && b.linjer[0]) return b.linjer[0];
  }
  return "";
}

/**
 * Den fulde mail som HTML. Teksten er kilden; se `mail-blokke.ts`.
 *
 * `siteUrl` gives med frem for at blive slået op, så skabelonen kan prøves
 * uden et miljø — samme greb som `kortLinkMail`.
 */
export function mailHtml(tekst: string, siteUrl: string): string {
  const blokke = laesBlokke(tekst);
  const krop = blokke.map((b, i) => tegnBlok(b, i, blokke.length)).join("");
  const skjult = forhaandsvisning(blokke);
  const base = siteUrl.replace(/\/$/, "");

  return `<!doctype html>
<html lang="da" style="margin:0;padding:0;">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(SITE_NAME)}</title>
</head>
<body style="margin:0;padding:0;background-color:${F.grund};color-scheme:light;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${esc(skjult)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:${F.grund};">
<tr><td align="center" style="padding:28px 12px 36px;background-color:${F.grund};">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;">

<tr><td style="padding:22px 24px;background-color:${F.moerk};${FORM}">
<a href="${esc(base)}" style="text-decoration:none;color:#ffffff;">
<img src="${esc(base)}/loyalsum-logo.png" width="150" height="35" alt="${esc(BRAND_NAVN)}" style="display:block;border:0;outline:none;width:150px;height:35px;color:#ffffff;font-size:18px;font-weight:700;font-family:${SKRIFT};">
</a>
</td></tr>

<tr><td style="height:10px;line-height:10px;font-size:0;background-color:${F.grund};">&nbsp;</td></tr>

<tr><td style="padding:30px 28px 26px;background-color:${F.kort};border:1px solid ${F.streg};${FORM}font-family:${SKRIFT};">
${krop}
</td></tr>

<tr><td style="padding:20px 28px 0;background-color:${F.grund};font-family:${SKRIFT};">
<p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:${F.daempet};"><strong style="color:${F.tekst};">${esc(SITE_NAME)}</strong> — ${esc(COMPANY.legalName)} · CVR ${esc(COMPANY.cvr)}</p>
<p style="margin:0 0 4px;font-size:12px;line-height:1.6;color:${F.daempet};">${esc(COMPANY.address)}, ${esc(COMPANY.postalCode)} ${esc(COMPANY.city)}</p>
<p style="margin:0;font-size:12px;line-height:1.6;color:${F.daempet};">Du får denne mail, fordi du har handlet eller har et kort hos os.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
