// Worked example: a complete, deterministic implementation of scoring model D with gates, redistribution and bands.
// Profile and job are SYNTHETIC, modelled on a real Orlando posting pattern (Senior Financial Analyst, 4–6 yrs, bachelor, CPA preferred).
// Run: node score-match.mjs
import assert from "node:assert/strict";

const W = { reqSkills: 30, experience: 20, education: 10, certs: 10, industry: 10, prefSkills: 10, title: 5, location: 5 };
const DEG = { none: 0, high_school: 1, associate: 2, bachelor: 3, master: 4, mba: 4, doctorate: 5 };
const RELATED = { excel_advanced: { financial_modeling: 0.5 }, fpa: { forecasting: 0.8, budgeting: 0.8, variance_analysis: 0.6 }, adaptive_planning: { anaplan: 0.6, hyperion: 0.6 } };
const rel = (a, b) => RELATED[a]?.[b] ?? RELATED[b]?.[a] ?? 0;

function skillScore(required, profile) {
  if (!required.length) return null;
  const best = (s) => profile.skills.includes(s) ? (profile.quantified.includes(s) ? 1 : 0.85) : Math.max(0, ...profile.skills.map((p) => rel(p, s)));
  return required.reduce((a, s) => a + best(s), 0) / required.length;
}
function experienceScore(y, band) {
  if (!band) return null; const [min, max] = band;
  if (y < min) return Math.max(0, 1 - (min - y) / min) ** 1.5;
  return y > max + 3 ? 0.85 : 1;
}
function educationScore(p, req) {
  if (!req) return null; const gap = DEG[req.minDegree] - DEG[p.degree];
  if (gap <= 0) return req.fields?.length && !req.fields.includes(p.field) ? 0.8 : 1;
  if (gap === 1) return req.equivalentExperienceAllowed && p.years >= (req.equivalentYears ?? 99) ? 0.8 : 0.3;
  return 0;
}
function certScore(p, req, pref) {
  if (!req.length && !pref.length) return null;
  const v = (c) => (p.certs[c] === "earned" ? 1 : p.certs[c] === "in_progress" ? 0.5 : 0);
  const avg = (xs) => xs.reduce((a, c) => a + v(c), 0) / xs.length;
  let s = req.length && pref.length ? 0.7 * avg(req) + 0.3 * avg(pref) : avg(req.length ? req : pref);
  if (["CPA", "CFA"].some((c) => p.certs[c] === "earned" && !req.includes(c) && !pref.includes(c))) s += 0.1;
  return Math.min(1, s);
}
const titleScore = (job, cand) => { if (!job) return null; const g = job - cand; return g === 0 || g === 1 ? 1 : g === 2 ? 0.6 : g === -1 ? 0.7 : 0.3; };
const industryScore = (job, p) => !job ? null : p.industries.includes(job) ? 1 : p.domainKeywords.some((k) => p.keywordHits.includes(k)) ? 0.5 : 0.2;
const locationScore = (job, p) => job.arrangement === "remote" ? 1 : p.inMsa ? (p.prefers.includes(job.arrangement) ? 1 : 0.4) : p.willRelocate ? 0.6 : 0;

export function scoreMatch(p, j) {
  const sub = {
    reqSkills: skillScore(j.requiredSkills, p), experience: experienceScore(p.relevantYears, j.yearsBand),
    education: educationScore(p, j.education), certs: certScore(p, j.requiredCerts, j.preferredCerts),
    industry: industryScore(j.industry, p), prefSkills: skillScore(j.preferredSkills, p),
    title: titleScore(j.seniority, p.seniority), location: locationScore(j, p),
  };
  const active = Object.keys(W).filter((k) => sub[k] !== null);
  const raw = (100 * active.reduce((a, k) => a + W[k] * sub[k], 0)) / active.reduce((a, k) => a + W[k], 0);
  const gates = (j.hardGates ?? []).map((g) => {
    if (g.type === "clearance" && !p.clearance) return { ...g, passed: false, cap: p.citizen ? 69 : 40 };
    if (g.type === "license" && p.certs[g.value] !== "earned") return { ...g, passed: false, cap: 59 };
    return { ...g, passed: true };
  });
  const score = Math.round(Math.min(raw, ...gates.filter((g) => !g.passed).map((g) => g.cap), 100));
  return { score, band: score >= 80 ? "green" : score >= 60 ? "yellow" : "red", weightsVersion: "D-1.0", subScores: Object.fromEntries(Object.entries(sub).map(([k, v]) => [k, { value: v, weight: W[k], active: v !== null }])), gates };
}

const profile = { skills: ["excel_advanced", "fpa", "variance_analysis", "adaptive_planning", "sql"], quantified: ["fpa", "excel_advanced"],
  relevantYears: 7.0, degree: "bachelor", field: "finance", years: 7.5, certs: { CFA: "in_progress" }, industries: ["hospitality"],
  domainKeywords: [], keywordHits: [], seniority: 3, inMsa: true, prefers: ["hybrid", "onsite"], willRelocate: false, clearance: null, citizen: true };
const job = { requiredSkills: ["excel_advanced", "fpa", "forecasting"], preferredSkills: ["anaplan", "power_bi"], yearsBand: [4, 6],
  education: { minDegree: "bachelor", fields: ["finance", "accounting"], equivalentExperienceAllowed: true }, requiredCerts: [], preferredCerts: ["CPA"],
  industry: "hospitality", seniority: 3, arrangement: "hybrid", hardGates: [] };

const a = scoreMatch(profile, job);
const b = scoreMatch(profile, job);
assert.deepEqual(a, b, "deterministic");
assert.equal(a.band, "green");
const withGate = scoreMatch(profile, { ...job, hardGates: [{ type: "clearance", value: "secret", quote: "Active Secret Clearance" }] });
assert.equal(withGate.score, 69); assert.equal(withGate.band, "yellow");
const more = scoreMatch({ ...profile, skills: [...profile.skills, "power_bi"] }, job);
assert.ok(more.score >= a.score, "adding a matched skill never lowers the score");
const noEdu = scoreMatch(profile, { ...job, education: undefined });
assert.equal(noEdu.subScores.education.active, false, "unstated criterion redistributed");
console.log(JSON.stringify({ score: a.score, band: a.band, sub: Object.fromEntries(Object.entries(a.subScores).map(([k, v]) => [k, v.value === null ? null : +v.value.toFixed(2)])) }));
console.log(`OK: score ${a.score} (green); with Secret-clearance gate → ${withGate.score} (yellow); deterministic and monotonic`);
