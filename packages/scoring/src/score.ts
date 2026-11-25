// Model D scoring (docs/match-scoring.md). Pure and deterministic: same inputs, same score.
import { bandFor, type CandidateProfile, type Job, type MatchResult } from "../../schemas/src/index.ts";
import { extractRequirements, isRequiredText, type JobRequirements } from "./requirements.ts";
import { containsPhrase, indexTaxonomy, normalize, relatedWeight, resolveTerm, type TaxonomyIndex } from "./taxonomy.ts";
import {
  WEIGHTS_VERSION,
  type CriterionKey,
  type Gate,
  type MissingItem,
  type ScoreDetail,
  type SubScore,
  type Taxonomy,
} from "./types.ts";

export const WEIGHTS: Record<CriterionKey, number> = {
  reqSkills: 30,
  experience: 20,
  education: 10,
  certs: 10,
  prefSkills: 10,
  title: 5,
};
// Industry (10) and location (5) are always dropped: CandidateProfile carries neither.
// Their weight is redistributed (match-scoring.md 3.8), so no candidate is penalised for it.

const LICENSES = new Set(["cpa", "series_7", "series_65", "series_66"]);
const STRONG_CERTS = new Set(["cpa", "cfa"]);
const FIELD_WORDS = ["finance", "accounting", "economics", "business", "accountancy"];
const IN_PROGRESS = /\b(in progress|candidate|pursuing|eligible|expected)\b/i;

type Candidate = {
  skillKeys: Set<string>;
  skillIds: Set<string>;
  certs: Map<string, 1 | 0.5>;
  eduLevel: number;
  fieldOk: boolean;
  seniority: number | null;
  clearance: boolean;
};

function candidateOf(p: CandidateProfile, ix: TaxonomyIndex): Candidate {
  const skillKeys = new Set<string>();
  const skillIds = new Set<string>();
  const certs = new Map<string, 1 | 0.5>();
  const addCert = (id: string, raw: string) => {
    const v = IN_PROGRESS.test(raw) ? 0.5 : 1;
    certs.set(id, Math.max(certs.get(id) ?? 0, v) as 1 | 0.5);
  };
  for (const raw of p.skills) {
    const r = resolveTerm(ix, raw);
    skillKeys.add(r.id);
    if (r.kind === "skill") skillIds.add(r.id);
    if (r.kind === "cert") addCert(r.id, raw);
  }
  for (const raw of p.certifications) {
    const r = resolveTerm(ix, raw);
    if (r.kind === "cert") addCert(r.id, raw);
    else skillKeys.add(r.id);
  }
  let eduLevel = 0;
  let fieldOk = false;
  for (const raw of p.education) {
    const n = normalize(raw);
    for (const e of ix.taxonomy.education) {
      if (e.aliases.some((a) => containsPhrase(n, normalize(a)))) eduLevel = Math.max(eduLevel, e.level);
    }
    if (FIELD_WORDS.some((w) => n.includes(w))) fieldOk = true;
  }
  let seniority: number | null = null;
  for (const raw of p.titles) {
    const n = normalize(raw);
    for (const t of ix.taxonomy.titles) {
      if (t.aliases.some((a) => containsPhrase(n, normalize(a)))) seniority = Math.max(seniority ?? 0, t.seniority);
    }
  }
  const clearance = [...p.skills, ...p.certifications].some((s) => /clearance/i.test(s));
  return { skillKeys, skillIds, certs, eduLevel, fieldOk, seniority, clearance };
}

type TermMatch = { value: number; via: string | null };

