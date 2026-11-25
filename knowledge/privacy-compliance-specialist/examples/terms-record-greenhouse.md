# Worked example: source terms record (skill: source-terms-review)

File: `data/registry/terms/greenhouse-job-board-api.md`

| Field | Value |
|---|---|
| Source | Greenhouse Job Board API |
| Tier | 1 (official public API) |
| Docs URL | https://developers.greenhouse.io/job-board.html |
| Auth | None for GET (per docs) |
| Automated access | Allowed — the API exists for job-board display |
| Storage | Store fields needed for matching; delete descriptions 30 days after a job closes |
| Redisplay | Show title, employer, location, summary; always link to `absolute_url` to apply |
| Attribution | Employer name and link to the employer's posting |
| Rate limit | Not documented → our policy: 1 request per board per 2 hours (ADR 0003) |
| Decision | `allowed: true` |
| Reviewed | 2026-11-25 by privacy-compliance-specialist; next review 2027-11-25 |
| Notes | Not legal advice; counsel to confirm before commercial launch |
