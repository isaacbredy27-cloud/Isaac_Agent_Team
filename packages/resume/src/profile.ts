// Deterministic profile building: taxonomy alias matching and date math. No I/O, no model calls.
import type { CandidateProfile } from "../../schemas/src/index.ts";

export type Taxonomy = {
  skills: { id: string; label: string; aliases?: string[] }[];
  titles: { id: string; label: string; aliases?: string[] }[];
  certifications: { id: string; label: string; aliases?: string[] }[];
  education: { id: string; label: string; aliases?: string[] }[];
};

/** NFKC, lowercase, punctuation to spaces (keeps + and #), single spaces. */
export function normalizeText(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/(?<=\b\p{L})\.(?=\p{L}\b)/gu, "") // b.s. -> bs
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Entry = { id: string; label: string; aliases?: string[] };

function matchIds(padded: string, entries: Entry[]): string[] {
  const out: string[] = [];
  for (const e of entries) {
    const names = [e.label, ...(e.aliases ?? [])];
    if (
      names.some((n) => {
        const a = normalizeText(n);
        return a.length > 0 && padded.includes(` ${a} `);
      })
    ) {
      out.push(e.id);
    }
  }
  return out;
}

// ---------- Years of experience ----------
const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec";
const MONTH_IDX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};
const EDU_LINE = /\b(university|college|school|b\.?s\.?|b\.?a\.?|m\.?s\.?|mba|bachelor|master|degree|diploma|gpa)\b/i;

const D = (n: string) =>
  `(?:(?:(?<m${n}>${MONTHS})[a-z]*\\.?,?\\s+)|(?:(?<n${n}>\\d{1,2})/))?(?<y${n}>(?:19|20)\\d{2})`;
const RANGE = new RegExp(
  `${D("1")}\\s*(?:-|\\u2013|\\u2014|to|until)\\s*(?:(?<now>present|current|now|today)|${D("2")})`,
  "gi",
);

function idx(year: string, mon?: string, num?: string, end = false): number {
  let m = end ? 11 : 0;
  if (mon) m = MONTH_IDX[mon.toLowerCase()] ?? m;
  else if (num) {
    const n = Number(num);
    if (n >= 1 && n <= 12) m = n - 1;
  }
  return Number(year) * 12 + m;
}

/** Years from date ranges (overlaps merged) or an "X years" phrase. */
export function estimateYears(text: string, asOf: Date = new Date()): number {
  const nowIdx = asOf.getUTCFullYear() * 12 + asOf.getUTCMonth();
  const spans: [number, number][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (EDU_LINE.test(line)) continue;
    for (const m of line.matchAll(RANGE)) {
      const g = m.groups!;
      const start = idx(g.y1!, g.m1, g.n1);
      const end = g.now ? nowIdx : idx(g.y2!, g.m2, g.n2, true);
      const e = Math.min(end, nowIdx);
      if (e >= start) spans.push([start, e + 1]);
    }
  }
  let months = 0;
  if (spans.length > 0) {
    spans.sort((a, b) => a[0] - b[0]);
    let [cs, ce] = spans[0]!;
    for (const [s, e] of spans.slice(1)) {
      if (s <= ce) ce = Math.max(ce, e);
      else {
        months += ce - cs;
        [cs, ce] = [s, e];
      }
    }
    months += ce - cs;
    return clampYears(months / 12);
  }
  const fb = [...text.matchAll(/\b(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/gi)].map((m) => Number(m[1]));
  return fb.length ? clampYears(Math.max(...fb)) : 0;
}

function clampYears(y: number): number {
  return Math.min(70, Math.max(0, Math.round(y * 10) / 10));
}

export function buildProfile(text: string, taxonomy: Taxonomy, asOf: Date = new Date()): CandidateProfile {
  const padded = ` ${normalizeText(text)} `;
  return {
    skills: matchIds(padded, taxonomy.skills),
    titles: matchIds(padded, taxonomy.titles),
    certifications: matchIds(padded, taxonomy.certifications),
    yearsExperience: estimateYears(text, asOf),
    education: matchIds(padded, taxonomy.education),
  };
}
