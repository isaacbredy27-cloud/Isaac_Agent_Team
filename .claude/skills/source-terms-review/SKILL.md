---
name: source-terms-review
description: Reviewing a job source's terms of service, robots.txt and licence before ingestion — decision record in the employer registry (allowed, termsUrl, termsReviewedAt, notes), annual re-review, excluded sources (LinkedIn, Indeed, Glassdoor), storage and attribution limits. Use before enabling any Tier 2 or Tier 3 source.
metadata:
  owner: privacy-compliance-specialist
  backups: [job-data-integration-expert]
  version: 1.0.0
---

# Source Terms Review

## Use when
- Before enabling any Tier 2 or Tier 3 source
- Yearly re-review
- A site changes its terms

## Inputs → Outputs
- Inputs: Source URL, terms, robots.txt, licence.
- Outputs: Terms record and registry decision.

## Purpose
Collect only what we are allowed to collect, and prove it.

## Procedure
1. Read the site's terms of use and robots.txt (and licence for feeds).
2. Check: automated access allowed? storage allowed? redisplay allowed? attribution? rate limits?
3. Record in `data/registry/terms/<source>.md` and the registry fields: `allowed`, `termsUrl`, `termsReviewedAt`, `robotsCheckedAt`, `limits`, `notes`.
4. `allowed: false` → connector disabled in code.
5. Re-review yearly or when the site changes.
6. Legal conclusions belong to counsel; this review flags and records.

## Defaults
- Official public APIs (Greenhouse, Lever, USAJOBS): allowed for listing and linking.
- LinkedIn, Indeed, Glassdoor: excluded.
- Always link to the employer apply URL; never present a posting as our own.
- Delete descriptions 30 days after a job closes.

## Best practices
- Record, don't remember
- When unsure, keep disabled and ask counsel

## Checklist
- [ ] Terms read and linked
- [ ] robots.txt checked
- [ ] Storage and redisplay rules noted
- [ ] Next review date set

## Common mistakes
- Assuming public means permitted
- Never re-checking terms

## References
- docs/job-data-sources.md §8
