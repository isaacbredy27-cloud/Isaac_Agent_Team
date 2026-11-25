---
name: workday-integration
description: Workday career sites (myworkdayjobs.com) — no public third-party API; read public posting pages, prefer JobPosting JSON-LD, respect robots.txt and terms, low request rates, relative "Posted N days ago" dates, contract tests. Use when an Orlando employer (e.g., Berkadia, SeaWorld) posts on Workday.
metadata:
  owner: job-data-integration-expert
  backups: [privacy-compliance-specialist]
  version: 1.0.0
---

# Workday Integration

## Purpose
Ingest jobs from employer career sites on Workday, respectfully and within their terms.

## Use when
- Adding a Workday employer
- A Workday page stops parsing

## Inputs → Outputs
- Inputs: Career-site URL and terms decision.
- Outputs: NormalizedJob records.

## Facts
- Workday's official API is tenant-scoped OAuth for the employer, not for us.
- Public postings live at `https://{tenant}.wd{N}.myworkdayjobs.com/{site}/job/{location}/{slug}_{reqId}`.
- The page loads data from an internal `wday/cxs` JSON endpoint. It is undocumented; do not depend on it at volume.

## Approach (Tier 2)
1. Registry entry with `allowed: true` and a terms review (skill: source-terms-review).
2. Fetch the listing page ≤ once per 2 hours; fetch new posting pages only.
3. Parse JSON-LD `JobPosting` (skill: job-posting-structured-data); else readable text.
4. Requisition ID: suffix after the last `_` in the URL (e.g. `R-00250`).
5. "Posted Today / N days ago" → compute `postedAt` from fetch date; mark approximate.

## Risks
- Markup changes without notice → contract test per employer, alert on zero results.
- Terms may restrict automated access → stop that employer if disallowed.

## Best practices
- Terms review first
- JSON-LD before HTML
- Low request rate
- Contract test per employer

## Checklist
- [ ] `allowed: true` in registry
- [ ] Requisition ID parsed from URL
- [ ] Relative dates converted and marked approximate

## Common mistakes
- Hammering the internal cxs endpoint
- Treating 'Posted 30+ days ago' as an exact date

## References
- docs/job-data-sources.md §3.5
- https://developers.google.com/search/docs/appearance/structured-data/job-posting
