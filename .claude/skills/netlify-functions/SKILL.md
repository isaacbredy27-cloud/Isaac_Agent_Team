---
name: netlify-functions
description: Netlify Functions for Finance Match Orlando — modern (req, context) API, routing, limits (60 s sync, 15 min background, 30 s scheduled, 6 MB buffered, 20 MB streamed, 256 KB background payload), env vars, streaming and per-function rate limits. Use when writing or reviewing anything in netlify/functions/.
metadata:
  owner: netlify-engineer
  backups: [agent-console-engineer, software-architect]
  version: 1.0.0
---

# Netlify Functions

## Purpose
Build server-side endpoints that hold every secret and every Claude, GitHub and job-source call.

## Use when
- Adding or changing a file in `netlify/functions/`.
- Choosing sync vs streaming vs background vs scheduled.
- Reviewing a PR for limits, secrets or caching headers.

## Inputs → Outputs
- Inputs: endpoint contract (`packages/schemas`), auth rule, limits.
- Outputs: function file + `config` export + tests + updated route table in `docs/netlify-architecture.md`.

## Hard facts (Netlify docs, read 2026-11-25)
| Setting | Value |
|---|---|
| Default region / memory | `cmh` (US East, Ohio) / 1024 MB |
| Synchronous limit | 60 s (not configurable) |
| Scheduled limit | 30 s |
| Background limit | 15 min; returns 202; retries after 1 min, then 2 min |
| Payloads | 6 MB buffered, 20 MB streamed, 256 KB background |
| Runtime env vars | `URL`, `SITE_NAME`, `SITE_ID` (+ your own); `netlify.toml` env vars are **not** available to functions |
| Rate limits | `config.rateLimit` in code only (all plans); not in `netlify.toml` |

## Standard shape
```ts
import type { Config, Context } from "@netlify/functions";
export default async (req: Request, context: Context) => {
  const user = await requireUser(req);                 // skill: authentication
  // validate input with Zod; never trust the client
  return Response.json(body, { headers: { "Cache-Control": "private, no-store" } });
};
export const config: Config = {
  path: "/api/match/:jobId",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
```

## Best practices
- One function per route family. Shared code in `netlify/functions/_lib/`.
- Validate every input with Zod. Return 400 with a safe message.
- Personal routes: `Cache-Control: private, no-store` (ADR 0004).
- Read secrets with `process.env.X` inside the handler. Never at module top in shared client code.
- Keep work under 50 s; move longer work to a background function (skill: background-jobs).
- Streaming: return a `ReadableStream` body; the 60 s sync limit still applies.
- Background functions need an internal token header; reject without it.

## Checklist
- [ ] `config.path` set; `rateLimit` set on any public or Claude-backed route
- [ ] Auth + role check first line (skills: authentication, authorization)
- [ ] Zod input validation; typed output
- [ ] Correct `Cache-Control`
- [ ] No secret in logs or responses
- [ ] Unit/integration test (skill: testing-strategy)
- [ ] Credits impact considered (ADR 0003)

## Common mistakes
- Putting secrets in `netlify.toml` (functions cannot read them; and they land in git).
- Long Claude calls in a sync function without streaming → 60 s timeouts.
- Passing resume text in a background payload (256 KB limit, and privacy). Pass an ID.
- Forgetting that scheduled functions cannot be called by URL and run only on published deploys.

## References
- https://docs.netlify.com/build/functions/configuration/
- https://docs.netlify.com/build/functions/get-started/
- https://docs.netlify.com/build/functions/environment-variables/
- https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/
- ADR 0003, ADR 0004
