import { z } from "zod";
import type { Job } from "../../schemas/src/index";
import { USER_AGENT, extractSkills, isFinanceTitle, isOrlandoMsa, readCapped } from "./greenhouse";

// SmartRecruiters public Posting API (no auth): GET /v1/companies/{companyId}/postings
// Docs: https://developers.smartrecruiters.com/docs/posting-api (read 2026-11-25)
export const SMARTRECRUITERS_BASE = "https://api.smartrecruiters.com";
export const COMPANY_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const PAGE = 100;
const MAX_PAGES = 5;

const SrPostingSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  releasedDate: z.string().optional(),
  company: z.object({ name: z.string().optional() }).partial().optional(),
  location: z
    .object({
      city: z.string().optional(),
      region: z.string().optional(),
      country: z.string().optional(),
      remote: z.boolean().optional(),
      fullLocation: z.string().optional(),
    })
    .partial()
    .optional(),
});
const SrPageSchema = z.object({ content: z.array(z.unknown()).default([]), totalFound: z.number().optional() });

/** Returns null when the posting is out of scope (not Orlando MSA / remote, or not finance). */
export function normalizeSmartRecruiters(raw: unknown, companyId: string, companyName: string): Job | null {
  const p = SrPostingSchema.safeParse(raw);
  if (!p.success) return null;
  const j = p.data;
  const loc = j.location ?? {};
  const place = loc.fullLocation ?? [loc.city, loc.region].filter(Boolean).join(", ");
  const remote = loc.remote === true;
  if (!isFinanceTitle(j.name)) return null;
  if (!remote && !isOrlandoMsa([place])) return null;
  const posted = j.releasedDate && !Number.isNaN(Date.parse(j.releasedDate)) ? new Date(j.releasedDate).toISOString() : new Date().toISOString();
  return {
    id: `smartrecruiters:${companyId}:${j.id}`,
    title: j.name.slice(0, 200),
    company: j.company?.name || companyName,
    location: place || (remote ? "Remote" : ""),
    remote,
    postedAt: posted,
    url: `https://jobs.smartrecruiters.com/${encodeURIComponent(companyId)}/${encodeURIComponent(j.id)}`,
    source: "smartrecruiters",
    description: "",
    skills: extractSkills(j.name),
  };
}

export async function fetchSmartRecruiters(
  companyId: string,
  companyName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Job[]> {
  if (!COMPANY_ID_RE.test(companyId)) throw new Error("smartrecruiters_bad_company");
  const out: Job[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `${SMARTRECRUITERS_BASE}/v1/companies/${companyId}/postings?country=us&limit=${PAGE}&offset=${page * PAGE}`;
    const res = await fetchImpl(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`smartrecruiters_${res.status}`);
    const body = SrPageSchema.safeParse(await readCapped(res));
    if (!body.success) throw new Error("smartrecruiters_bad_body");
    for (const raw of body.data.content) {
      const job = normalizeSmartRecruiters(raw, companyId, companyName);
      if (job) out.push(job);
    }
    if (body.data.content.length < PAGE) break;
  }
  return out;
}
