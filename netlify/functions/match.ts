import type { Config, Context } from "@netlify/functions";
import { MatchRequestSchema, type Job } from "../../packages/schemas/src/index.ts";
import { rankResults, score, type Taxonomy } from "../../packages/scoring/src/index.ts";
import { getJobs } from "../../packages/sources/src/index.ts";
import taxonomy from "../../data/taxonomy/skills.v1.json";
import { error, json, readJson } from "./_lib/platform/http.ts";

// ADR 0004: the profile is used only to score. Never logged, never cached, never stored.
export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method !== "POST") return error("method_not_allowed", 405);
  const body = await readJson(req, MatchRequestSchema);
  if (!body.ok) return body.response;
  const { profile, jobIds } = body.data;
  let jobs: Job[];
  try {
    jobs = (await getJobs({})).jobs;
  } catch {
    return error("jobs_unavailable", 503);
  }
  if (jobIds) {
    const want = new Set(jobIds);
    jobs = jobs.filter((j) => want.has(j.id));
  }
  const results = rankResults(
    jobs.map((j) => score(profile, j, taxonomy as Taxonomy)),
    jobs,
  );
  return json({ results }, {}, { private: true });
};

export const config: Config = {
  path: "/api/match",
  method: "POST",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
