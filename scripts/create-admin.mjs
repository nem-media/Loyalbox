// Engangs-script: opretter en admin-bruger via Supabase service-role.
// Læser nøgler fra .env.local. Kør: node scripts/create-admin.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");

// Minimal .env.local parser
const env = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2];
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Mangler Supabase URL eller service-nøgle i .env.local");
  process.exit(1);
}

const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Sæt ADMIN_EMAIL og ADMIN_PASSWORD som miljøvariabler.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1) Opret auth-bruger (e-mail bekræftet med det samme)
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true,
});

if (createErr) {
  console.error("Kunne ikke oprette bruger:", createErr.message);
  process.exit(1);
}

const userId = created.user.id;
console.log("Auth-bruger oprettet:", EMAIL);

// 2) Sæt rollen til admin i public.users (trigger har lavet rækken)
const { error: roleErr } = await admin
  .from("users")
  .update({ role: "admin" })
  .eq("id", userId);

if (roleErr) {
  console.error("Kunne ikke sætte admin-rolle:", roleErr.message);
  process.exit(1);
}

console.log("Rolle sat til admin. Færdig.");
