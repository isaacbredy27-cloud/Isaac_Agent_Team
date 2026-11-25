---
name: skill-gap-analysis
description: Skill-gap analysis across a user's top matches — aggregate missing required and preferred skills/certs over top 25 Green+Yellow jobs, count jobs per gap, what-if re-scoring to show band moves, and choosing the smallest next step. Use for the Skill gaps screen or gap advice in explanations.
metadata:
  owner: candidate-job-matching-expert
  backups: [finance-job-market-specialist, ux-designer-apple-hig]
  version: 1.0.0
---

# Skill-Gap Analysis

## Use when
- Building or changing the Skill gaps screen
- Writing gap advice

## Inputs → Outputs
- Inputs: Top Green and Yellow MatchResults, profile.
- Outputs: Ranked gap list with job counts and band upgrades.

## Purpose
Tell users which one skill would unlock the most jobs.

## Method
1. Take top 25 Green+Yellow matches.
2. Collect `evidence.missingRequired`, `missingPreferred`, `missingCerts`.
3. Count jobs per canonical gap; weight required 2× preferred.
4. What-if: add the gap to a cloned profile, re-score, count band upgrades.
5. Rank by (band upgrades, job count). Show top 10.
6. Attach a neutral learning link per gap (vendor docs, CFA Institute, AICPA, FINRA).

## Output
`[{ gap, kind: "skill"|"cert", jobsMissing, bandUpgrades, link }]`

## Common mistakes
- Counting gaps from Red jobs (noise).
- Affiliate or paid-course links.
- Advising a CPA when an Excel/Adaptive course closes most gaps.

## Best practices
- Rank by real band upgrades
- Neutral learning links only

## Checklist
- [ ] What-if re-score tested
- [ ] Red jobs excluded
- [ ] Top 10 shown

## References
- docs/resume-match-dashboard.md §6 · skill: finance-career-paths
