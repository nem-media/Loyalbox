// Opretter (idempotent) en test-slutkunde med kundekonto og knytter et
// eksisterende demo-stempelkort til den.
//
// Kræver at migration 0007_member_accounts.sql er kørt — scriptet verificerer
// selv, at kolonnen `loyalty_members.user_id` findes, før det skriver noget.
//
// Adgangskoden kommer fra miljøet og står bevidst IKKE i koden: dette repo er
// offentligt, og testkontiene lever i produktionsdatabasen (ét Supabase-projekt
// til både udvikling og drift), så en hardkodet kode ville være et rigtigt login.
//
// Brug: TEST_CUSTOMER_PASSWORD="…" node scripts/setup-test-customer.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const env = {};
for (const line of readFileSync(join(__dirname, "..", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const EMAIL = "kunde@loyalbox.test";
const PASSWORD = process.env.TEST_CUSTOMER_PASSWORD;
if (!PASSWORD) {
  console.error("Mangler TEST_CUSTOMER_PASSWORD i miljøet.");
  console.error('Brug: TEST_CUSTOMER_PASSWORD="…" node scripts/setup-test-customer.mjs');
  process.exit(1);
}

// 1) Verificér skemaet, før vi skriver til det (jf. AGENTS.md).
const probe = await admin.from("loyalty_members").select("id, user_id").limit(1);
if (probe.error) {
  console.error("Skema-tjek fejlede:", probe.error.message);
  console.error("→ Kør supabase/migrations/0007_member_accounts.sql i Supabase SQL Editor først.");
  process.exit(1);
}
console.log("✓ loyalty_members.user_id findes");

// 2) Opret auth-brugeren (eller genbrug den, hvis den allerede findes).
let userId = null;
const created = await admin.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
  user_metadata: { role: "customer" },
});
if (created.error) {
  if (!/already|registered|exists/i.test(created.error.message)) {
    console.error("Kunne ikke oprette bruger:", created.error.message);
    process.exit(1);
  }
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  userId = list?.users.find((u) => u.email === EMAIL)?.id ?? null;
  if (!userId) {
    console.error("Brugeren findes, men kunne ikke slås op.");
    process.exit(1);
  }
  // Sørg for at adgangskoden er den forventede, også ved genkørsel.
  await admin.auth.admin.updateUserById(userId, { password: PASSWORD });
  console.log("✓ Auth-bruger fandtes i forvejen:", EMAIL);
} else {
  userId = created.data.user.id;
  console.log("✓ Auth-bruger oprettet:", EMAIL);
}

// public.users-rækken oprettes af en trigger; sikr den findes med rolle customer.
await admin.from("users").upsert({ id: userId, email: EMAIL, role: "customer" });

// 3) Find et demo-kort at knytte til kontoen.
const { data: company } = await admin
  .from("companies")
  .select("id, name")
  .ilike("name", "%testcafe%")
  .limit(1)
  .maybeSingle();

if (!company) {
  console.error("Fandt ingen 'Testcafe'-virksomhed at hente et demokort fra.");
  process.exit(1);
}

const { data: members } = await admin
  .from("loyalty_members")
  .select("id, name, public_token, user_id")
  .eq("company_id", company.id)
  .order("created_at", { ascending: true });

if (!members?.length) {
  console.error(`Ingen loyalty_members i ${company.name}.`);
  process.exit(1);
}

// Foretræk et kort der allerede er vores; ellers første ledige.
const target =
  members.find((m) => m.user_id === userId) ??
  members.find((m) => !m.user_id);

if (!target) {
  console.error("Alle demokort er allerede knyttet til andre konti.");
  process.exit(1);
}

if (target.user_id !== userId) {
  const { error } = await admin
    .from("loyalty_members")
    .update({ user_id: userId, claimed_at: new Date().toISOString() })
    .eq("id", target.id);
  if (error) {
    console.error("Kunne ikke knytte kortet:", error.message);
    process.exit(1);
  }
}

const site = env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
console.log("");
console.log("Testbruger klar:");
console.log(`  E-mail:     ${EMAIL}`);
console.log("  Adgangskode: (den du gav i TEST_CUSTOMER_PASSWORD)");
console.log(`  Butik:      ${company.name}`);
console.log(`  Kort:       ${target.name ?? "(uden navn)"}`);
console.log(`  Kort-URL:   ${site}/kort/${target.public_token}`);
console.log(`  Oversigt:   ${site}/mine-kort`);
