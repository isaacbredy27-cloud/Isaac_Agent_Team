// Worked example: requireRole for a Netlify Function, on already-decoded claims (skill: supabase-auth).
// Role comes from the profiles row (read under RLS with the user's token), never from user_metadata.
// super_admin routes need aal2. Approve also needs step-up: amr[0] is totp and not older than 600 s.
// Sources: https://supabase.com/docs/guides/auth/auth-mfa and /guides/database/postgres/row-level-security (read 2026-11-25).
// Run: node require-role.mjs
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { checkClaims } from "./token-claims.mjs";

const ROLES = new Set(["user", "super_admin"]);
const STEP_UP_WINDOW_SEC = 600;
const FUTURE_SKEW_SEC = 30;
const deny = (status, reason) => ({ ok: false, status, reason });

/** claims: output of getClaims. profile: row from public.profiles. allow: roles that may pass. */
export function requireRole({ claims, profile, allow, issuer, now, requireAal2 = false, requireStepUp = false }) {
  const c = checkClaims(claims, { issuer, now });
  if (!c.ok) return deny(401, c.reason);
  // user_metadata is user-editable: it is never read for authorization, whatever it says.
  if (!profile || typeof profile.role !== "string") return deny(403, "role_not_in_profile");
  if (profile.id !== claims.sub) return deny(403, "profile_mismatch");
  if (!ROLES.has(profile.role)) return deny(403, "unknown_role");
  if (!allow.includes(profile.role)) return deny(403, "role_not_allowed");
  if (requireAal2 || requireStepUp) {
    if (claims.aal !== "aal2") return deny(403, "aal2_required"); // no aal claim means aal1
  }
  if (requireStepUp) {
    const first = Array.isArray(claims.amr) ? claims.amr[0] : undefined;
    if (!first || first.method !== "totp" || typeof first.timestamp !== "number") return deny(403, "step_up_required");
    const age = now - first.timestamp;
    if (age < -FUTURE_SKEW_SEC) return deny(403, "step_up_invalid");
    if (age > STEP_UP_WINDOW_SEC) return deny(403, "step_up_stale");
  }
  return { ok: true, role: profile.role, userId: claims.sub };
}

function selfTest() {
  const issuer = "https://example-project.supabase.co/auth/v1";
  const now = 1_800_000_000;
  const id = "22222222-2222-4222-8222-222222222222";
  const base = { sub: id, iss: issuer, exp: now + 300, role: "authenticated", aal: "aal1", amr: [{ method: "password", timestamp: now - 60 }] };
  const mfa = { ...base, aal: "aal2", amr: [{ method: "totp", timestamp: now - 120 }, { method: "password", timestamp: now - 180 }] };
  const admin = { id, role: "super_admin" }, user = { id, role: "user" };
  const run = (o) => requireRole({ issuer, now, allow: ["user", "super_admin"], ...o });
  const admins = { allow: ["super_admin"], requireAal2: true };

  // token problems are 401
  assert.deepEqual(run({ claims: null, profile: user }), { ok: false, status: 401, reason: "no_claims" });
  assert.equal(run({ claims: { ...base, exp: now - 5 }, profile: user }).status, 401);
  assert.equal(run({ claims: { ...base, iss: "https://evil.example/auth/v1" }, profile: user }).status, 401);
  assert.equal(run({ claims: { ...base, role: "anon" }, profile: user }).status, 401);

  // plain user route
  assert.deepEqual(run({ claims: base, profile: user }), { ok: true, role: "user", userId: id });

  // 403: role not allowed, missing or odd profile
  assert.equal(run({ claims: base, profile: user, ...admins }).reason, "role_not_allowed");
  assert.equal(run({ claims: base, profile: null, ...admins }).reason, "role_not_in_profile");
  assert.equal(run({ claims: base, profile: { id }, ...admins }).reason, "role_not_in_profile");
  assert.equal(run({ claims: base, profile: { id, role: "admin" }, ...admins }).reason, "unknown_role");
  assert.equal(run({ claims: base, profile: { id: "someone-else", role: "super_admin" }, ...admins }).reason, "profile_mismatch");

  // user_metadata / app_metadata role claims are ignored: the profile row decides
  const forged = { ...mfa, user_metadata: { role: "super_admin" }, app_metadata: { role: "super_admin" } };
  assert.equal(run({ claims: forged, profile: user, ...admins }).reason, "role_not_allowed");
  assert.equal(run({ claims: forged, profile: { id }, ...admins }).reason, "role_not_in_profile");

  // super_admin needs aal2
  assert.equal(run({ claims: base, profile: admin, ...admins }).reason, "aal2_required");
  assert.equal(run({ claims: { ...base, aal: undefined }, profile: admin, ...admins }).reason, "aal2_required");
  assert.equal(run({ claims: mfa, profile: admin, ...admins }).ok, true);

  // Approve: step-up recency
  const approve = { ...admins, requireStepUp: true };
  assert.equal(run({ claims: mfa, profile: admin, ...approve }).ok, true);
  const at = (ts, method = "totp", aal = "aal2") => ({ ...mfa, aal, amr: [{ method, timestamp: ts }] });
  assert.equal(run({ claims: at(now - 600), profile: admin, ...approve }).ok, true); // boundary: exactly 600 s
  assert.equal(run({ claims: at(now - 601), profile: admin, ...approve }).reason, "step_up_stale");
  assert.equal(run({ claims: at(now + 3600), profile: admin, ...approve }).reason, "step_up_invalid");
  assert.equal(run({ claims: at(now - 10, "password"), profile: admin, ...approve }).reason, "step_up_required");
  assert.equal(run({ claims: { ...mfa, amr: [] }, profile: admin, ...approve }).reason, "step_up_required");
  assert.equal(run({ claims: { ...mfa, amr: undefined }, profile: admin, ...approve }).reason, "step_up_required");
  assert.equal(run({ claims: at(now - 10, "totp", "aal1"), profile: admin, ...approve }).reason, "aal2_required");
  // an older totp entry behind a newer password entry does not count
  const stale = { ...mfa, amr: [{ method: "password", timestamp: now - 5 }, { method: "totp", timestamp: now - 20 }] };
  assert.equal(run({ claims: stale, profile: admin, ...approve }).reason, "step_up_required");

  console.log("OK: requireRole enforces profile role, aal2 and 600 s step-up; ignores user_metadata roles");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) selfTest();
