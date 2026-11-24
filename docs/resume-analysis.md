# Resume Analysis

Research date: 2026-11-24. Goal: turn an uploaded PDF or DOCX resume into a structured, normalized candidate profile.

## 1. Recommendation

Use a **two-stage pipeline**: deterministic text extraction, then Claude structured extraction.

1. **Extract text in a Netlify Function.**
   - PDF: `unpdf` (`extractText(pdf, { mergePages: true })`). It is a serverless build of Mozilla PDF.js. MIT licence.
   - DOCX: `mammoth` (`extractRawText({ buffer })`). BSD-2 licence.
2. **Send text to Claude** with a strict JSON schema (`output_config.format`). Get back a `CandidateProfile`.
3. **Fallback for hard PDFs.** If extracted text is short or garbled (scanned resume, multi-column), send the PDF itself as a `document` block. Claude reads page images plus text.
4. **Normalize in code.** Map skills, titles and certifications to our taxonomy. Code does this, not the model, so results are reproducible.

Why not send every PDF straight to Claude? Cost. A PDF page costs 1,500–3,000 text tokens plus up to 1,568 image tokens. Plain extracted text is far cheaper. Use the PDF path only when needed.

## 2. Upload handling

- Accept `.pdf` and `.docx` only. Check magic bytes, not just the extension. PDF starts with `%PDF-`. DOCX is a ZIP (`PK\x03\x04`) with `word/document.xml`.
- Maximum size **5 MB**. Netlify buffers request payloads up to 6 MB. Base64 adds a third, so send the file as `multipart/form-data` or raw bytes, not base64 JSON.
- Maximum **10 pages**. Reject longer files with a clear message.
- Reject `.doc` (legacy binary). Claude document blocks also reject `.docx`; that is why DOCX goes through `mammoth` first.
- `mammoth` blocks external file access by default. Keep it that way. Never enable `externalFileAccess`.
- `mammoth` does no sanitization. We only use `extractRawText`, never its HTML. Still escape any text before showing it.
- Treat resume text as untrusted input. It can carry prompt injection. See `security.md`.

## 3. Handling formatting problems

| Problem | Symptom | Handling |
|---|---|---|
| Multi-column layout | Lines from two columns interleave | Detect short alternating lines; fall back to PDF document block |
| Scanned image PDF | Little or no text extracted | If text < 200 chars per page, use PDF document block (Claude reads the page image) |
| Tables for skills | Cells merge into one line | Claude handles; tokenizer splits on separators `|,;•` |
| Text boxes in DOCX | Text appears out of order | `mammoth` emits text-box content after its paragraph; Claude reorders by meaning |
| Headers/footers with contact info | May be missing | Ask user to confirm contact fields in UI |
| Dates in many formats | "Jan 2021 – Present", "2019-21", "Q3 '22" | Claude returns ISO `YYYY-MM`; code computes durations |
| Ligatures and odd Unicode | "ﬁnance" | Normalize with `String.prototype.normalize("NFKC")` |

## 4. Candidate profile schema

```ts
type CandidateProfile = {
  schemaVersion: "1.0";
  summary?: string;
  totalYearsExperience: number;          // computed in code from positions
  relevantFinanceYears: number;          // computed in code from finance-tagged positions
  positions: Array<{
    title: string;
    titleNormalized?: string;            // filled by code from taxonomy
    employer: string;
    industry?: string;                   // NAICS sector label if inferable
    start: string;                       // YYYY-MM
    end: string | "present";
    bullets: string[];
    skillsEvidenced: string[];           // skills shown in these bullets
    quantifiedAchievements: string[];    // bullets with numbers ($, %, time)
  }>;
  education: Array<{
    degree: "high_school" | "associate" | "bachelor" | "master" | "mba" | "doctorate" | "other";
    field?: string;                      // e.g. "Finance", "Accounting"
    institution: string;
    graduated?: string;                  // YYYY-MM
    gpa?: number;
  }>;
  certifications: Array<{
    name: string;                        // raw text
    canonical?: string;                  // CPA, CFA, CMA, FRM, CTP, SIE, SERIES_7, ...
    status: "earned" | "in_progress" | "expired";
    level?: string;                      // "Level II" for CFA
  }>;
  skills: {
    raw: string[];
    canonical: string[];                 // filled by code
  };
  software: string[];                    // raw names; code maps to canonical
  clearance?: "none" | "public_trust" | "secret" | "top_secret" | "ts_sci";
  workAuthorization?: "us_citizen" | "permanent_resident" | "needs_sponsorship" | "unknown";
  location?: { city?: string; state?: string };
  preferences?: { arrangement?: Array<"onsite" | "hybrid" | "remote">; minSalary?: number };
};
```

Claude returns everything except the fields marked "computed in code" and "filled by code".

## 5. Claude call (TypeScript)

Use the official SDK. Use structured outputs so the response always parses.

```ts
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { CandidateProfileSchema } from "./schemas";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from Netlify env (Functions scope)

const response = await client.messages.parse({
  model: "claude-opus-5-5",
  max_tokens: 16000,
  output_config: { effort: "low", format: zodOutputFormat(CandidateProfileSchema) },
  system: EXTRACTION_SYSTEM_PROMPT, // stable text -> cacheable
  messages: [{
    role: "user",
    content: [{ type: "text", text: `<resume>\n${resumeText}\n</resume>` }],
  }],
});
```

Notes:

