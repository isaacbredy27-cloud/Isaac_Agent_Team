# ADR 0003 — Deploy and operate on the Netlify Free plan

Status: Accepted · Date: 2026-11-25 · Decider: project lead

## Context

Netlify pricing (read 2026-11-25): the Free plan has a **300-credit monthly limit** covering production deploys, compute, form submissions, bandwidth and web requests. "When a site reaches its monthly usage limits, it enters a paused state until the start of the next billing cycle … if one project exceeds its limits, all projects on your account will be paused." Free includes code-based rate limiting and 24-hour function log history. It does not include basic-auth password headers or team management. Environment-variable **scopes** (e.g. Functions-only) are a Pro/Enterprise feature. Background Functions are available on credit-based plans including Free.

## Decision

Run on the **Free plan** until a trigger below is hit.

## Consequences and mitigations

| Free-plan limit | Mitigation |
|---|---|
| 300 credits/month; overage pauses every project | Cache `/api/jobs` at the CDN; poll job sources every **2 hours** (not hourly) and only Tier 1 sources at first; cap explanations per user per day; netlify-engineer checks usage weekly and alerts at 60% and 80% |
| No env-var scopes: secrets are visible to the build as well as functions | Never reference a secret in client code; no secret gets a client-exposed prefix (`VITE_`); CI fails if `dist/` contains key patterns; secrets read only inside functions |
| Function logs kept 24 hours | Write audit and error events to Netlify Blobs (`audit` store) and keep them 1 year |
| No basic-auth headers | Admin protection comes from the auth provider (MFA) and role checks in functions |
| No team management | One Netlify owner account; agents never hold Netlify credentials |
| Single production context secrets | `GITHUB_TOKEN` has a Production-only value; Deploy Previews get no GitHub write token (ADR 0001) |

## Triggers to revisit (upgrade to Personal or Pro)

- Projected usage above 80% of credits for two months.
- Need for Functions-only secret scopes or longer log retention.
- More than one maintainer needs Netlify access.
- A pause occurs once.

Referenced by: `docs/netlify-architecture.md`, `docs/security.md`, `docs/long-running-jobs.md`, skills `netlify-functions`, `netlify-deployment`, `rate-limiting`, `observability`.
