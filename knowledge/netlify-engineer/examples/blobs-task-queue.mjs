// Worked example: the Blobs-backed task queue with lease, checkpoint and idempotent retry (skill: background-jobs).
// Uses an in-memory store that mimics the Netlify Blobs calls we rely on (getJSON via get(type:"json"), setJSON).
// Run: node blobs-task-queue.mjs
import assert from "node:assert/strict";

function memoryStore() { const m = new Map(); return {
  async get(k, { type } = {}) { const v = m.get(k); return v === undefined ? null : type === "json" ? JSON.parse(v) : v; },
  async setJSON(k, v) { m.set(k, JSON.stringify(v)); },
  async list({ prefix = "" } = {}) { return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
}; }
const tasks = memoryStore();   // real code: getStore({ name: "tasks", consistency: "strong" })

async function enqueue(id, items) { await tasks.setJSON(`task/${id}`, { id, status: "queued", attempt: 0, maxAttempts: 3, items, checkpoint: 0, progress: { done: 0, total: items.length } }); }

async function worker(id, { now, crashAfter = Infinity, processed }) {
  const t = await tasks.get(`task/${id}`, { type: "json" });
  if (!t || ["done", "failed"].includes(t.status)) return "skip";                       // idempotent
  if (t.leaseUntil && new Date(t.leaseUntil) > now) return "leased";                   // another worker owns it
  Object.assign(t, { status: "running", attempt: t.attempt + 1, leaseUntil: new Date(now.getTime() + 14 * 60e3).toISOString() });
  await tasks.setJSON(`task/${id}`, t);
  const start = t.checkpoint;
  for (let i = start; i < t.items.length; i++) {
    if (i - start >= crashAfter) { // simulated crash: Netlify will retry after 1 min
      t.status = t.attempt >= t.maxAttempts ? "failed" : "retrying"; t.leaseUntil = null; await tasks.setJSON(`task/${id}`, t); return "crashed";
    }
    processed.push(t.items[i]);                                        // the unit of work (must be idempotent too)
    t.checkpoint = i + 1; t.progress.done = i + 1; await tasks.setJSON(`task/${id}`, t);   // checkpoint after each unit
  }
  t.status = "done"; t.leaseUntil = null; await tasks.setJSON(`task/${id}`, t); return "done";
}

const processed = [];
await enqueue("t1", ["job-a", "job-b", "job-c", "job-d"]);
const now = new Date("2026-11-25T12:00:00Z");
assert.equal(await worker("t1", { now, crashAfter: 2, processed }), "crashed");
assert.equal(await worker("t1", { now, processed }), "done");                // retry resumes at checkpoint 2
assert.equal(await worker("t1", { now, processed }), "skip");                // duplicate delivery ignored
assert.deepEqual(processed, ["job-a", "job-b", "job-c", "job-d"], "each item processed exactly once");
const final = await tasks.get("task/t1", { type: "json" });
assert.equal(final.attempt, 2);
console.log(final);
console.log("OK: crash → retry resumed from checkpoint; duplicate delivery skipped; no item processed twice");
