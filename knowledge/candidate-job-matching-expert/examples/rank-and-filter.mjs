// Worked example: default ranking and filter semantics for the Matches list (skill: search-ranking).
// Run: node rank-and-filter.mjs
import assert from "node:assert/strict";

const jobs = [
  { id: "a", score: 86, gateFailed: false, postedAt: "2026-11-20", salary: { min: 90000, max: 110000 }, arrangement: "hybrid", minYears: 4 },
  { id: "b", score: 86, gateFailed: false, postedAt: "2026-11-22", salary: null, arrangement: "onsite", minYears: 5 },
  { id: "c", score: 74, gateFailed: true, postedAt: "2026-11-23", salary: { min: 100000, max: 110000 }, arrangement: "hybrid", minYears: 5 },
  { id: "d", score: 74, gateFailed: false, postedAt: "2026-11-01", salary: { min: 60000, max: 70000 }, arrangement: "remote", minYears: 2 },
  { id: "e", score: 55, gateFailed: false, postedAt: "2026-11-24", salary: null, arrangement: "remote", minYears: 8 },
];
const band = (s) => (s >= 80 ? 2 : s >= 60 ? 1 : 0);
export const rank = (xs) => [...xs].sort((x, y) => y.score - x.score || (band(x.score) === band(y.score) ? Number(x.gateFailed) - Number(y.gateFailed) : 0) || y.postedAt.localeCompare(x.postedAt) || Number(!!y.salary) - Number(!!x.salary) || x.id.localeCompare(y.id));
export function filter(xs, f) {
  return xs.filter((j) =>
    (!f.minScore || j.score >= f.minScore) &&
    (!f.arrangements?.length || f.arrangements.includes(j.arrangement)) &&
    (!f.salaryMin || (j.salary ? j.salary.max >= f.salaryMin : f.includeUnknownSalary)) &&
    (!f.level || (f.level === "mid" ? j.minYears >= 3 && j.minYears <= 5 : true)));
}
assert.deepEqual(rank(jobs).map((j) => j.id), ["b", "a", "d", "c", "e"]);
assert.deepEqual(filter(rank(jobs), { arrangements: ["hybrid", "remote"], salaryMin: 95000, includeUnknownSalary: true }).map((j) => j.id), ["a", "c", "e"]);
assert.deepEqual(filter(rank(jobs), { minScore: 60, level: "mid" }).map((j) => j.id), ["b", "a", "c"]);
console.log("OK: ties broken by gate, recency, salary presence, id; filters combine AND across groups, OR within");
