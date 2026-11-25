import type { Job, MatchResult } from "../../schemas/src/index.ts";

/** Default order (skill: search-ranking): score desc, gate-free first within a band, postedAt desc, id. */
export function rankResults(results: MatchResult[], jobs: Pick<Job, "id" | "postedAt">[]): MatchResult[] {
  const posted = new Map(jobs.map((j) => [j.id, Date.parse(j.postedAt) || 0]));
  const gated = (r: MatchResult) => (r.evidence.some((e) => e.startsWith("Gate (")) ? 1 : 0);
  return [...results].sort(
    (a, b) =>
      b.score - a.score ||
      (a.band === b.band ? gated(a) - gated(b) : 0) ||
      (posted.get(b.jobId) ?? 0) - (posted.get(a.jobId) ?? 0) ||
      a.jobId.localeCompare(b.jobId),
  );
}
