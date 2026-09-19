// Opretter (idempotent) LoyalSums produkter og priser i Stripe ud fra
// `src/lib/constants.ts`, så priserne kun findes ÉT sted.
//
// Hvert Stripe-produkt mærkes med metadata.loyalsum_slug. Kører du scriptet
// igen, genbruges produktet, og en pris oprettes kun hvis beløbet er ændret —
// Stripe-priser kan nemlig ikke redigeres, kun erstattes. Gamle priser
// deaktiveres ikke automatisk; det er med vilje, så igangværende abonnementer
// ikke rives væk under kunderne.
//
// Priserne i constants.ts er EX MOMS. Derfor sættes tax_behavior=exclusive, så
// moms lægges oveni ved checkout i stedet for at blive regnet ud af beløbet.
//
// MÆNGDERABAT oprettes IKKE her. Den beregnes serverside med priceFor() og
// sendes som price_data ved checkout — ellers skulle hver rabatsats have sin
// egen pris i Stripe, og constants.ts ville ikke længere være sandheden.
//
// Brug:
//   STRIPE_SECRET_KEY="sk_test_…" node scripts/setup-stripe-products.mjs
//   STRIPE_SECRET_KEY="sk_test_…" node scripts/setup-stripe-products.mjs --dry-run
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

/* ------------------------------------------------------------------ nøgle */

let key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  try {
    for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
      const m = line.match(/^STRIPE_SECRET_KEY\s*=\s*"?([^"\r\n]+)"?/);
      if (m) key = m[1];
    }
  } catch {
    // .env.local behøver ikke findes
  }
}
if (!key && !dryRun) {
  console.error(
    "Mangler STRIPE_SECRET_KEY.\n\n" +
      "Opret en Stripe-konto, hent den hemmelige nøgle under Developers → API keys,\n" +
      "og læg den i .env.local som:\n\n" +
      '  STRIPE_SECRET_KEY="sk_test_…"\n\n' +
      "Brug testnøglen (sk_test_) først — så oprettes alt i testtilstand.",
  );
  process.exit(1);
}
/*
  NØGLEN SKAL SE UD SOM EN HEL NØGLE — ellers fejler kørslen med en rå
  TypeError fra fetch ("Cannot convert argument to a ByteString"), fordi et
  tegn over 255 ikke kan stå i en HTTP-header. Det skete 13. september: nøglen
  var kopieret fra Stripes dashboard, hvor den vises FORKORTET med et
  tre-prikker-tegn, og fejlen sagde intet om hvorfor.

  Kontrollen kigger ikke efter en bestemt længde — Stripe kan ændre formatet —
  kun efter at der ikke er sneget noget ind, som ikke hører hjemme i en nøgle.
*/
if (key) {
  const rest = key.replace(/^sk_(test|live)_/, "");
  if (!/^sk_(test|live)_/.test(key) || /[^A-Za-z0-9]/.test(rest) || rest.length < 20) {
    const linjer = [
      "STRIPE_SECRET_KEY ligner ikke en hel nøgle.",
      "",
      "Den skal begynde med sk_test_ eller sk_live_ og derefter kun indeholde",
      "bogstaver og tal — ingen mellemrum, anførselstegn eller prikker.",
    ];
    if (/…/.test(key)) {
      linjer.push(
        "",
        "Der står et afkortnings-tegn i nøglen. Stripes dashboard VISER nøglen",
        "forkortet — tryk «Reveal live key» og kopiér hele strengen.",
      );
    }
    console.error(linjer.join(String.fromCharCode(10)));
    process.exit(1);
  }
}

const live = Boolean(key?.startsWith("sk_live_"));

/* --------------------------------------------- produkter fra constants.ts */

// Parser de felter vi skal bruge direkte fra kilden, så scriptet ikke kræver
// et build-trin for at læse TypeScript.
const src = readFileSync(join(root, "src", "lib", "constants.ts"), "utf8");
const block = src.slice(
  src.indexOf("export const PRODUCTS"),
  src.indexOf("export function getProduct"),
);

const products = [];
// Filen kan have både LF og CRLF — begge skal matche.
for (const chunk of block.split(/\r?\n  \{\r?\n/).slice(1)) {
  const pick = (field, re) => {
    const m = chunk.match(re);
    return m ? m[1] : null;
  };
  const slug = pick("slug", /slug:\s*"([^"]+)"/);
  if (!slug) continue;
  products.push({
    slug,
    name: pick("name", /\n\s+name:\s*"([^"]+)"/),
    tagline: pick("tagline", /tagline:\s*"([^"]+)"/),
    price: Number(pick("price", /\n\s+price:\s*(\d+)/)),
    monthlyPrice: Number(pick("monthlyPrice", /monthlyPrice:\s*(\d+)/) ?? 0),
    setupPrice: Number(pick("setupPrice", /setupPrice:\s*(\d+)/) ?? 0),
  });
}

