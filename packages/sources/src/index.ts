import type { Job } from "../../schemas/src/index";
import registry from "../../../data/registry/employers.json";
import { BOARD_TOKEN_RE, fetchGreenhouse } from "./greenhouse";
import { loadSeed } from "./seed";
import { COMPANY_ID_RE, fetchSmartRecruiters } from "./smartrecruiters";

export { loadSeed } from "./seed";
export { fetchGreenhouse, normalizeGreenhouse, normalizeGreenhouseBoard } from "./greenhouse";

export type GetJobsOptions = {
  q?: string;
  /** ISO date or datetime; only jobs posted at or after this are returned. */
  since?: string;
  now?: Date;
  fetchImpl?: typeof fetch;
};

export type GetJobsResult = { jobs: Job[]; source: "seed" | "mixed" };

type Employer = { name?: string; companyId?: string; boardToken?: string; ats?: string; tier?: number; allowed?: boolean; termsReviewedAt?: string | null };

const POLL_MS = 2 * 60 * 60 * 1000; // ADR 0003: at most once per 2 hours per board
const cache = new Map<string, { at: number; jobs: Job[] }>();

export function resetSourceCache(): void {
  cache.clear();
}

const isDate = (d: unknown): boolean => typeof d === "string" && !Number.isNaN(Date.parse(d));
const isToken = (t: unknown): boolean => typeof t === "string" && BOARD_TOKEN_RE.test(t);

function greenhouseTokens(): string[] {
  const list = (registry as { employers?: Employer[] }).employers ?? [];
  return list
    .filter((e) => e.ats === "greenhouse" && e.tier === 1 && e.allowed === true && isDate(e.termsReviewedAt) && isToken(e.boardToken))
    .map((e) => e.boardToken as string);
}

async function greenhouseJobs(now: number, fetchImpl?: typeof fetch): Promise<Job[]> {
  const out: Job[] = [];
  for (const token of greenhouseTokens()) {
    const hit = cache.get(token);
    if (hit && now - hit.at < POLL_MS) {
      out.push(...hit.jobs);
      continue;
    }
    try {
      const jobs = await fetchGreenhouse(token, fetchImpl);
      cache.set(token, { at: now, jobs });
      out.push(...jobs);
    } catch {
      // Keep serving the last good copy; do not retry within this request.
      if (hit) out.push(...hit.jobs);
    }
  }
  return out;
}

function smartRecruitersEmployers(): { id: string; name: string }[] {
  const list = (registry as { employers?: Employer[] }).employers ?? [];
  return list
    .filter((e) => e.ats === "smartrecruiters" && e.tier === 1 && e.allowed === true && isDate(e.termsReviewedAt) && typeof e.companyId === "string" && COMPANY_ID_RE.test(e.companyId))
    .map((e) => ({ id: e.companyId as string, name: e.name ?? (e.companyId as string) }));
}

async function smartRecruitersJobs(now: number, fetchImpl?: typeof fetch): Promise<Job[]> {
  const out: Job[] = [];
  for (const { id, name } of smartRecruitersEmployers()) {
    const key = `sr:${id}`;
    const hit = cache.get(key);
    if (hit && now - hit.at < POLL_MS) {
      out.push(...hit.jobs);
      continue;
    }
    try {
      const jobs = await fetchSmartRecruiters(id, name, fetchImpl);
      cache.set(key, { at: now, jobs });
      out.push(...jobs);
    } catch {
      if (hit) out.push(...hit.jobs);
    }
  }
  return out;
}

const normKey = (j: Job) =>
  `${j.company}|${j.title}|${j.location}`.toLowerCase().replace(/[^a-z0-9|]+/g, " ").trim();

/** Dedupe by id, then by company+title+location; prefer the employer board over the seed. */
export function dedupe(jobs: Job[]): Job[] {
  const byKey = new Map<string, Job>();
  for (const j of jobs) {
    const k = normKey(j);
    const prev = byKey.get(k);
    if (!prev || (prev.source === "seed" && j.source !== "seed")) byKey.set(k, j);
  }
  const seen = new Set<string>();
  return [...byKey.values()].filter((j) => (seen.has(j.id) ? false : (seen.add(j.id), true)));
}

export async function getJobs(opts: GetJobsOptions = {}): Promise<GetJobsResult> {
  const now = opts.now ?? new Date();
  let jobs = loadSeed(now);
  let source: "seed" | "mixed" = "seed";

  if (process.env.JOBS_GREENHOUSE === "1") {
    const live = await greenhouseJobs(now.getTime(), opts.fetchImpl);
    if (live.length > 0) {
      jobs = jobs.concat(live);
      source = "mixed";
    }
  }

  if (process.env.JOBS_SMARTRECRUITERS === "1") {
    const live = await smartRecruitersJobs(now.getTime(), opts.fetchImpl);
    if (live.length > 0) {
      jobs = jobs.concat(live);
      source = "mixed";
    }
  }

  jobs = dedupe(jobs);

  const q = opts.q?.trim().toLowerCase();
  if (q) {
    jobs = jobs.filter((j) =>
      `${j.title} ${j.company} ${j.location} ${j.description} ${j.skills.join(" ")}`.toLowerCase().includes(q),
    );
  }
  if (opts.since) {
    const t = Date.parse(opts.since);
    if (!Number.isNaN(t)) jobs = jobs.filter((j) => Date.parse(j.postedAt) >= t);
  }

  jobs.sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
  return { jobs, source };
}
