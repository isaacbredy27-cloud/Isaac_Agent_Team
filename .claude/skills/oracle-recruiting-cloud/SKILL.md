---
name: oracle-recruiting-cloud
description: Oracle Recruiting Cloud "Candidate Experience" sites ({tenant}.fa.oraclecloud.com/hcmUI/CandidateExperience) — JavaScript-heavy public pages, why a licensed feed may be cheaper than a headless browser, terms review. Use when an employer such as JPMorgan Chase posts on Oracle.
metadata:
  owner: job-data-integration-expert
  backups: [privacy-compliance-specialist, netlify-engineer]
  version: 1.0.0
---

# Oracle Recruiting Cloud

## Purpose
Cover employers on Oracle Recruiting Cloud without running browsers in functions.

## Use when
- An employer like JPMorgan Chase posts only on Oracle

## Inputs → Outputs
- Inputs: Employer, terms decision, licence options.
- Outputs: Decision: licensed feed, JSON-LD-only ingestion, or skip.

## Facts
- Public search URL pattern: `https://{tenant}.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/{site}/jobs?location=…`.
- Pages render client-side; plain HTTP fetch returns little content.
- A headless browser would exceed Netlify function budgets and Free-plan credits (ADR 0003).

## Approach
1. Prefer a licensed jobs feed (Tier 3) for Oracle-hosted employers, after licence review.
2. If none: check whether each posting page exposes JSON-LD; ingest only those.
3. Never run a headless browser inside Netlify Functions.

## Best practices
- Prefer a licensed feed
- Never headless browsers in Netlify Functions

## Checklist
- [ ] Licence or terms reviewed
- [ ] Cost checked against ADR 0003

## Common mistakes
- Plain HTTP fetch expecting rendered jobs
- Burning Free-plan credits on rendering

## References
- docs/job-data-sources.md §3.7
