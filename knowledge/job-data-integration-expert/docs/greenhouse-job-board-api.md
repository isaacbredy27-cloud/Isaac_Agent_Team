# Greenhouse Job Board API — notes

Source: https://developers.greenhouse.io/job-board.html (read 2026-11-24). Real response captured 2026-11-25 from https://boards-api.greenhouse.io/v1/boards/figma/jobs?content=true.

- Base URL: `https://boards-api.greenhouse.io`.
- List jobs: `GET /v1/boards/{board_token}/jobs`; add `?content=true` for the full description, departments and offices.
- **No authentication for GET.** (Only application POSTs need a key.)
- Documented job fields: `id`, `title`, `location`, `updated_at`, `absolute_url`, `content`, `departments`, `offices`, `metadata`.
- Pay transparency: `pay_transparency` query parameter returns `pay_input_ranges` when the employer entered them.
- The docs page does not state a rate limit. Poll politely (our rule: once per 2 hours per board, ADR 0003).

## Observed in the real response (not all are in the docs table)
Top level: `{ "jobs": [...], "meta": { "total": 146 } }`.
Job keys: `absolute_url, ai_disclaimer, ai_opt_out_request_url, application_deadline, company_name, content, data_compliance, departments, first_published, id, include_ai_disclaimer, internal_job_id, language, location, metadata, offices, requisition_id, title, updated_at`.
- `content` is **HTML-escaped HTML** (`&lt;p&gt;…`). Unescape, then strip tags.
- `location.name` can hold several places joined by " • ".
- `first_published` is the best "posted" date; `updated_at` changes on edits.
