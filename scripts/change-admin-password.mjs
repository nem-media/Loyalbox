// Skifter en brugers adgangskode via Supabase service-role.
// Læser Supabase-nøgler fra .env.local. Printer INGEN nøgler eller adgangskoder.
//
// Brug (PowerShell):
//   $env:ADMIN_EMAIL='admin@reviewstand.dk'; $env:ADMIN_NEW_PASSWORD='DinNyeStærkeKode'; node scripts/change-admin-password.mjs
//
// ADMIN_EMAIL er valgfri (default: admin@reviewstand.dk).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Minimal .env.local-parser
const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2];
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !service) {
  console.error("Mangler Supabase URL eller service-nøgle i .env.local");
  process.exit(1);
}

const email = process.env.ADMIN_EMAIL || "admin@reviewstand.dk";
const newPassword = process.env.ADMIN_NEW_PASSWORD;

if (!newPassword) {
  console.error("Sæt ADMIN_NEW_PASSWORD som miljøvariabel med den nye adgangskode.");
  process.exit(1);
}
if (newPassword.length < 8) {
  console.error("Vælg en adgangskode på mindst 8 tegn (gerne længere).");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Find brugeren via e-mail
const { data, error } = await admin.auth.admin.listUsers();
if (error) {
  console.error("Kunne ikke hente brugere:", error.message);
  process.exit(1);
}
const user = data.users.find((u) => u.email === email);
if (!user) {
  console.error(`Ingen bruger fundet med e-mail: ${email}`);
  process.exit(1);
}

// Opdatér adgangskoden
const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
  password: newPassword,
});
if (updateErr) {
  console.error("Kunne ikke skifte adgangskode:", updateErr.message);
  process.exit(1);
}

console.log(`✅ Adgangskoden er skiftet for ${email}.`);
console.log("Log ind med den nye kode. Husk at fjerne den gamle kode fra .claude/settings.local.json.");
