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

async function findProduct(slug) {
  const q = encodeURIComponent(`metadata['loyalsum_slug']:'${slug}'`);
  const r = await stripe(`products/search?query=${q}&limit=1`, null, "GET");
  return r.data?.[0] ?? null;
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
  const wanted = [
    { label: "engangs (stander)", amount: p.price, recurring: false },
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
  console.log(
    "Bemærk: test- og live-id'er er forskellige. Tilføj den nye tilstand ved\n" +
      "siden af den gamle i stedet for at erstatte den — så virker begge dele.",
  );
}
