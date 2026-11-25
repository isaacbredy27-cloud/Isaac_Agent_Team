# Worked example (draft, not accepted): ADR 0006 — Triggers for adding a database

Status: **Proposed** (example only) · Date: 2026-11-25 · Decider: project lead

## Context
Phase 1 stores jobs and profiles in Netlify Blobs (docs/netlify-architecture.md §5). Blobs is a key/value store: list pages hold 1,000 entries and reads are eventually consistent by default (≤ 60 s). Free-plan credits are limited (ADR 0003).

## Decision
Stay on Blobs until any trigger fires:
1. More than 20,000 active jobs.
2. A feature needs cross-user queries or server-side SQL filtering.
3. p95 `/api/jobs` exceeds 300 ms after CDN caching because of list paging.
Then adopt a managed Postgres behind the existing `JobRepo`/`ProfileRepo` interfaces.

## Consequences
- No new vendor now; one swap point later.
- Monitoring must track job count and `/api/jobs` latency (skill: observability).
- A database adds cost; the lead re-checks ADR 0003 at that time.