if (!products.length) {
  console.error("Kunne ikke læse produkter fra constants.ts — er blokken flyttet?");
  process.exit(1);
}

/* -------------------------------------------------------------- Stripe API */

async function stripe(path, params, method = "POST") {
  const body = new URLSearchParams();
  const walk = (obj, prefix = "") => {
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null) continue;
      const name = prefix ? `${prefix}[${k}]` : k;
      if (typeof v === "object" && !Array.isArray(v)) walk(v, name);
      else body.append(name, String(v));
    }
  };
  if (params) walk(params);

  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "GET" ? undefined : body,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`${res.status} ${json?.error?.message ?? "ukendt fejl"}`);
  }
  return json;
}

/*
  OPSLAGET MÅ IKKE VÆRE SEARCH — DEN ER EVENTUALLY CONSISTENT.

  Scriptet kalder sig idempotent, og det holdt, så længe der gik et døgn
  mellem kørslerne. MÅLT 2026-09-19: to kørsler med 12 sekunders mellemrum gav
  TO produkter for `loyalsum-komplet-online` — hver med sin egen 399 kr.-
  månedspris. `/v1/products/search` indekserer nyoprettede objekter med
  forsinkelse (Stripe dokumenterer op mod et minut), så den anden kørsel så et
  tomt svar og oprettede varen igen.

  DET ER VÆRRE END ET DOBBELT PRODUKT: den anden kørsel udskriver et ANDET
  `productId` og `monthlyPriceId` end den første, og bliver de skrevet ind i
  constants.ts, abonnerer nye kunder på et prisobjekt, der hører til en vare,
  ingen kigger på. To varer med samme navn i Stripes dashboard er desuden
  præcis den slags, man retter ved at slette den forkerte — og det er ikke til
  at se hvilken, når begge har rigtige tal.

  `GET /v1/products` er strongly consistent: det, der lige er skrevet, står
  der. Listen er på fem varer, så der er ingen grund til at sortere i Stripe.
  ARKIVEREDE TÆLLER IKKE MED (`active=true`) — en vare, der bevidst er taget
  ud af drift, skal ikke komme tilbage, fordi scriptet kører igen.
*/
async function findProduct(slug) {
  let startingAfter = null;
  for (;;) {
    const side = await stripe(
      `products?limit=100&active=true${startingAfter ? `&starting_after=${startingAfter}` : ""}`,
      null,
      "GET",
    );
    const fundet = side.data?.find((p) => p.metadata?.loyalsum_slug === slug);
    if (fundet) return fundet;
    if (!side.has_more || !side.data?.length) return null;
    startingAfter = side.data[side.data.length - 1].id;
  }
}

async function findPrice(productId, amountOere, recurring) {
  const r = await stripe(
    `prices?product=${productId}&active=true&limit=100`,
    null,
    "GET",
  );
  return (
    r.data?.find(
      (p) =>
        p.unit_amount === amountOere &&
        p.currency === "dkk" &&
        (recurring ? p.recurring?.interval === "month" : !p.recurring),
    ) ?? null
  );
}

/* --------------------------------------------------------------- kørslen */

console.log(
  `Stripe: ${live ? "LIVE-tilstand" : "testtilstand"}${dryRun ? " · tørkørsel (skriver intet)" : ""}\n`,
);

const result = [];

process.on("unhandledRejection", (err) => {
  console.error(`
Stripe-fejl: ${err.message}`);
  process.exit(1);
});