- `claude-opus-5-5` is the current default model. Opus 5.5 defaults to `medium` effort; extraction is simple, so set `low` explicitly.
- Choosing a cheaper model (for example `claude-haiku-5-5`) is the owner's decision. Measure it against a labelled resume set first. See `testing-and-accessibility.md`.
- Check `stop_reason` before reading content. Handle `refusal` and `max_tokens`.
- Opus 5.5 rejects `temperature`, `top_p`, `top_k` and assistant prefill. Do not send them.
- Cache the result by `sha256(resumeText)`. Re-uploading the same file costs nothing.

## 6. Normalization in code

### 6.1 Skill taxonomy

Keep a versioned JSON taxonomy in the repo: `data/taxonomy/skills.v1.json`.

```json
{
  "excel_advanced": {
    "label": "Advanced Excel",
    "aliases": ["excel", "ms excel", "pivot tables", "vlookup", "xlookup", "index match", "power query"],
    "category": "tool",
    "related": { "financial_modeling": 0.5, "vba": 0.4 }
  },
  "fpa": {
    "label": "FP&A",
    "aliases": ["financial planning and analysis", "fp&a", "budgeting and forecasting", "annual operating plan", "rolling forecast"],
    "category": "domain",
    "related": { "forecasting": 0.8, "budgeting": 0.8, "variance_analysis": 0.6 }
  }
}
```

Matching rules:

1. Lowercase, strip punctuation, NFKC normalize.
2. Exact alias match → canonical skill, weight 1.0.
3. `related` edge → partial credit at the edge weight.
4. Unknown terms stay in `raw` and get logged for taxonomy review.

Seed sources: O*NET technology skills for 13-2051, 13-2011, 13-2041, 13-2054, 11-3031 (download the O*NET database; check its CC BY 4.0 attribution terms), plus terms from live Orlando postings (see `orlando-finance-market.md`).

### 6.2 Title taxonomy and equivalent titles

`data/taxonomy/titles.v1.json` maps raw titles to a normalized title, a role family and a seniority level.

| Raw titles | Normalized | Family | Level |
|---|---|---|---|
| Financial Analyst, Finance Analyst, Business Analyst – Finance | financial_analyst | analyst | 2 |
| Senior Financial Analyst, Financial Analyst III, Financial Analyst Staff | senior_financial_analyst | senior_analyst | 3 |
| FP&A Analyst, Planning Analyst, Budget Analyst | fpa_analyst | analyst | 2 |
| Staff Accountant, Senior Accountant | accountant | analyst | 2–3 |
| Credit Analyst, Underwriter, Credit Risk Analyst | credit_analyst | analyst | 2 |
| Financial Management Specialist (GS-0501), Budget Analyst (GS-0560) | federal_financial_analyst | analyst | by GS grade |
| Finance Manager, FP&A Manager, Controller | finance_manager | manager | 4 |

Seniority levels: 1 intern/associate, 2 analyst, 3 senior/staff, 4 manager, 5 director+.

### 6.3 Transferable skills

Some backgrounds map to finance roles with partial credit. Encode them as `related` edges or as role-to-role transfer weights.

| From | To | Transfer weight | Reason |
|---|---|---|---|
| Staff/Senior Accountant | Financial Analyst, FP&A | 0.8 | Close, GAAP, reconciliations, Excel |
| Auditor (Big 4) | Corporate Finance, FP&A | 0.8 | Financial statements, controls |
| Bank Credit Analyst | Corporate Credit, Risk Analyst | 0.8 | Ratio analysis, credit memos |
| Data/BI Analyst | FP&A Analyst | 0.6 | SQL, BI tools; lacks finance domain |
| Military finance / logistics officer | Defense program finance | 0.7 | Budget execution, clearance |
| Revenue manager (hotel) | Revenue Analyst, FP&A (hospitality) | 0.7 | Forecasting, pricing |
| Project controls / scheduler | Defense program financial analyst | 0.6 | EVM, EAC/ETC |

### 6.4 Experience calculation

- Merge overlapping date ranges before summing.
- `relevantFinanceYears` counts positions whose normalized title or bullets map to finance domain skills.
- Partial relevance: an accountant role counts 1.0 toward FP&A; a data analyst role counts 0.5.
- Round to one decimal.

## 7. User review step

Show the parsed profile before scoring. Let the user fix fields. Mark any field the model inferred (not stated) with an "inferred" chip. This cuts errors and builds trust.

## 8. Privacy

- Delete the original file after parsing unless the user opts in to keep it.
- Store the profile encrypted at rest (Netlify Blobs encrypts at rest; add app-level encryption for PII; see `security.md`).
- Never send resume data to job sources or analytics.

## 9. Acceptance criteria

- On a labelled set of 50 resumes (mix of PDF/DOCX, one- and two-column, one scanned):
  - Position titles and dates extracted with ≥ 95% field accuracy.
  - Certifications detected with ≥ 95% recall.
  - Canonical skill mapping precision ≥ 90%.
- A 5 MB file parses in under 20 seconds end to end.
- The same file always yields the same profile (cache hit).
- Non-PDF/DOCX files and oversize files are rejected with a clear message.

## Sources

- Claude PDF support (limits, token cost, DOCX not supported in document blocks). https://platform.claude.com/docs/en/build-with-claude/pdf-support
- Claude structured outputs and SDK patterns (Anthropic TypeScript SDK docs; `messages.parse`, `zodOutputFormat`).
- unpdf README. https://github.com/unjs/unpdf
- mammoth.js README (raw text extraction, external file access disabled by default, no sanitization). https://github.com/mwilliamson/mammoth.js
- Netlify Functions configuration (6 MB buffered payload). https://docs.netlify.com/build/functions/configuration/
- O*NET OnLine occupation profiles (13-2051 and related). https://www.onetonline.org/
