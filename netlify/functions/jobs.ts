import type { Config, Context } from "@netlify/functions";
import { z } from "zod";
import { getJobs } from "../../packages/sources/src/index";
import { error, json } from "./_lib/platform/http";

const TWO_HOURS = 2 * 60 * 60; // ADR 0003: CDN-cache job lists, poll sources every 2 hours

const QuerySchema = z.object({
  q: z.string().max(100).regex(/^[\p{L}\p{N} &\-.,/+#]*$/u).optional(),
  since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !Number.isNaN(Date.parse(d))).optional(),
});

export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method !== "GET") return error("method_not_allowed", 405);
  const url = new URL(req.url);
  // q is public search text only. Never send profile or resume terms.
  const parsed = QuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    since: url.searchParams.get("since") ?? undefined,
  });
  if (!parsed.success) return error("invalid_request", 400);
  const q = parsed.data.q || undefined;
  const since = parsed.data.since;
  try {
    const { jobs, source } = await getJobs({ q, since });
    return json({ jobs, source, fetchedAt: new Date().toISOString() }, {}, {
      cdnSeconds: TWO_HOURS,
      vary: "query=q|since",
    });
  } catch {
    return error("jobs_unavailable", 503);
  }
};

export const config: Config = {
  path: "/api/jobs",
  method: "GET",
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
