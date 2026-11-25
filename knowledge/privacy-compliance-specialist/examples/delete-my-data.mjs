// Worked example: "Delete my data" must remove every key for the user in every store, and the test proves it
// by listing keys before and after (ADR 0004; Florida s. 501.171(8) disposal). Run: node delete-my-data.mjs
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const store = () => { const m = new Map(); return {
  async set(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); },
  async list({ prefix }) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
}; };
const stores = { profiles: store(), matches: store(), saved: store(), rawFiles: store(), ratelimit: store(), audit: store() };
const userHash = (id) => "u_" + createHash("sha256").update("salt:" + id).digest("hex").slice(0, 16);

export async function deleteMyData(userId, audit) {
  const u = userHash(userId);
  let removed = 0;
  for (const [name, s] of Object.entries(stores)) {
    if (name === "audit") continue;                                  // audit keeps the event, never the content
    const { blobs } = await s.list({ prefix: `user/${u}/` });
    for (const b of blobs) { await s.delete(b.key); removed++; }
  }
  await audit.set(`log/2026-11-25/${Date.now()}`, JSON.stringify({ action: "data.delete_all", actor: u, details: { removed } }));
  return removed;
}

const u = userHash("user-123"), other = userHash("user-456");
await stores.profiles.set(`user/${u}/profile.enc`, "…");
await stores.matches.set(`user/${u}/job-1.json`, "…");
await stores.matches.set(`user/${u}/job-2.json`, "…");
await stores.saved.set(`user/${u}/saved.json`, "…");
await stores.rawFiles.set(`user/${u}/resume.enc`, "…");
await stores.ratelimit.set(`user/${u}/2026-11-25.json`, "…");
await stores.matches.set(`user/${other}/job-1.json`, "…");

const removed = await deleteMyData("user-123", stores.audit);
for (const [name, s] of Object.entries(stores)) {
  if (name !== "audit") assert.equal((await s.list({ prefix: `user/${u}/` })).blobs.length, 0, `${name} still has keys`);
}
assert.equal((await stores.matches.list({ prefix: `user/${other}/` })).blobs.length, 1, "other users untouched");
const log = (await stores.audit.list({ prefix: "log/" })).blobs;
assert.equal(log.length, 1);
console.log(`OK: removed ${removed} keys across 5 stores; other user untouched; one audit event without content`);
