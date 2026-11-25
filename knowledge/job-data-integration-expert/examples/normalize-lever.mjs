// Worked example: normalize a REAL Lever Postings API response (fixture) to NormalizedJob.
// Run: node normalize-lever.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

export function normalizeLever(p, employerId) {
  const salary = p.salaryRange
    ? { min: p.salaryRange.min, max: p.salaryRange.max, period: p.salaryRange.interval === "per-year-salary" ? "YEAR" : "HOUR", currency: p.salaryRange.currency, source: "posted" }
    : undefined;
  const lists = (p.lists ?? []).map((l) => `${l.text}\n${l.content}`).join("\n");
  return {
    id: `lever:${employerId}:${p.id}`,
    source: "lever",
    employerId,
    requisitionId: p.id,
    title: p.text,
    locations: p.categories?.allLocations ?? [p.categories?.location].filter(Boolean),
    workArrangement: ["onsite", "hybrid", "remote"].includes(p.workplaceType) ? p.workplaceType : "unknown",
    salary,
    postedAt: new Date(p.createdAt).toISOString(), // createdAt is epoch MILLISECONDS
    applyUrl: p.applyUrl ?? p.hostedUrl,
    descriptionText: `${p.descriptionPlain ?? ""}\n${lists}`.trim(),
  };
}

const fixture = JSON.parse(readFileSync(new URL("./fixtures/lever-postings.json", import.meta.url)));
const jobs = fixture.postings.map((p) => normalizeLever(p, "leverdemo"));
assert.equal(jobs[0].workArrangement, "hybrid");
assert.deepEqual(jobs[0].salary, { min: 85000, max: 175000, period: "YEAR", currency: "USD", source: "posted" });
assert.ok(jobs[0].postedAt.startsWith("2026-"), "ms timestamp converted correctly");
assert.ok(jobs[0].descriptionText.includes("3+ years"), "requirements from lists[] included");
assert.equal(jobs[1].salary, undefined);
console.log(JSON.stringify({ ...jobs[0], descriptionText: jobs[0].descriptionText.slice(0, 60) + "…" }, null, 2));
console.log(`OK: normalized ${jobs.length} real Lever postings; first postedAt=${jobs[0].postedAt}`);
