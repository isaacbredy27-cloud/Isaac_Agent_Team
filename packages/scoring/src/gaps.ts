import { bandFor, type CandidateProfile, type Job, type MatchResult } from "../../schemas/src/index.ts";
import { scoreDetailed } from "./score.ts";
import { indexTaxonomy, resolveTerm } from "./taxonomy.ts";
import type { SkillGapEntry, Taxonomy } from "./types.ts";

const CERT_LINKS: Record<string, string> = {
  cpa: "https://www.aicpa-cima.com/",
  cma: "https://www.aicpa-cima.com/",
  cfa: "https://www.cfainstitute.org/",
  series_7: "https://www.finra.org/registration-exams-ce/qualification-exams",
  series_65: "https://www.finra.org/registration-exams-ce/qualification-exams",
  series_66: "https://www.finra.org/registration-exams-ce/qualification-exams",
  sie: "https://www.finra.org/registration-exams-ce/qualification-exams",
};

const rank = (b: string) => (b === "Strong" ? 2 : b === "Moderate" ? 1 : 0);

/**
 * Aggregate gaps over the top Strong+Moderate results (Weak jobs are noise).
 * Required counts 2x preferred when ranking ties; what-if re-scores each job with the gap added.
 * Order: bandUpgrades desc, jobsMissing desc, label asc. Returns `show` entries (default 10).
 */
export function skillGaps(
  profile: CandidateProfile,
  results: MatchResult[],
  jobs: Job[],
  taxonomy: Taxonomy,
  opts: { topN?: number; show?: number } = {},
): SkillGapEntry[] {
  const topN = opts.topN ?? 25;
  const show = opts.show ?? 10;
  const ix = indexTaxonomy(taxonomy);
  const byId = new Map(jobs.map((j) => [j.id, j]));
  const top = results
    .filter((r) => r.band !== "Weak")
    .sort((a, b) => b.score - a.score || a.jobId.localeCompare(b.jobId))
    .slice(0, topN);

  const agg = new Map<string, { label: string; kind: "skill" | "cert"; jobs: Job[]; weight: number }>();
  for (const r of top) {
    const job = byId.get(r.jobId);
    if (!job) continue;
    for (const g of r.gaps) {
      const t = resolveTerm(ix, g.skill);
      if (t.kind === "unknown") continue;
      const e = agg.get(t.id) ?? { label: t.label, kind: t.kind, jobs: [], weight: 0 };
      e.jobs.push(job);
      e.weight += g.importance === "required" ? 2 : 1;
      agg.set(t.id, e);
    }
  }

  const rows = [...agg.entries()].map(([id, e]) => {
    const withGap: CandidateProfile =
      e.kind === "cert"
        ? { ...profile, certifications: [...profile.certifications, e.label] }
        : { ...profile, skills: [...profile.skills, e.label] };
    const before = new Map(top.map((r) => [r.jobId, r.band]));
    let upgrades = 0;
    for (const job of e.jobs) {
      const after = scoreDetailed(withGap, job, taxonomy).result;
      if (rank(bandFor(after.score)) > rank(before.get(job.id) ?? "Weak")) upgrades++;
    }
    const entry: SkillGapEntry = {
      gap: e.label,
      kind: e.kind,
      jobsMissing: e.jobs.length,
      bandUpgrades: upgrades,
      link: e.kind === "cert" ? (CERT_LINKS[id] ?? null) : null,
    };
    return { entry, weight: e.weight };
  });
  rows.sort(
    (a, b) =>
      b.entry.bandUpgrades - a.entry.bandUpgrades ||
      b.entry.jobsMissing - a.entry.jobsMissing ||
      b.weight - a.weight ||
      a.entry.gap.localeCompare(b.entry.gap),
  );
  return rows.slice(0, show).map((r) => r.entry);
}
