// Static checks on the profiles migration and auth client code. A live RLS test on a dev
// project is still required (another user's row invisible, role update denied, anon reads nothing).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain .mjs example without types
import { checkSql } from "../../knowledge/supabase-auth-engineer/examples/profiles-rls-check.mjs";

const root = join(__dirname, "..", "..");
const migration = readFileSync(join(root, "supabase/migrations/20261125000000_profiles.sql"), "utf8");
const reference = readFileSync(join(root, "knowledge/supabase-auth-engineer/examples/profiles-rls.sql"), "utf8");
const body = (sql: string) =>
  sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("--") && l.trim() !== "")
    .join("\n");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe("profiles migration", () => {
  it("passes the RLS self-check", () => {
    expect(checkSql(migration)).toEqual([]);
  });

  it("keeps the reviewed reference SQL unchanged", () => {
    expect(body(migration)).toBe(body(reference));
  });

  it("grants no write path to anon or authenticated", () => {
    const sql = body(migration).toLowerCase();
    expect(sql).not.toMatch(/grant[^;]*(insert|update|delete|all)[^;]*on public\.profiles/);
    expect(sql).not.toMatch(/for (insert|update|delete|all)/);
  });

  it("never reads metadata for roles", () => {
    expect(migration).not.toMatch(/user_metadata|raw_user_meta_data|raw_app_meta_data/);
  });
});

describe("auth client code", () => {
  const files = [...walk(join(root, "apps/web/src/auth")), ...walk(join(root, "supabase"))];

  it("contains no secret key or service_role", () => {
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      // The only allowed mentions are the guard that refuses such a key and the docs that ban it.
      const stripped = text.replace(/startsWith\("sb_secret_"\)/g, "").replace(/`sb_secret_\.\.\.`/g, "");
      expect(stripped, f).not.toMatch(/sb_secret_[A-Za-z0-9]/);
      expect(text, f).not.toMatch(/service_role_key|SUPABASE_SERVICE_ROLE/i);
    }
  });

  it("reads role from profiles, never user_metadata", () => {
    const provider = readFileSync(join(root, "apps/web/src/auth/AuthProvider.tsx"), "utf8");
    expect(provider).toMatch(/from\("profiles"\)\.select\("role"\)/);
    expect(provider).not.toMatch(/user_metadata\s*\??\.\s*role|user_metadata\[["']role/);
  });

  it("uses PKCE and only public env vars", () => {
    const client = readFileSync(join(root, "apps/web/src/auth/supabase.ts"), "utf8");
    expect(client).toMatch(/flowType: "pkce"/);
    const envs = [...client.matchAll(/import\.meta\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]).sort();
    expect([...new Set(envs)]).toEqual(["MODE", "VITE_E2E_AUTH_STUB", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_URL"]);
  });
});
