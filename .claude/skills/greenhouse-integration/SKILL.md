---
name: greenhouse-integration
description: Greenhouse Job Board API connector — GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true (no auth), fields (id, title, location.name, updated_at, first_published, requisition_id, absolute_url, content HTML-escaped, departments, offices, metadata, company_name), pay_transparency, normalization. Use when adding or debugging a Greenhouse employer.
metadata:
  owner: job-data-integration-expert
  backups: [netlify-engineer]
  version: 1.0.0
---

# Greenhouse Integration

## Purpose
Ingest Orlando finance jobs from employers that use Greenhouse.

## Use when
- Adding a Greenhouse employer
- A Greenhouse connector test fails

## Inputs → Outputs
- Inputs: Board token from the employer registry.
- Outputs: NormalizedJob records.

## Endpoint
`GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true` — public, no auth for GET.
Single job: `/v1/boards/{token}/jobs/{id}`; add `?pay_transparency=true` for `pay_input_ranges` where enabled.

## Real response shape (captured 2026-11-25, figma board)
Top level `{ jobs: [...], meta: { total } }`. Job keys: `absolute_url, application_deadline, company_name, content, data_compliance, departments, first_published, id, internal_job_id, language, location{name}, metadata, offices, requisition_id, title, updated_at`.

## Mapping → NormalizedJob
| NormalizedJob | Greenhouse |
|---|---|
| requisitionId | `requisition_id ?? internal_job_id` |
| title | `title` |
| location | `location.name` (may list several, separated by "•") |
| postedAt | `first_published ?? updated_at` |
| applyUrl | `absolute_url` |
| descriptionText | `content` → HTML-unescape → strip tags → sanitize |

## Gotchas
- `content` is HTML-escaped HTML; unescape before stripping.
- Multi-location strings: split on "•" and test each for Orlando MSA.
- No documented rate limit: poll once per 2 hours per board.
- Board token is the slug in the employer's `boards.greenhouse.io/<token>` URL.

## Best practices
- Poll each board at most every 2 hours
- Prefer first_published for postedAt
- Unescape then strip HTML
- Contract-test against a recorded response

## Checklist
- [ ] Board token verified
- [ ] Fixture-based test passes
- [ ] Location split and MSA check works

## Common mistakes
- Treating content as plain HTML (it is escaped)
- Using updated_at as posted date
- Ignoring multi-location strings

## References
- https://developers.greenhouse.io/job-board.html
- knowledge/job-data-integration-expert/examples/fixtures/greenhouse-board.json
