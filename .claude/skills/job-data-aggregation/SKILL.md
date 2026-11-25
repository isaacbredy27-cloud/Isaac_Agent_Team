---
name: job-data-aggregation
description: Collecting Orlando finance jobs — the JobSource connector interface, three tiers (official APIs, public JSON-LD career pages, licensed feeds), NormalizedJob schema, Orlando MSA and finance filters, dedupe, close detection, polite polling every 2 hours on the Free plan. Use for any ingestion design or connector work.
metadata:
  owner: job-data-integration-expert
  backups: [netlify-engineer, finance-job-market-specialist]
  version: 1.0.0
---

# Job Data Aggregation

## Use when
- Designing ingestion
- Adding a source tier
- Dedupe or freshness problems

## Inputs → Outputs
- Inputs: Employer registry, source APIs or pages.
- Outputs: Deduplicated NormalizedJob store and ingestion metrics.

## Purpose
A fresh, deduplicated, legal feed of Orlando finance jobs.

## Connector interface
```ts
interface JobSource {
  id: string;                       // "greenhouse:berkadia"
  tier: 1 | 2 | 3;
  fetchListings(ctx): Promise<RawPosting[]>;   // honours ETag, rate limits
  normalize(raw): NormalizedJob | null;        // null = out of scope
}
```

## Tiers
1. Official APIs: Greenhouse, Lever, SmartRecruiters, Ashby, USAJOBS.
2. Public career pages (Workday, iCIMS, Oracle): JSON-LD `JobPosting` first.
3. Licensed feed (optional): only with a reviewed licence.
No LinkedIn / Indeed / Glassdoor scraping. Tier 2/3 need a terms decision (skill: source-terms-review).

## Filters
- Location in Orlando MSA (Orange, Osceola, Seminole, Lake counties) or remote-eligible for FL.
- Finance role: title taxonomy match first; LLM classifier only for ambiguous titles.

## Dedupe and freshness
- Key: `(employerId, requisitionId)`; else normalized title + employer + city + description shingle cosine > 0.9. Prefer employer board over aggregator.
- `postedAt` from source; else `firstSeenAt`. Close after 2 missed polls.

## Politeness
- ≤ 1 listing request per employer per 2 hours (ADR 0003); stagger; honour 429/503/`Retry-After`; stop source after 3 failures per run.
- Descriptive User-Agent with the app's contact URL (no personal data).

## Checklist
- [ ] Recorded-response contract test per connector
- [ ] Registry entry has `tier`, `allowed`, `termsReviewedAt`
- [ ] Metrics: new, updated, closed, duplicates, failures

## Best practices
- Official APIs first
- Polite, staggered polling
- Contract tests per connector
- Employer board wins over aggregator copies

## Common mistakes
- Scraping sites whose terms forbid it
- Treating aggregator salary estimates as posted
- Closing jobs after one missed poll

## References
- docs/job-data-sources.md · skill: background-jobs
