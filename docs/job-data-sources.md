# Job Data Sources

Research date: 2026-11-24. Goal: collect newly posted Orlando-area finance jobs reliably, legally and cheaply.

## 1. Recommendation

Use a **three-tier connector model**. Each tier is a plugin behind one `JobSource` interface.

1. **Tier 1 — Official public job-board APIs (build first).** Greenhouse Job Board API, Lever Postings API, SmartRecruiters, Ashby and USAJOBS. These are documented, free and meant for this use.
2. **Tier 2 — Public employer career pages (build second).** Workday, iCIMS and Oracle Recruiting Cloud have no general public postings API. Read only public posting pages. Prefer the schema.org `JobPosting` JSON-LD that employers publish for Google for Jobs. Respect robots.txt and each site's terms. Keep request rates low.
3. **Tier 3 — Licensed aggregator feed (optional, paid).** Adzuna API or a commercial jobs-data vendor. Use it for coverage of employers with unknown ATS. Read the licence before storing or redisplaying data.

Do **not** scrape LinkedIn, Indeed or Glassdoor pages. Their terms prohibit automated collection. Link out to them only.

## 2. Collection pipeline

```
Scheduled function (every 2 hours on the Free plan, ADR 0003; 30 s limit)
  └─ reads employer registry (Netlify Blobs: registry/employers.json)
  └─ POSTs one message per source to ingest-background (15 min limit)
        └─ fetch postings (ETag / If-Modified-Since where supported)
        └─ filter: location within Orlando MSA or remote-eligible-in-FL
        └─ filter: finance title/keyword classifier (deterministic first, LLM fallback)
        └─ normalize to NormalizedJob
        └─ dedupe by (employer, requisition id) then by content hash
        └─ write jobs/{jobId}.json + update jobs/index.json
        └─ enqueue new jobs for requirement extraction (Claude, cached by content hash)
```

Netlify limits drive this design. Scheduled functions stop at 30 seconds. Background functions run up to 15 minutes and accept a 256 KB payload. So the scheduler only fans out. Background functions do the work. See `netlify-architecture.md` and `long-running-jobs.md`.

## 3. Source-by-source evaluation

### 3.1 Greenhouse Job Board API

- **Endpoint:** `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true`
- **Auth:** none for GET.
- **Fields:** `id`, `title`, `location`, `updated_at`, `absolute_url`, `content`, `departments`, `offices`, `metadata`. A `pay_transparency` query parameter returns `pay_input_ranges`.
- **Pros:** official, stable, full description, pay ranges when employers enter them.
- **Cons:** you must know each employer's `board_token`. No cross-company search. Rate limits are not documented; poll politely (once per hour per board).
- **Legal:** published for public job boards. Low risk.
- **Maintenance:** low. Tokens rarely change.

### 3.2 Lever Postings API

- **Endpoint:** `GET https://api.lever.co/v0/postings/{site}?mode=json`. EU tenants use `api.eu.lever.co`.
- **Filters:** `skip`, `limit`, `location`, `commitment`, `team`, `department`, `level`, `group`.
- **Fields:** `id`, `text`, `categories`, `country`, `descriptionPlain`, `lists`, `additionalPlain`, `hostedUrl`, `applyUrl`, `workplaceType`, `salaryRange`, `salaryDescription`.
- **Auth:** none for GET. Only the application POST needs a key. POSTs are limited to 2 per second.
- **Pros:** official, includes `workplaceType` and `salaryRange`.
- **Cons:** per-employer site slug. No search.
- **Legal / maintenance:** low risk, low upkeep.

### 3.3 SmartRecruiters and Ashby

- Both expose public postings endpoints per company. Universal Orlando (NBCUniversal) appeared on SmartRecruiters in our sample.
- Treat them like Greenhouse: per-company polling, low risk.
- Confirm each endpoint against vendor docs during build. We did not read their docs in this phase.

### 3.4 USAJOBS Search API

