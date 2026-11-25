// Worked example: claim checks run after supabase.auth.getClaims(token) (skill: supabase-auth).
// getClaims verifies the signature; we still check iss, exp and role ourselves. No network, fixture claims only.
// Source: https://supabase.com/docs/guides/auth/jwts (read 2026-11-25). The aud claim is unconfirmed, so it is optional here.
// Run: node token-claims.mjs
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

export function checkClaims(claims, { issuer, now, audience }) {
  if (!claims || typeof claims !== "object") return { ok: false, reason: "no_claims" };
  if (typeof claims.sub !== "string" || claims.sub === "") return { ok: false, reason: "no_sub" };
  if (claims.iss !== issuer) return { ok: false, reason: "bad_issuer" };
  if (typeof claims.exp !== "number" || !(claims.exp > now)) return { ok: false, reason: "expired" };
  if (claims.role !== "authenticated") return { ok: false, reason: "bad_role_claim" };
  if (audience !== undefined && claims.aud !== audience) return { ok: false, reason: "bad_audience" };
  return { ok: true };
}

function selfTest() {
  const issuer = "https://example-project.supabase.co/auth/v1";
  const now = 1_800_000_000;
  const good = { sub: "11111111-1111-4111-8111-111111111111", iss: issuer, exp: now + 300, role: "authenticated" };
  assert.deepEqual(checkClaims(good, { issuer, now }), { ok: true });
  assert.equal(checkClaims({ ...good, exp: now }, { issuer, now }).reason, "expired");
  assert.equal(checkClaims({ ...good, exp: now - 1 }, { issuer, now }).reason, "expired");
  assert.equal(checkClaims({ ...good, exp: "9999999999" }, { issuer, now }).reason, "expired");
  const { exp, ...noExp } = good;
  assert.equal(checkClaims(noExp, { issuer, now }).reason, "expired");
  assert.equal(checkClaims({ ...good, iss: "https://evil.example/auth/v1" }, { issuer, now }).reason, "bad_issuer");
  assert.equal(checkClaims({ ...good, role: "anon" }, { issuer, now }).reason, "bad_role_claim");
  assert.equal(checkClaims({ ...good, role: "service_role" }, { issuer, now }).reason, "bad_role_claim");
  assert.equal(checkClaims({ ...good, sub: "" }, { issuer, now }).reason, "no_sub");
  assert.equal(checkClaims(null, { issuer, now }).reason, "no_claims");
  assert.equal(checkClaims({ ...good, aud: "x" }, { issuer, now, audience: "y" }).reason, "bad_audience");
  console.log("OK: token-claims rejects expired, wrong issuer, non-authenticated role and missing sub");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) selfTest();
