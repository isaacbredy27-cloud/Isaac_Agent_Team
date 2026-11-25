---
name: usajobs-integration
description: USAJOBS Search API for federal finance jobs in Orlando — GET https://data.usajobs.gov/api/Search with Host, User-Agent (registered email) and Authorization-Key headers; Keyword, LocationName, Radius, JobCategoryCode (0501, 0510, 0560), DatePosted, ResultsPerPage; GS title mapping. Use when adding federal jobs.
metadata:
  owner: job-data-integration-expert
  backups: [finance-job-market-specialist]
  version: 1.0.0
---

# USAJOBS Integration

## Purpose
Add federal finance jobs in the Orlando area from the official USAJOBS API.

## Use when
- Ingesting federal postings
- Mapping GS grades to seniority

## Inputs → Outputs
- Inputs: Search parameters, API key, contact email.
- Outputs: NormalizedJob records with GS salary.

## Request
```
GET https://data.usajobs.gov/api/Search?LocationName=Orlando,%20Florida&Radius=50&JobCategoryCode=0501;0510;0560&DatePosted=30&ResultsPerPage=100
Host: data.usajobs.gov
User-Agent: <email registered for the key>
Authorization-Key: <key from developer.usajobs.gov/apirequest>
```
- Key and email are secrets/config in Netlify env (`USAJOBS_KEY`, `USAJOBS_EMAIL`); the email is the project's ops address, not a person's private address.

## Mapping
- Series 0501 Financial Administration, 0510 Accounting, 0560 Budget Analysis → title taxonomy `federal_financial_analyst` etc.
- Salary is always present (GS ranges) → `source: "posted"`.
- GS grade → seniority: GS-7/9 → 2, GS-11/12 → 3, GS-13+ → 4.

## Best practices
- Keep key and email in env vars
- Query finance series only
- Poll every 2 hours

## Checklist
- [ ] Headers set (Host, User-Agent, Authorization-Key)
- [ ] Series filter applied
- [ ] GS mapping tested

## Common mistakes
- Using a personal email as User-Agent in code
- Ignoring Radius (pulls statewide jobs)

## References
- https://developer.usajobs.gov/general/quick-start
- https://developer.usajobs.gov/api-reference/get-api-search
