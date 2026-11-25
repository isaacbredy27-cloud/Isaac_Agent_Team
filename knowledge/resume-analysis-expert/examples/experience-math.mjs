// Worked example: compute total and relevant finance years in CODE (never by the model).
// Merges overlapping positions; counts partial relevance. Run: node experience-math.mjs
import assert from "node:assert/strict";

const months = (ym) => { const [y, m] = ym.split("-").map(Number); return y * 12 + (m - 1); };
export function totalYears(positions, asOf = "2026-11") {
  const spans = positions.map((p) => [months(p.start), months(p.end === "present" ? asOf : p.end) + 1]).sort((a, b) => a[0] - b[0]);
  let total = 0, [cs, ce] = spans[0] ?? [0, 0];
  for (const [s, e] of spans.slice(1)) { if (s <= ce) ce = Math.max(ce, e); else { total += ce - cs; [cs, ce] = [s, e]; } }
  total += ce - cs;
  return Math.round((total / 12) * 10) / 10;
}
export function relevantFinanceYears(positions, asOf = "2026-11") {
  // weight each position by relevance, then merge overlaps conservatively by taking the max weight per month
  const byMonth = new Map();
  for (const p of positions) for (let m = months(p.start); m <= months(p.end === "present" ? asOf : p.end); m++) byMonth.set(m, Math.max(byMonth.get(m) ?? 0, p.relevance));
  return Math.round(([...byMonth.values()].reduce((a, b) => a + b, 0) / 12) * 10) / 10;
}

const positions = [ // from the synthetic resume; note the Jan–Mar 2022 overlap
  { title: "Senior Financial Analyst", start: "2022-01", end: "present", relevance: 1.0 },
  { title: "Staff Accountant", start: "2019-06", end: "2022-03", relevance: 0.8 },  // accountant → FP&A transfer 0.8
];
const t = totalYears(positions), r = relevantFinanceYears(positions);
assert.equal(t, 7.5);            // Jun 2019 – Nov 2026 = 90 months, overlap not double-counted
assert.equal(r, 7.0);            // (31 months × 0.8 + 59 months × 1.0) / 12 = 6.98 → 7.0; overlap counted once at the higher weight
assert.equal(totalYears([{ start: "2020-01", end: "2020-12" }, { start: "2020-06", end: "2021-05" }]), 1.4);
console.log({ totalYearsExperience: t, relevantFinanceYears: r });
console.log("OK: overlapping jobs merged; relevance-weighted finance years computed deterministically");