function bestMatch(c: Candidate, ix: TaxonomyIndex, id: string, kind: string): TermMatch {
  if (c.skillKeys.has(id)) return { value: 1, via: null };
  if (kind !== "skill") return { value: 0, via: null };
  let best: TermMatch = { value: 0, via: null };
  for (const have of c.skillIds) {
    const w = relatedWeight(ix, have, id);
    if (w > best.value) best = { value: w, via: have };
  }
  return best;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function scoreDetailed(profile: CandidateProfile, job: Job, taxonomy: Taxonomy): ScoreDetail {
  const ix = indexTaxonomy(taxonomy);
  const req: JobRequirements = extractRequirements(job, ix);
  const cand = candidateOf(profile, ix);
  const evidence: string[] = [];
  const missing: MissingItem[] = [];

  // Skills (required / preferred share one formula; 3.1 and 3.6)
  const skillSub = (importance: "required" | "preferred"): number | null => {
    const terms = req.skills.filter((t) => t.importance === importance);
    if (terms.length === 0) return null;
    const values = terms.map((t) => {
      const m = bestMatch(cand, ix, t.id, t.kind);
      if (m.value === 1) evidence.push(`Matched ${importance} skill: ${t.label}`);
      else {
        if (m.via) {
          const have = ix.skillLabel.get(m.via) ?? m.via;
          evidence.push(`Related ${importance} skill: ${have} counts ${m.value} toward ${t.label}`);
        } else evidence.push(`Missing ${importance} skill: ${t.label}`);
        missing.push({ id: t.id, label: t.label, kind: "skill", importance });
      }
      return m.value;
    });
    return avg(values);
  };
  const reqSkills = skillSub("required");
  const prefSkills = skillSub("preferred");

  // Experience (3.2)
  let experience: number | null = null;
  if (req.years) {
    const y = profile.yearsExperience;
    const { min, max } = req.years;
    if (y < min) experience = Math.max(0, 1 - (min - y) / min) ** 1.5;
    else experience = y > max + 3 ? 0.85 : 1;
    const band = Number.isFinite(max) ? `${min}-${max}` : `${min}+`;
    evidence.push(`Experience: ${y} years vs ${band} years posted`);
  }

  // Education (3.3)
  let education: number | null = null;
  if (req.education) {
    const gap = req.education.level - cand.eduLevel;
    if (gap <= 0) education = cand.fieldOk ? 1 : 0.8;
    else if (gap === 1) education = req.education.equivalence && profile.yearsExperience >= 5 ? 0.8 : 0.3;
    else education = 0;
    evidence.push(
      gap <= 0 ? "Education meets the posted level" : `Education is ${gap} level(s) below the posted level`,
    );
  }

  // Certifications (3.4)
  const reqCerts = req.certs.filter((c) => c.importance === "required");
  const prefCerts = req.certs.filter((c) => c.importance === "preferred");
  let certs: number | null = null;
  if (req.certs.length > 0) {
    const val = (id: string) => cand.certs.get(id) ?? 0;
    const note = (importance: "required" | "preferred") => (c: { id: string; label: string }) => {
      const v = val(c.id);
      if (v === 1) evidence.push(`Holds ${importance} certification: ${c.label}`);
      else if (v === 0.5) evidence.push(`In progress ${importance} certification: ${c.label}`);
      else {
        evidence.push(`Missing ${importance} certification: ${c.label}`);
        missing.push({ id: c.id, label: c.label, kind: "cert", importance });
      }
      return v;
    };
    const r = reqCerts.map(note("required"));
    const pr = prefCerts.map(note("preferred"));
    certs = r.length && pr.length ? 0.7 * avg(r) + 0.3 * avg(pr) : avg(r.length ? r : pr);
    const asked = new Set(req.certs.map((c) => c.id));
    if ([...cand.certs].some(([id, v]) => v === 1 && STRONG_CERTS.has(id) && !asked.has(id))) certs = Math.min(1, certs + 0.1);
  }

  // Title (5)
  let title: number | null = null;
  if (req.seniority !== null && cand.seniority !== null) {
    const g = req.seniority - cand.seniority;
    title = g === 0 || g === 1 ? 1 : g === 2 ? 0.6 : g === -1 ? 0.7 : 0.3;
    evidence.push(`Title level: job ${req.seniority}, candidate ${cand.seniority}`);
  }

  const values: Record<CriterionKey, number | null> = { reqSkills, prefSkills, experience, education, certs, title };
  const keys = Object.keys(WEIGHTS) as CriterionKey[];
  const subScores = {} as Record<CriterionKey, SubScore>;
  for (const k of keys) subScores[k] = { value: values[k], weight: WEIGHTS[k], active: values[k] !== null };
  const active = keys.filter((k) => values[k] !== null);
  let raw = 0;
  if (active.length > 0) {
    const wsum = active.reduce((a, k) => a + WEIGHTS[k], 0);
    raw = (100 * active.reduce((a, k) => a + WEIGHTS[k] * (values[k] as number), 0)) / wsum;
  }
  for (const k of active) {
    evidence.push(`Sub-score ${k}: ${(values[k] as number).toFixed(2)} (weight ${WEIGHTS[k]})`);
  }

  // Gates (4). Each stores the posting sentence.
  const gates: Gate[] = [];
  if (req.clearance) {
    gates.push({ type: "clearance", cap: 69, quote: req.clearance, passed: cand.clearance });
  }
  for (const c of reqCerts) {
    if (LICENSES.has(c.id) && c.quote && isRequiredText(c.quote)) {
      gates.push({ type: "license", cap: 59, quote: c.quote, passed: cand.certs.get(c.id) === 1 });
    }
  }
  if (req.education && req.education.required && !req.education.equivalence && isRequiredText(req.education.quote)) {
    gates.push({ type: "degree", cap: 59, quote: req.education.quote, passed: cand.eduLevel >= req.education.level });
  }
  const failed = gates.filter((g) => !g.passed);
  for (const g of failed) evidence.push(`Gate (${g.type}) caps score at ${g.cap}. Posting says: "${g.quote}"`);

  const score = Math.round(Math.min(100, Math.max(0, raw), ...failed.map((g) => g.cap)));
  const gaps = missing.map((m) => ({ skill: m.label, importance: m.importance }));
  const recommendation = recommend(score, failed, missing);
  const result: MatchResult = {
    jobId: job.id,
    score,
    band: bandFor(score),
    evidence,
    gaps,
    explanation: explain(job, score, evidence, missing, failed),
    recommendation,
  };
  return { result, rawScore: raw, subScores, gates, missing, weightsVersion: WEIGHTS_VERSION, taxonomyVersion: taxonomy.version };
}

export function score(profile: CandidateProfile, job: Job, taxonomy: Taxonomy): MatchResult {
  return scoreDetailed(profile, job, taxonomy).result;
}

function recommend(scoreValue: number, failed: Gate[], missing: MissingItem[]): MatchResult["recommendation"] {
  const missingRequired = missing.filter((m) => m.importance === "required").length;
  if (failed.some((g) => g.cap <= 59)) {
    return { action: "skip", text: "A stated requirement is missing. Look for roles without it for now." };
  }
  if (failed.length > 0) {
    return { action: "stretch", text: "Strong overall, but a stated requirement is missing. Apply only if you can address it." };
  }
  if (scoreValue >= 80) return { action: "apply", text: "Apply now. Your resume fits this role closely." };
  if (scoreValue >= 60 && missingRequired <= 2) {
    return { action: "tailor", text: "Apply with a tailored resume. Lead with the matched skills." };
  }
  if (scoreValue >= 45) return { action: "stretch", text: "This is a stretch. Close the main gaps before applying." };
  return { action: "skip", text: "Skip for now. The gaps are large." };
}

/** Template text built only from evidence. No model involved (skill: match-explanations). */
function explain(job: Job, scoreValue: number, evidence: string[], missing: MissingItem[], failed: Gate[]): string {
  const band = bandFor(scoreValue);
  const matched = evidence.filter((e) => e.startsWith("Matched ")).map((e) => e.replace(/^Matched \w+ skill: /, ""));
  const parts = [`${job.title} at ${job.company}: ${scoreValue}/100 (${band}).`];
  if (matched.length) parts.push(`You match on ${matched.slice(0, 3).join(", ")}.`);
  const req = missing.filter((m) => m.importance === "required").map((m) => m.label);
  if (req.length) parts.push(`Missing required: ${req.slice(0, 3).join(", ")}.`);
  for (const g of failed) parts.push(`Posting requires: "${g.quote}"`);
  return parts.join(" ");
}
