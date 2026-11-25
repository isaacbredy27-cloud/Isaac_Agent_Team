// Worked example: monthly cost of job-requirement extraction on claude-opus-5-5, with and without prompt caching.
// Prices from the models overview and prompt-caching docs (read 2026-11-25): $4 / $20 per MTok;
// 5-minute cache write = 1.25× input; cache read = 5% of input on Opus 5.5. Run: node cache-cost.mjs
import assert from "node:assert/strict";

const P = { input: 4 / 1e6, output: 20 / 1e6, write: (4 * 1.25) / 1e6, read: (4 * 0.05) / 1e6 };
export function monthlyCost({ jobs, systemTokens, postingTokens, outputTokens, cached, batchesPerMonth }) {
  const out = jobs * outputTokens * P.output;
  if (!cached) return jobs * (systemTokens + postingTokens) * P.input + out;
  // one cache write per batch run (the 5-minute window covers a batch); every other call reads
  const writes = batchesPerMonth * systemTokens * P.write;
  const reads = Math.max(0, jobs - batchesPerMonth) * systemTokens * P.read;
  return writes + reads + jobs * postingTokens * P.input + out;
}
const base = { jobs: 1300, systemTokens: 3000, postingTokens: 1500, outputTokens: 800, batchesPerMonth: 360 }; // ~300 jobs/week, runs every 2 h
const uncached = monthlyCost({ ...base, cached: false });
const cached = monthlyCost({ ...base, cached: true });
assert.ok(cached < uncached);
console.log({ uncachedUSD: +uncached.toFixed(2), cachedUSD: +cached.toFixed(2), savedPct: +((1 - cached / uncached) * 100).toFixed(1) });
console.log(`OK: caching the 3k-token system prompt cuts monthly extraction cost from $${uncached.toFixed(2)} to $${cached.toFixed(2)}`);
