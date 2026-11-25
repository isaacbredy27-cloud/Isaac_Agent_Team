# Platform constraints that drive architecture

Sources (read 2026-11-24/25): https://docs.netlify.com/build/functions/configuration/ · https://docs.netlify.com/build/data-and-storage/netlify-blobs/ · https://www.netlify.com/pricing/ · https://platform.claude.com/docs/en/api/rate-limits · https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api

| Constraint | Value | Design consequence |
|---|---|---|
| Sync function limit | 60 s | Stream long Claude output; move batch work to background |
| Background limit / payload | 15 min / 256 KB | Pass IDs, keep inputs in Blobs, checkpoint |
| Scheduled limit | 30 s | Scheduler only fans out |
| Buffered / streamed payload | 6 MB / 20 MB | Resume cap 5 MB, raw bytes not base64 |
| Blobs consistency | eventual ≤ 60 s; strong optional | Strong for tasks, profiles, proposals, audit |
| Blobs object / key | 5 GB / 600 bytes; list pages 1,000 | Index files per day |
| Netlify Free credits | 300/month; overage pauses **all** projects | CDN caching, 2-hour polling (ADR 0003) |
| Env var scopes | Pro only | Secrets also visible to builds on Free |
| Claude Tier 1 (Opus 5.5) | 4,000 RPM, 2M ITPM, 400k OTPM | Cache prompts; per-user budgets |
| GitHub PAT | 5,000/h; 80 writes/min | One atomic commit per proposal |
