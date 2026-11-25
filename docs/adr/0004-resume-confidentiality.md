# ADR 0004 — Resumes are never public and are used only for matching

Status: Accepted · Date: 2026-11-25 · Decider: project lead

## Context

Resumes hold personal data. OWASP's File Upload Cheat Sheet recommends storing uploads outside the webroot with access limited to authorised users. Florida s. 501.171 requires "reasonable measures to protect and secure data in electronic form containing personal information" and secure disposal of records no longer retained.

## Decision

Uploaded resumes, the text extracted from them, and the candidate profiles derived from them:

1. **Are never exposed publicly.** No public URL, no static file, no CDN caching, no deploy-store blobs, no links in emails or logs.
2. **Are used only for candidate-job matching workflows:** parsing, profile review, scoring, match explanations, skill-gap analysis and the owner's own saved jobs.
3. **Are not used for** analytics, marketing, model training, the Agent Console, agent chats, debugging dumps, test fixtures or any other user.

## Rules that implement this

- Upload, parse, profile and match endpoints require the owner's valid session; responses carry `Cache-Control: private, no-store`.
- Raw files are parsed in memory and **discarded by default**. Optional retention is opt-in, encrypted (AES-256-GCM, app-level key) and 30 days maximum.
- Profiles are stored encrypted in a site-wide Blobs store keyed by a hashed user ID; strong consistency.
- No admin UI lists or opens resumes. Admins and agents have no read path to them.
- The service worker never caches upload or profile responses.
- Resume text goes to the Claude API only for extraction and explanations, with no tools enabled on those calls.
- Logs record event names and IDs only, never resume text, file names or contact details.
- Test fixtures use synthetic resumes only.
- "Delete my data" removes file, profile, matches and saved jobs at once.

## Consequences

- Support staff cannot inspect a user's resume to debug; users must reproduce issues with their own account.
- Security and privacy reviews check every new endpoint and log line against this ADR.

Referenced by: `docs/security.md`, `docs/resume-analysis.md`, skills `privacy-and-data-protection`, `resume-parsing`, `authorization`, `logging-and-monitoring`, `service-workers`.
