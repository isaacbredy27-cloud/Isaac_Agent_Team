# Source terms record: Greenhouse Job Board API (skill: source-terms-review)

| Field | Value |
|---|---|
| Source | Greenhouse Job Board API |
| Tier | 1 (official public API) |
| Docs URL | https://developers.greenhouse.io/job-board.html |
| Auth | None for GET (per docs) |
| Automated access | Allowed. The API exists for job-board display |
| Storage | Store fields needed for matching; delete descriptions 30 days after a job closes |
| Redisplay | Show title, employer, location, summary; always link to `absolute_url` to apply |
| Attribution | Employer name and link to the employer's posting |
| Rate limit | Not documented. Our policy: 1 request per board per 2 hours (ADR 0003) |
| Decision | `allowed: true` (per employer, once the lead approves) |
| Status | **Pending lead approval** |
| Reviewed | 2026-11-25; next review 2027-11-25 |
| Notes | Not legal advice; counsel to confirm before commercial launch. No employer is enabled until `termsReviewedAt` is set in `data/registry/employers.json`. |
