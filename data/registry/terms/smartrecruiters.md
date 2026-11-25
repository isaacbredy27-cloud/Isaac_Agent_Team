# Source terms record: SmartRecruiters Posting API

| Field | Value |
|---|---|
| Source | SmartRecruiters public Posting API |
| Tier | 1 (official public API, no auth) |
| Docs URL | https://developers.smartrecruiters.com/docs/posting-api |
| Use | Read public postings; show title, employer, location; link to the posting to apply |
| Rate | 1 poll per employer per 2 hours, up to 5 pages of 100 (ADR 0003) |
| Status | **Pending lead approval.** Counsel to confirm before commercial launch. |
| Reviewed | 2026-11-25; next review 2027-11-25 |
| Notes | No employer is enabled until `allowed` is true and `termsReviewedAt` is set in `data/registry/employers.json`. |
