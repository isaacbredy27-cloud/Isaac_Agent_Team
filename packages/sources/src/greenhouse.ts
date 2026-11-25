import type { Job } from "../../schemas/src/index.ts";

// Notes: knowledge/job-data-integration-expert/docs/greenhouse-job-board-api.md
// Public GET, no auth. Poll at most once per 2 hours per board (ADR 0003).

export const GREENHOUSE_BASE = "https://boards-api.greenhouse.io";
export const USER_AGENT = "FinanceMatchOrlando-JobsBot/1.0 (job listing aggregator)";

type GhJob = {
  id: number | string;
  title?: string;
  company_name?: string;
  location?: { name?: string } | null;
  absolute_url?: string;
  content?: string | null;
  first_published?: string | null;
  updated_at?: string | null;
  requisition_id?: string | null;
  internal_job_id?: number | string | null;
};

const ORLANDO_MSA =
  /\b(orlando|kissimmee|sanford|lake mary|maitland|altamonte springs|winter park|oviedo|apopka|clermont|ocoee|winter garden|lake nona|celebration|longwood|casselberry|st\.? cloud|windermere)\b/i;

const FINANCE_TITLE =
  /\b(accountant|accounting|accounts (payable|receivable)|financial|finance|fp&a|controller|auditor|audit|treasury|tax|payroll|credit|underwrit\w*|budget|billing|collections|revenue|fund|investment|actuar\w*|bsa|aml)\b/i;

const SKILL_KEYWORDS = [
  "GAAP", "FP&A", "Excel", "SQL", "Power BI", "NetSuite", "SAP", "Oracle", "CPA", "CFA",
  "Financial Modeling", "Forecasting", "Budgeting", "Variance Analysis", "Month-End Close",
  "Account Reconciliation", "Accounts Payable", "Accounts Receivable", "Internal Audit", "SOX",
  "Underwriting", "Credit Analysis", "Treasury", "Payroll", "Tax Preparation", "SEC Reporting",
];

const unescapeHtml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

/** `content` is HTML-escaped HTML: unescape, strip tags, collapse whitespace. */
export function htmlToText(escaped: string): string {
  return unescapeHtml(escaped)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isOrlandoMsa(places: string[]): boolean {
  return places.some((p) => ORLANDO_MSA.test(p));
}

export function isFinanceTitle(title: string): boolean {
  return FINANCE_TITLE.test(title);
}

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return SKILL_KEYWORDS.filter((k) => lower.includes(k.toLowerCase()));
}

/** Returns null when the posting is out of scope (not Orlando MSA / remote, or not finance). */
export function normalizeGreenhouse(j: GhJob, token: string): Job | null {
  const title = (j.title ?? "").trim();
  const url = j.absolute_url;
  if (!title || !url || !isFinanceTitle(title)) return null;
  const places = (j.location?.name ?? "").split("•").map((p) => p.trim()).filter(Boolean);
  const remote = places.some((p) => /remote/i.test(p));
  const inMsa = isOrlandoMsa(places);
  // Remote counts only when Florida or US-wide; the Orlando test is the main gate.
  if (!inMsa && !remote) return null;
  const postedAt = j.first_published ?? j.updated_at;
  if (!postedAt || Number.isNaN(Date.parse(postedAt))) return null;
  const description = htmlToText(j.content ?? "");
  return {
    id: `greenhouse:${token}:${j.requisition_id ?? j.id}`,
    title,
    company: j.company_name?.trim() || token,
    location: places.find((p) => ORLANDO_MSA.test(p)) ?? places[0] ?? "Remote",
    remote,
    postedAt: new Date(postedAt).toISOString(),
    url,
    source: "greenhouse",
    description,
    skills: extractSkills(`${title} ${description}`),
  };
}

export function normalizeGreenhouseBoard(body: unknown, token: string): Job[] {
  const list = (body as { jobs?: unknown } | null)?.jobs;
  if (!Array.isArray(list)) return [];
  return list.flatMap((j) => {
    const n = normalizeGreenhouse(j as GhJob, token);
    return n ? [n] : [];
  });
}

/** One request per board. Throws on non-2xx so the caller can back off. */
export async function fetchGreenhouse(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Job[]> {
  const url = `${GREENHOUSE_BASE}/v1/boards/${encodeURIComponent(token)}/jobs?content=true`;
  const res = await fetchImpl(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`greenhouse_${res.status}`);
  return normalizeGreenhouseBoard(await res.json(), token);
}
