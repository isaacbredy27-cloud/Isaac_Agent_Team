---
name: lever-integration
description: Lever Postings API connector — GET https://api.lever.co/v0/postings/{site}?mode=json (EU: api.eu.lever.co), filters (location, commitment, team, department, level, skip, limit), fields (id, text, categories, createdAt ms, workplaceType, salaryRange, descriptionPlain, lists, hostedUrl, applyUrl, country). Use when adding or debugging a Lever employer.
metadata:
  owner: job-data-integration-expert
  backups: [netlify-engineer]
  version: 1.0.0
---

# Lever Integration

## Purpose
Ingest Orlando finance jobs from employers that use Lever.

## Use when
- Adding a Lever employer
- A Lever connector test fails

## Inputs → Outputs
- Inputs: Lever site slug (and EU flag).
- Outputs: NormalizedJob records with salary and workplace type.

## Endpoint
`GET https://api.lever.co/v0/postings/{site}?mode=json` — public GET, no key. EU tenants: `https://api.eu.lever.co/v0/postings/{site}`.
Filters: `location`, `commitment`, `team`, `department`, `level`, `group`, `skip`, `limit`.

## Mapping → NormalizedJob
| NormalizedJob | Lever |
|---|---|
| requisitionId | `id` |
| title | `text` |
| location | `categories.allLocations ?? [categories.location]` |
| workArrangement | `workplaceType` (`onsite` / `hybrid` / `remote`) |
| salary | `salaryRange{min,max,currency,interval}`; `per-year-salary` → YEAR |
| postedAt | `new Date(createdAt)` (epoch ms) |
| applyUrl | `applyUrl` (fallback `hostedUrl`) |
| descriptionText | `descriptionPlain` + each `lists[].text` + `lists[].content` |

## Gotchas
- `createdAt` is milliseconds, not seconds.
- Requirements often live in `lists`, not the description.
- Application POSTs (not used) are limited to 2/s and need a key.

## Best practices
- Use the EU host for EU tenants
- Convert createdAt from milliseconds
- Include lists[] in the description text

## Checklist
- [ ] Fixture test passes
- [ ] Salary interval mapped
- [ ] workplaceType mapped

## Common mistakes
- Reading createdAt as seconds
- Dropping requirements that live in lists[]

## References
- https://github.com/lever/postings-api
- knowledge/job-data-integration-expert/examples/fixtures/lever-postings.json
