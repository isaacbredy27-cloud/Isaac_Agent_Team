---
name: observability
description: Observability for Finance Match Orlando — health checks, metrics that matter (errors, latency, credits, Claude spend, ingestion freshness), alert thresholds and dashboards on a Free-plan budget. Use when adding metrics or alerts, or judging whether production is healthy.
metadata:
  owner: netlify-engineer
  backups: [security-expert, software-architect]
  version: 1.0.0
---

# Observability

## Inputs → Outputs
- Inputs: Logs, usage pages, synthetic checks.
- Outputs: Alerts with owners and runbooks; weekly ops review.

## Purpose
Know quickly when users are hurt, money is burning, or data is stale.

## Use when
- Adding an endpoint, job or Claude call.
- Defining alerts or a weekly ops review.

## Signals
| Signal | Source | Alert |
|---|---|---|
| Function error rate | Netlify function logs (24 h on Free) + Blobs error events | > 2% for 15 min |
| p95 latency `/api/jobs` | Synthetic check | > 800 ms |
| Netlify credits used | Netlify usage page (weekly) | 60% and 80% month-to-date |
| Claude spend | Anthropic Console usage | 50% and 80% of monthly budget |
| Ingestion freshness | `jobs/index` lastRun | > 4 h since success |
| Task dead letters | `tasks` store | any new `failed` |
| Unapproved push to main | GitHub audit vs proposal log | any |

## Practices
- `/api/health` returns build ID, time and dependency checks (no secrets).
- Correlate with a request ID header on every response.
- Free plan keeps logs 24 h: persist important events to Blobs (skill: logging-and-monitoring).
- Use Core Web Vitals field data via `web-vitals` (anonymous, no PII).

## Checklist
- [ ] New feature emits a success and a failure event
- [ ] Alert has an owner and a runbook link
- [ ] No PII or resume text in any metric label (ADR 0004)

## Common mistakes
- Alerting on everything (fatigue). Alert on user harm and money.
- Logging request bodies "temporarily".

## References
- https://www.netlify.com/pricing/ (log retention by plan)
- https://web.dev/articles/vitals
