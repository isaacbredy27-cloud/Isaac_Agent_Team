# Lever Postings API — notes

Source: https://github.com/lever/postings-api (read 2026-11-24). Real response captured 2026-11-25 from https://api.lever.co/v0/postings/leverdemo?mode=json&limit=3.

- Endpoint: `https://api.lever.co/v0/postings/{site}?mode=json`. EU: `https://api.eu.lever.co/v0/postings/{site}`.
- Query filters: `mode`, `skip`, `limit`, `location`, `commitment`, `team`, `department`, `level`, `group`.
- Fields: `id`, `text` (title), `categories` (`commitment`, `department`, `location`, `team`, `allLocations`), `country`, `opening`, `description`, `descriptionPlain`, `descriptionBody`, `lists` (`[{ text, content }]`), `additional`, `hostedUrl`, `applyUrl`, `workplaceType`, `salaryRange`, `salaryDescription`, `createdAt`.
- GET needs no key. "To use the POST API, you need an API key." Application POSTs: "Lever will return a 429 … if your custom job site issues more than 2 application POST requests per second."

## Observed
- `createdAt` is **epoch milliseconds** (e.g. `1788199939703`).
- `workplaceType`: `onsite`, `hybrid`, `remote`.
- `salaryRange`: `{ "min": 85000, "max": 175000, "currency": "USD", "interval": "per-year-salary" }`.
- Requirements often sit in `lists` (e.g. "Skill Set:", "Qualifications").
