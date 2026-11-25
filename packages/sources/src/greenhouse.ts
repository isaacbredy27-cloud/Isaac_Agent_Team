import { z } from "zod";
import type { Job } from "../../schemas/src/index";
import taxonomy from "../../../data/taxonomy/skills.v1.json";

// Notes: knowledge/job-data-integration-expert/docs/greenhouse-job-board-api.md
// Public GET, no auth. Poll at most once per 2 hours per board (ADR 0003).

export const GREENHOUSE_BASE = "https://boards-api.greenhouse.io";
export const USER_AGENT = "FinanceMatchOrlando-JobsBot/1.0 (job listing aggregator)";

export const BOARD_TOKEN_RE = /^[a-z0-9_-]{1,64}$/;
export const MAX_BODY_BYTES = 5 * 1024 * 1024;
export const MAX_DESCRIPTION_CHARS = 20_000;

const idLike = z.union([z.number(), z.string()]);
export const GhJobSchema = z.object({
  id: idLike,
  title: z.string().max(300).optional(),
  company_name: z.string().max(200).nullish(),
  location: z.object({ name: z.string().max(500).nullish() }).nullish(),
  absolute_url: z.string().max(2048).nullish(),
  content: z.string().nullish(),
  first_published: z.string().nullish(),
  updated_at: z.string().nullish(),
  requisition_id: z.string().nullish(),
  internal_job_id: idLike.nullish(),
});
type GhJob = z.infer<typeof GhJobSchema>;

function isHttps(u: string): boolean {
  try {
    return new URL(u).protocol === "https:";
  } catch {
    return false;
  }
}

const ORLANDO_MSA =
  /\b(orlando|kissimmee|sanford|lake mary|maitland|altamonte springs|winter park|oviedo|apopka|clermont|ocoee|winter garden|lake nona|celebration|longwood|casselberry|st\.? cloud|windermere)\b/i;

const FINANCE_TITLE =
  /\b(accountant|accounting|accounts (payable|receivable)|financial|finance|fp&a|controller|auditor|audit|treasury|tax|payroll|credit|underwrit\w*|budget|billing|collections|revenue|fund|investment|actuar\w*|bsa|aml)\b/i;

type TaxSkill = { id: string; label: string; aliases: string[] };
const SKILLS = (taxonomy as { skills: TaxSkill[] }).skills;
// Whole-word match on taxonomy aliases (data/taxonomy/skills.v1.json); returns skill ids.
const SKILL_MATCHERS = SKILLS.map((s) => ({
  id: s.id,
  re: new RegExp(`(?<![a-z0-9])(${[s.label, ...s.aliases].map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![a-z0-9])`, "i"),
}));

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

export function extractSkills(text: string): string[] {
  return SKILL_MATCHERS.filter((m) => m.re.test(text)).map((m) => m.id);
}

/** Returns null when the posting is out of scope (not Orlando MSA / remote, or not finance). */
export function normalizeGreenhouse(j: GhJob, token: string): Job | null {
  const title = (j.title ?? "").trim();
  const url = j.absolute_url;
  if (!title || !url || !isHttps(url) || !isFinanceTitle(title)) return null;
  const places = (j.location?.name ?? "").split("•").map((p) => p.trim()).filter(Boolean);
  const remote = places.some((p) => /remote/i.test(p));
  const inMsa = isOrlandoMsa(places);
  // Remote counts only when Florida or US-wide; the Orlando test is the main gate.
  if (!inMsa && !remote) return null;
  const postedAt = j.first_published ?? j.updated_at;
  if (!postedAt || Number.isNaN(Date.parse(postedAt))) return null;
  const description = htmlToText(j.content ?? "").slice(0, MAX_DESCRIPTION_CHARS);
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
    const p = GhJobSchema.safeParse(j);
    if (!p.success) return [];
    const n = normalizeGreenhouse(p.data, token);
    return n ? [n] : [];
  });
}

export async function readCapped(res: Response): Promise<unknown> {
  const len = Number(res.headers.get("content-length"));
  if (Number.isFinite(len) && len > MAX_BODY_BYTES) throw new Error("greenhouse_too_large");
  if (!res.body) throw new Error("greenhouse_empty");
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("greenhouse_too_large");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/** One request per board. Throws on bad token, redirect, non-2xx or oversize body. */
export async function fetchGreenhouse(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Job[]> {
  if (!BOARD_TOKEN_RE.test(token)) throw new Error("greenhouse_bad_token");
  const url = `${GREENHOUSE_BASE}/v1/boards/${token}/jobs?content=true`;
  const res = await fetchImpl(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`greenhouse_${res.status}`);
  return normalizeGreenhouseBoard(await readCapped(res), token);
}