- **Endpoint:** `GET https://data.usajobs.gov/api/Search`
- **Parameters:** `Keyword`, `LocationName`, `Radius`, `JobCategoryCode`, `DatePosted`, `ResultsPerPage`.
- **Auth:** free API key with registration. Read the header requirements on developer.usajobs.gov before build.
- **Pros:** official federal data. Covers Orlando VA, Navy (NAWCTSD) and Army simulation offices.
- **Cons:** federal titles differ ("Financial Management Specialist", GS-0501/0510/0560). Map them in the title taxonomy.

### 3.5 Workday (myworkdayjobs.com)

- **Official API:** tenant-scoped and OAuth-protected. It is for the employer, not for third parties.
- **Public data:** each employer's career site at `{tenant}.wd{N}.myworkdayjobs.com`. The page loads postings from an internal JSON endpoint. That endpoint is not a documented public API.
- **Our sample:** Berkadia and SeaWorld postings came from Workday.
- **Recommendation:** read the public posting page. Parse its `JobPosting` JSON-LD if present. Otherwise read visible text. Do not hammer the internal endpoint. Cap at one listing fetch per employer per hour.
- **Legal:** check each employer's site terms and robots.txt. Public facts (title, location, date) carry low risk. Storing full descriptions carries more. Keep descriptions only as long as the posting is open.
- **Maintenance:** medium. Page structure changes without notice. Add contract tests per employer.

### 3.6 iCIMS

- **Public data:** posting pages at `careers-{company}.icims.com/jobs/{id}/{slug}/job`.
- **Our sample:** AMERICAN SYSTEMS and Reyes Beverage Group used iCIMS.
- **Recommendation:** same as Workday. Read public pages. Prefer JSON-LD.
- **Maintenance:** medium.

### 3.7 Oracle Recruiting Cloud

- **Public data:** "Candidate Experience" sites at `{tenant}.fa.oraclecloud.com/hcmUI/CandidateExperience/...`. JPMorgan Chase uses this for Orlando and Lake Mary.
- **Recommendation:** same as Workday. These pages are JavaScript-heavy. A headless browser may be needed. That cost suggests using a licensed vendor for these employers instead.
- **Maintenance:** medium to high.

### 3.8 Employer career pages with JSON-LD

Google for Jobs asks employers to publish `JobPosting` structured data. Useful fields:

- `title`, `description`, `datePosted`, `validThrough`, `hiringOrganization`, `jobLocation`, `jobLocationType` (`TELECOMMUTE` for remote), `employmentType`, `baseSalary` (with `minValue`/`maxValue` and `unitText`), `identifier`, `educationRequirements`, `experienceRequirements` (`monthsOfExperience`), `experienceInPlaceOfEducation`.

This is the most portable parser. One parser covers many ATS vendors and custom sites.

### 3.9 Adzuna API (Tier 3)

- Aggregator with a free developer tier and an attribution requirement.
- We could not read Adzuna's overview page in this phase. Read terms, quotas and attribution rules before adoption.
- **Pros:** search by keyword and location across many employers.
- **Cons:** salary may be predicted, not posted. Redirect links go through Adzuna. Licence limits on storage.

### 3.10 Excluded sources

| Source | Reason |
|---|---|
| LinkedIn | User agreement prohibits scraping. Litigation history. |
| Indeed | Terms prohibit automated access. Use only as an outbound link. |
| Glassdoor | Terms prohibit scraping. |

## 4. Comparison

| Source | Official | Auth | Salary data | Posted date | Effort | Legal risk |
|---|---|---|---|---|---|---|
| Greenhouse | Yes | None | Often | `updated_at` | Low | Low |
| Lever | Yes | None | Often | `createdAt` | Low | Low |
| SmartRecruiters / Ashby | Yes | None | Sometimes | Yes | Low | Low |
| USAJOBS | Yes | Free key | Always (GS) | Yes | Low | Low |
| Workday public pages | No API | None | Sometimes | Relative ("Posted Today") | Medium | Medium |
| iCIMS public pages | No API | None | Sometimes | Yes | Medium | Medium |
| Oracle Recruiting Cloud | No API | None | Sometimes | Yes | High | Medium |
| JSON-LD on career pages | Standard | None | If published | `datePosted` | Low per site | Low–medium |
| Adzuna | Yes | Key | Often predicted | Yes | Low | Licence-bound |

