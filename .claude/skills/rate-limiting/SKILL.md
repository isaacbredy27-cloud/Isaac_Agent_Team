---
name: rate-limiting
description: Rate limits and budgets — Netlify code-based rateLimit config (windowLimit, windowSize ≤ 180 s, aggregateBy ip/domain, action rate_limit or rewrite; all plans), per-user Claude token budgets in Blobs, upload caps, Claude 429 retry-after, GitHub secondary limits, Free-plan credit protection. Use when exposing an endpoint or calling a paid API.
metadata:
  owner: security-expert
  backups: [netlify-engineer, ai-systems-engineer]
  version: 1.1.0
---

# Rate Limiting

## Purpose
Keep endpoints and paid APIs safe from abuse and runaway cost.

## Use when
- Exposing a new endpoint
- Calling Claude or GitHub
- Credits or spend rise unexpectedly

## Inputs → Outputs
- Inputs: Route, expected traffic, cost per call.
- Outputs: rateLimit config, app budget, 429 handling.

## Edge limits (Netlify, all plans, code only)
```ts
export const config: Config = {
  path: "/api/resume",
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
```
- `windowSize` max 180 s; `action: "rewrite"` + `to` for a friendly page; 2 rulesets per project max.

## Defaults
| Route | Limit |
|---|---|
| `/api/resume` upload | 5/min/IP; 3/day/user |
| `/api/agents/chat` | 20/min/IP |
| `/api/match/*` | 60/min/IP |
| `/api/jobs` | 120/min/IP (CDN cached) |
| `/api/agents/*` (`super_admin` + aal2) | 20/min/IP |
| `/api/proposals/*/approve` | 5/min/IP |
| `/api/account/*` | 5/min/IP |

## App budgets
- Claude tokens per user per day: users 200k, `super_admin` 2M (Blobs `ratelimit` store, strong consistency).
- Anthropic Console workspace spend limit below org cap.
- Free-plan credits: CDN caching + 2-hour polling (ADR 0003).

## Supabase Auth limits (read 2026-11-25)
Source: https://supabase.com/docs/guides/auth/rate-limits
- Emails on built-in SMTP: 2/hour. Custom SMTP before launch (project lead decision).
- Sign up/sign in 30 per 5 min; token refresh 150 per 5 min; verify 30 per 5 min; OTP 60 s per user.
- MFA challenge/verify: 15/min, not configurable.
- Log 401s to function logs; audit 403s on `super_admin` routes.
- Netlify allows 2 rulesets per project (to verify with netlify-engineer); share rules across routes if needed.

## Upstream limits
- Claude: 429 with `retry-after`; Tier 1 Opus 5.5 4,000 RPM.
- GitHub: 5,000/h; 80 writes/min; 500 writes/h.

## Best practices
- Edge limits for every public route
- App budgets for Claude per user
- Respect upstream retry-after

## Checklist
- [ ] `rateLimit` set with `path`
- [ ] Budget check before Claude calls
- [ ] Friendly 429 message
- [ ] Test for 429

## Common mistakes
- Trying to set function rate limits in netlify.toml
- windowSize above 180 s
- Retrying 429s immediately

## References
- https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/
- https://platform.claude.com/docs/en/api/rate-limits
- https://supabase.com/docs/guides/auth/rate-limits (read 2026-11-25)
