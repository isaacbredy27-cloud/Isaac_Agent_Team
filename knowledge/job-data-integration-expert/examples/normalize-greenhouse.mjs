// Worked example: normalize a REAL Greenhouse Job Board API response (fixture) to NormalizedJob.
// Run: node normalize-greenhouse.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const toText = (html) => unescape(html).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const ORLANDO_MSA = /\b(orlando|kissimmee|sanford|lake mary|maitland|altamonte springs|winter park|oviedo|apopka|clermont|ocoee|winter garden|lake nona)\b/i;

export function normalizeGreenhouse(job, employerId) {
  const places = (job.location?.name ?? "").split("•").map((p) => p.trim()).filter(Boolean);
  return {
    id: `greenhouse:${employerId}:${job.requisition_id ?? job.id}`,
    source: "greenhouse",
    employerId,
    employerName: job.company_name,
    requisitionId: String(job.requisition_id ?? job.internal_job_id ?? job.id),
    title: job.title.trim(),
    locations: places,
    inOrlandoMsa: places.some((p) => ORLANDO_MSA.test(p)),
    remote: places.some((p) => /remote/i.test(p)),
    postedAt: job.first_published ?? job.updated_at,
    applyUrl: job.absolute_url,
    descriptionText: toText(job.content ?? ""),
  };
}

const fixture = JSON.parse(readFileSync(new URL("./fixtures/greenhouse-board.json", import.meta.url)));
const jobs = fixture.jobs.map((j) => normalizeGreenhouse(j, "figma"));
assert.equal(jobs.length, 2);
assert.ok(jobs[0].applyUrl.startsWith("https://"));
assert.ok(!jobs[0].descriptionText.includes("&lt;"), "content must be unescaped");
assert.ok(!jobs[0].descriptionText.includes("<p>"), "tags must be stripped");
assert.ok(Array.isArray(jobs[0].locations) && jobs[0].locations.length >= 1);
console.log(JSON.stringify({ ...jobs[0], descriptionText: jobs[0].descriptionText.slice(0, 80) + "…" }, null, 2));
console.log(`OK: normalized ${jobs.length} real Greenhouse jobs; inOrlandoMsa=${jobs.map((j) => j.inOrlandoMsa).join(",")}`);
