import type { Job } from "../../schemas/src/index";
import seedData from "../../../data/jobs/seed.json";

const DAY_MS = 86_400_000;

/**
 * Load the synthetic seed. Dates are shifted so the newest posting is `now`,
 * which keeps the demo data "recent" at request time.
 */
export function loadSeed(now: Date = new Date()): Job[] {
  const jobs = seedData as Job[];
  if (jobs.length === 0) return [];
  const newest = Math.max(...jobs.map((j) => Date.parse(j.postedAt)));
  const shift = now.getTime() - newest;
  return jobs.map((j) => ({
    ...j,
    skills: [...j.skills],
    postedAt: new Date(Date.parse(j.postedAt) + shift).toISOString(),
  }));
}

export { DAY_MS };