for (const p of products) {
  console.log(`${p.name}`);

  let product = dryRun ? null : await findProduct(p.slug);
  if (!product) {
    if (dryRun) {
      console.log("  ville oprette produkt");
    } else {
      product = await stripe("products", {
        name: p.name,
        description: p.tagline,
        metadata: { loyalsum_slug: p.slug },
      });
      console.log(`  produkt oprettet: ${product.id}`);
    }
  } else {
    console.log(`  produkt findes: ${product.id}`);
  }

  const lines = [];
  /*
    EN VARE UDEN ENGANGSPRIS SKAL IKKE HAVE EN PÅ 0 KR.
    Standerlinjen var ubetinget, fordi hver vare havde en stander. LoyalSum
    Komplet Online har ingen (`price: 0`), og Stripe tager glad imod
    `unit_amount: 0` — så der ville blive oprettet et gyldigt prisobjekt på
    nul kroner og skrevet ind i `constants.ts` som varens `priceId`.

    DET ER EN LANDMINE AF SAMME SLAGS SOM DEN, DER ALLEREDE LIGGER DER: de
    gemte engangspriser står på 399, mens vi opkræver 499, og `pris-
    graenseflade.test.ts` findes netop, fordi `price: ids.priceId` ser ud som
    den naturlige måde at bruge dem på. Et nul-prisobjekt ville gøre samme
    fejltagelse gratis for kunden i stedet for 100 kr. for billig.

    Månedsprisen og opsætningen var betinget i forvejen; standerlinjen får nu
    samme behandling, så en vare selv afgør, hvilke priser den har.
  */
  const wanted = [
    p.price
      ? { label: "engangs (stander)", amount: p.price, recurring: false }
      : null,
    p.setupPrice
      ? { label: "engangs (opsætning)", amount: p.setupPrice, recurring: false }
      : null,
    p.monthlyPrice
      ? { label: "månedligt", amount: p.monthlyPrice, recurring: true }
      : null,
  ].filter(Boolean);

  for (const w of wanted) {
    const oere = w.amount * 100;
    if (dryRun || !product) {
      console.log(`  ville sikre pris ${w.label}: ${w.amount} kr.`);
      continue;
    }
    let price = await findPrice(product.id, oere, w.recurring);
    if (!price) {
      price = await stripe("prices", {
        product: product.id,
        currency: "dkk",
        unit_amount: oere,
        tax_behavior: "exclusive",
        ...(w.recurring ? { recurring: { interval: "month" } } : {}),
        metadata: { loyalsum_slug: p.slug, kind: w.recurring ? "monthly" : "one_time" },
      });
      console.log(`  pris oprettet ${w.label}: ${w.amount} kr. → ${price.id}`);
    } else {
      console.log(`  pris findes ${w.label}: ${w.amount} kr. → ${price.id}`);
    }
    lines.push({ kind: w.recurring ? "monthly" : "one_time", id: price.id });
  }

  if (product) {
    result.push({
      slug: p.slug,
      productId: product.id,
      priceId: lines.find((l) => l.kind === "one_time")?.id ?? null,
      monthlyPriceId: lines.find((l) => l.kind === "monthly")?.id ?? null,
    });
  }
  console.log("");
}

/* ------------------------------------------------------------------- moms */

// Fast dansk moms som en Tax Rate. BEVIDST ikke Stripe Tax (automatic_tax):
// den kræver en aktiv momsregistrering i Stripe, og uden den opkræver Stripe
// slet ingen moms — uden at fejle. En fast sats kan ikke fejle stille.
//
// En Tax Rates procent kan ikke redigeres, kun erstattes, så den slås op først.
let taxRateId = null;
if (!dryRun) {
  const existing = await stripe("tax_rates?active=true&limit=100", null, "GET");
  const found = existing.data?.find(
    (t) => Number(t.percentage) === 25 && t.country === "DK" && !t.inclusive,
  );
  if (found) {
    taxRateId = found.id;
    console.log(`Moms findes: 25 % DK -> ${found.id}\n`);
  } else {
    const created = await stripe("tax_rates", {
      display_name: "Moms",
      description: "Dansk moms 25 %",
      percentage: 25,
      inclusive: false,
      country: "DK",
      tax_type: "vat",
    });
    taxRateId = created.id;
    console.log(`Moms oprettet: 25 % DK -> ${created.id}\n`);
  }
}

if (result.length) {
  const mode = live ? "live" : "test";
  console.log(
    `Indsæt i src/lib/constants.ts på hvert produkt (tilstand: ${mode}):\n`,
  );
  for (const r of result) {
    console.log(`  // ${r.slug}`);
    console.log("  stripe: {");
    console.log(`    ${mode}: {`);
    console.log(`      productId: "${r.productId}",`);
    if (r.priceId) console.log(`      priceId: "${r.priceId}",`);
    if (r.monthlyPriceId)
      console.log(`      monthlyPriceId: "${r.monthlyPriceId}",`);
    console.log("    },");
    console.log("  },");
    console.log("");
  }
  if (taxRateId) {
    console.log("  // STRIPE_TAX_RATES i src/lib/constants.ts");
    console.log(`  ${mode}: "${taxRateId}",
`);
  }
  console.log(
    "Bemærk: test- og live-id'er er forskellige. Tilføj den nye tilstand ved\n" +
      "siden af den gamle i stedet for at erstatte den — så virker begge dele.",
  );
}
