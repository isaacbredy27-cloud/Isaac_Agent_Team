---
name: fairness-in-hiring
description: Fairness and anti-discrimination checks for an automated job-matching tool — no protected attributes or proxies in scoring, four-fifths (80%) adverse-impact rule from 29 CFR 1607.4(D), outcome-data consent, gap-year handling, review before weight changes. Use before changing weights, features, gates or outcome learning.
metadata:
  owner: privacy-compliance-specialist
  backups: [candidate-job-matching-expert, finance-job-market-specialist]
  version: 1.0.0
---

# Fairness in Hiring

## Use when
- Adding a scoring feature or gate
- Changing weights from outcome data
- Reviewing explanation wording for bias

## Inputs → Outputs
- Inputs: Feature list, weight change, synthetic cohorts.
- Outputs: Fairness review note with impact ratios and decision.

## Purpose
Keep scores job-related and avoid disparate impact.

## Rules
- Never use: age, birth year, graduation year as age proxy, gender, race, ethnicity, religion, disability, marital status, photos, names, addresses beyond city/state.
- Employment gaps do not reduce scores.
- Gates must quote the posting (job-related requirement), not our inference.
- Weight changes from outcome data require an adverse-impact review.

## Four-fifths rule (29 CFR 1607.4(D))
"A selection rate for any race, sex, or ethnic group which is less than four-fifths (4/5) (or eighty percent) of the rate for the group with the highest rate will generally be regarded … as evidence of adverse impact." Smaller differences can still matter if statistically and practically significant.
We collect no protected attributes, so we test proxies on synthetic cohorts and review features for proxy risk.

## Checklist
- [ ] Feature list reviewed for proxies
- [ ] Synthetic cohort test before weight change
- [ ] Decision recorded in an ADR

## Common mistakes
- Using graduation year (an age proxy)
- Penalising employment gaps
- Assuming no protected data means no bias

## References
- https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XIV/part-1607/section-1607.4
