import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { nyBase } from "./pglite";

/**
 * MIGRATION 0050 I EN RIGTIG POSTGRES (PGlite): spanden til LoyalSums egne
 * udgivelser er PRIVAT, og ingen policy åbner den.
 *
 * `storage.*` er attrapper her (se pglite.ts); det, der prøves, er migrationens
 * egne sætninger — at spanden oprettes privat, at en genkørsel gør den privat
 * igen, og at der ikke findes en policy, der nævner den.
 */
let db: PGlite;

beforeAll(async () => {
  db = await nyBase();
});

describe("0050 — loyalsum-releases", () => {
  it("spanden findes og er privat", async () => {
    const r = await db.query<{ public: boolean; file_size_limit: string }>(
      "select public, file_size_limit from storage.buckets where id = 'loyalsum-releases'",
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].public).toBe(false);
  });

  it("en genkørsel gør en offentliggjort spand privat igen", async () => {
    await db.exec("update storage.buckets set public = true where id = 'loyalsum-releases'");
    await db.exec(readFileSync(join(process.cwd(), "supabase/migrations/0050_loyalsum_releases.sql"), "utf8"));
    const r = await db.query<{ public: boolean }>("select public from storage.buckets where id = 'loyalsum-releases'");
    expect(r.rows[0].public).toBe(false);
  });

  it("ingen policy nævner spanden", async () => {
    const r = await db.query<{ n: number }>(
      "select count(*)::int as n from pg_policies where schemaname = 'storage' and (coalesce(qual, '') || coalesce(with_check, '')) like '%loyalsum-releases%'",
    );
    expect(r.rows[0].n).toBe(0);
  });
});