## 5. Normalized job schema

```ts
type NormalizedJob = {
  id: string;                 // sha256(source + employerId + requisitionId)
  source: "greenhouse" | "lever" | "smartrecruiters" | "ashby" | "usajobs" | "workday" | "icims" | "oracle" | "jsonld" | "adzuna";
  employerId: string;         // key into employer registry
  employerName: string;
  requisitionId?: string;
  title: string;
  titleNormalized: string;    // from title taxonomy, e.g. "fpa_analyst"
  roleFamily: "analyst" | "senior_analyst" | "manager" | "associate";
  location: { city?: string; state?: string; lat?: number; lng?: number; inOrlandoMsa: boolean };
  workArrangement: "onsite" | "hybrid" | "remote" | "unknown";
  salary?: { min?: number; max?: number; period: "YEAR" | "HOUR"; source: "posted" | "estimated" };
  postedAt?: string;          // ISO date; derived when board gives "Posted 3 days ago"
  firstSeenAt: string;        // when we first saw it
  lastSeenAt: string;
  closedAt?: string;
  applyUrl: string;
  descriptionText: string;    // plain text, sanitized
  contentHash: string;        // sha256(descriptionText) to skip re-extraction
  requirements?: JobRequirements; // filled by extraction step (see match-scoring.md)
};
```

## 6. Freshness and deduplication

- **"Recent"** means `postedAt` within 30 days, or `firstSeenAt` within 30 days when the board gives no date.
- **Close detection:** mark a job closed after two consecutive polls miss it.
- **Cross-source dedupe:** the same Lockheed job appeared on Indeed and on Lockheed's own site. Prefer the employer board. Match on normalized title + employer + city + description similarity (cosine over shingles > 0.9).

## 7. Rate limits and politeness

- One listing request per employer per 2 hours (Free-plan credit budget, ADR 0003). Stagger start times.
- Honour `Retry-After`, `429` and `503`. Back off exponentially. Stop for the run after three failures.
- Send a descriptive User-Agent with a contact URL for the app. Do not include personal details.
- Cache with ETag / Last-Modified where offered.

## 8. Legal checklist (not legal advice)

- Read and record each source's terms in the employer registry (`termsReviewedAt`, `termsUrl`, `allowed: true|false`).
- Respect robots.txt for Tier 2.
- Store only what the product needs. Drop descriptions 30 days after a job closes.
- Always link to the employer's own apply URL. Never repost jobs as your own.
- Have counsel review before launch if the app becomes commercial.

## 9. Acceptance criteria

- A new Greenhouse or Lever posting in Orlando appears in the app within 2 hours.
- Duplicate postings across sources appear once.
- A closed posting is hidden within 2 polling cycles.
- No source is polled more than once per hour.
- Every connector has a recorded-response contract test.

## Sources

- Greenhouse Job Board API. https://developers.greenhouse.io/job-board.html
- Lever Postings API. https://github.com/lever/postings-api
- USAJOBS Search API reference. https://developer.usajobs.gov/api-reference/get-api-search
- Google Search Central, JobPosting structured data. https://developers.google.com/search/docs/appearance/structured-data/job-posting
- schema.org JobPosting. https://schema.org/JobPosting
- Netlify Scheduled Functions and Background Functions docs (see `netlify-architecture.md`).
- Live posting sample, 2026-11-24 (Workday: Berkadia, SeaWorld; iCIMS: AMERICAN SYSTEMS, Reyes; SmartRecruiters: NBCUniversal; Oracle: JPMorgan Chase search page).
