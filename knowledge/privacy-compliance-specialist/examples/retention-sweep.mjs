// Worked example: the daily retention sweep decision table (skill: privacy-and-data-protection).
// Pure function: given records and "now", decide what to delete. Run: node retention-sweep.mjs
import assert from "node:assert/strict";

const DAY = 86_400_000;
const RULES = {
  rawResume: (r, now) => !r.optIn || now - r.uploadedAt > 30 * DAY,             // default: delete after parse
  profile: (r, now) => now - r.lastSignInAt > 365 * DAY,                         // 12 months inactive
  match: (r, now, ctx) => !ctx.profiles.has(r.userHash),                         // follows the profile
  job: (r, now) => r.closedAt !== null && now - r.closedAt > 30 * DAY,           // 30 days after close
  agentChat: (r, now) => now - r.createdAt > 90 * DAY,
  audit: (r, now) => now - r.ts > 365 * DAY,
};

export function sweep(records, now) {
  const profilesKept = new Set(records.filter((r) => r.kind === "profile" && !RULES.profile(r, now)).map((r) => r.userHash));
  return records.filter((r) => RULES[r.kind](r, now, { profiles: profilesKept })).map((r) => r.key);
}

const now = Date.parse("2026-11-25T00:00:00Z");
const ago = (d) => now - d * DAY;
const records = [
  { key: "raw/u1", kind: "rawResume", optIn: false, uploadedAt: ago(0) },
  { key: "raw/u2", kind: "rawResume", optIn: true, uploadedAt: ago(10) },
  { key: "raw/u3", kind: "rawResume", optIn: true, uploadedAt: ago(31) },
  { key: "profile/u4", kind: "profile", userHash: "u4", lastSignInAt: ago(400) },
  { key: "profile/u5", kind: "profile", userHash: "u5", lastSignInAt: ago(3) },
  { key: "match/u4/j1", kind: "match", userHash: "u4" },
  { key: "match/u5/j1", kind: "match", userHash: "u5" },
  { key: "job/j9", kind: "job", closedAt: ago(45) },
  { key: "job/j1", kind: "job", closedAt: null },
  { key: "chat/c1", kind: "agentChat", createdAt: ago(91) },
  { key: "audit/a1", kind: "audit", ts: ago(200) },
];
const toDelete = sweep(records, now);
assert.deepEqual(toDelete.sort(), ["chat/c1", "job/j9", "match/u4/j1", "profile/u4", "raw/u1", "raw/u3"].sort());
console.log({ toDelete });
console.log(`OK: ${toDelete.length} of ${records.length} records due for deletion; opted-in recent file, active profile, open job and recent audit kept`);
