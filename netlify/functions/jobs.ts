import type { Config, Context } from "@netlify/functions";
import { getJobs } from "../../packages/sources/src/index";
import { error, json } from "./_lib/platform/http";

const TWO_HOURS = 2 * 60 * 60; // ADR 0003: CDN-cache job lists, poll sources every 2 hours

export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method !== "GET") return error("method_not_allowed", 405);
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.slice(0, 200) || undefined;
  const since = url.searchParams.get("since") || undefined;
  if (since && Number.isNaN(Date.parse(since))) return error("invalid_request", 400);
  try {
    const { jobs, source } = await getJobs({ q, since });
    return json({ jobs, source, fetchedAt: new Date().toISOString() }, {}, { cdnSeconds: TWO_HOURS });
  } catch {
    return error("jobs_unavailable", 503);
  }
};

export const config: Config = {
  path: "/api/jobs",
  method: "GET",
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
