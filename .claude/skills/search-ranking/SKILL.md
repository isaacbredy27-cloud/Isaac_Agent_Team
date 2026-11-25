---
name: search-ranking
description: Ranking and filtering the jobs list — sort by score then recency, tie-breakers, filter semantics (score, salary incl. missing, experience level, industry, remote/hybrid/on-site, posted within), URL-persisted filters, dedupe-aware ranking. Use for list ordering, filters or "why is this job above that one" questions.
metadata:
  owner: candidate-job-matching-expert
  backups: [mobile-pwa-expert]
  version: 1.0.0
---

# Search Ranking

## Use when
- Changing list order or filters
- Explaining why one job ranks above another

## Inputs → Outputs
- Inputs: Scored jobs, filter state.
- Outputs: Stable, filtered, ordered list; URL state.

## Purpose
Put the jobs worth applying to first, predictably.

## Default order
1. Score (desc) 2. Hard-gate failures last within band 3. `postedAt` (desc) 4. Posted salary present 5. Job ID (stable tiebreak).

## Filters (AND across groups, OR within a group)
| Filter | Semantics |
|---|---|
| Score | range + band toggles |
| Salary | overlap of [min,max] with posted range; "include unknown" toggle |
| Experience | Entry 0–2, Mid 3–5, Senior 6–9, Manager 10+ (from job min years or seniority) |
| Industry | registry sector |
| Arrangement | remote / hybrid / onsite; "unknown" only when no filter |
| Posted within | 24 h / 7 d / 30 d on `postedAt ?? firstSeenAt` |

## Rules
- Pure function over loaded data; runs in the browser.
- Serialize filters to the URL query.
- Never boost by employer payment (none exists; keep it that way).

## Common mistakes
- Hiding unknown-salary jobs by default.
- Unstable sort causing list jumps.

## Checklist
- [ ] Stable tiebreak
- [ ] Unknown salary handled
- [ ] Filters serialised to URL
- [ ] Tests for combined filters

## References
- docs/resume-match-dashboard.md §3
