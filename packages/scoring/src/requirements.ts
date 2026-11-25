// Derives job requirements from Job fields (skills[] + description). Deterministic regex rules.
import type { Job } from "../../schemas/src/index.ts";
import type { Importance } from "./types.ts";
import { containsPhrase, normalize, resolveTerm, type Resolved, type TaxonomyIndex } from "./taxonomy.ts";

export type JobTerm = Resolved & { importance: Importance; quote: string | null };

export type JobRequirements = {
  skills: JobTerm[]; // kind skill or unknown
  certs: JobTerm[];
  years: { min: number; max: number } | null;
  education: { level: number; required: boolean; equivalence: boolean; quote: string } | null;
  seniority: number | null;
  clearance: string | null;
};

const PREFERRED = /\b(prefer(red)?|desired|nice to have|a plus|bonus|ideally)\b/i;
const REQUIRED = /\b(required|requires|must|mandatory)\b/i;
const EQUIV = /\b(or equivalent|equivalent (work )?experience|in lieu of)\b/i;
const GATE_WORDING = /\b(active|current|must hold|required)\b/i;
const SOFT_WORDING = /\b(obtain|eligible|sponsor)/i;
const CLEARANCE = /\b(top secret|ts\/sci|secret|public trust)\b[^.;]{0,30}\bclearance\b|\bclearance\b[^.;]{0,20}\b(required|active)\b/i;

export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.;!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function importanceOf(term: string, alsoAliases: string[], sents: string[]): { importance: Importance; quote: string | null } {
  const keys = [normalize(term), ...alsoAliases].filter(Boolean);
  const hits = sents.filter((s) => {
    const n = normalize(s);
    return keys.some((k) => containsPhrase(n, k));
  });
  if (hits.length === 0) return { importance: "required", quote: null };
  const pref = hits.some((s) => PREFERRED.test(s));
  const req = hits.some((s) => REQUIRED.test(s) && !PREFERRED.test(s));
  if (pref && !req) return { importance: "preferred", quote: hits.find((s) => PREFERRED.test(s)) ?? null };
  return { importance: "required", quote: hits.find((s) => REQUIRED.test(s)) ?? hits[0] ?? null };
}

export function extractRequirements(job: Job, ix: TaxonomyIndex): JobRequirements {
  const sents = sentences(job.description);
  const skills: JobTerm[] = [];
  const certs: JobTerm[] = [];
  const seen = new Set<string>();
  for (const raw of job.skills) {
    const r = resolveTerm(ix, raw);
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    const aliases =
      r.kind === "skill"
        ? ix.taxonomy.skills.find((s) => s.id === r.id)?.aliases.map(normalize) ?? []
        : r.kind === "cert"
          ? ix.taxonomy.certifications.find((c) => c.id === r.id)?.aliases.map(normalize) ?? []
          : [];
    const imp = importanceOf(raw, aliases, sents);
    (r.kind === "cert" ? certs : skills).push({ ...r, ...imp });
  }

  let years: JobRequirements["years"] = null;
  const band = /(\d{1,2})\s*(?:-|to|–)\s*(\d{1,2})\s*\+?\s*years/i.exec(job.description);
  const open = /(\d{1,2})\s*(?:\+|plus)?\s*years/i.exec(job.description);
  if (band) years = { min: Number(band[1]), max: Number(band[2]) };
  else if (open) years = { min: Number(open[1]), max: Number.POSITIVE_INFINITY };

  let education: JobRequirements["education"] = null;
  for (const s of sents) {
    const n = normalize(s);
    let level = 0;
    for (const e of ix.taxonomy.education) {
      if (e.aliases.some((a) => containsPhrase(n, normalize(a)))) level = Math.max(level, e.level);
    }
    if (level > 0) {
      education = { level, required: !PREFERRED.test(s), equivalence: EQUIV.test(s), quote: s };
      break;
    }
  }

  const titleN = normalize(job.title);
  let seniority: number | null = null;
  let bestLen = 0;
  for (const t of ix.taxonomy.titles) {
    for (const a of t.aliases) {
      const na = normalize(a);
      if (na.length > bestLen && containsPhrase(titleN, na)) {
        bestLen = na.length;
        seniority = t.seniority;
      }
    }
  }

  // Gate only on firm wording; "obtain / eligible / sponsor" wording is not a gate. Always quote the posting.
  const clearance = sents.find((s) => CLEARANCE.test(s) && GATE_WORDING.test(s) && !SOFT_WORDING.test(s)) ?? null;
  return { skills, certs, years, education, seniority, clearance };
}

export const isPreferredText = (s: string): boolean => PREFERRED.test(s);
export const isRequiredText = (s: string): boolean => REQUIRED.test(s) && !PREFERRED.test(s);
