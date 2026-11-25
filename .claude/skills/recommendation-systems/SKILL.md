---
name: recommendation-systems
description: Recommendation logic beyond the score — apply-now / tailor / stretch / skip rules, new-match alerts, diversity across employers, cold start (no resume), feedback loop from saved/applied/interview outcomes with consent, calibration via logistic regression. Use when deciding what to recommend or how outcome data may change weights.
metadata:
  owner: candidate-job-matching-expert
  backups: [ai-systems-engineer, privacy-compliance-specialist]
  version: 1.0.0
---

# Recommendation Systems

## Use when
- Changing recommendation rules, alerts or feed order
- Learning from outcome data

## Inputs → Outputs
- Inputs: MatchResults, saved/applied events (consented).
- Outputs: Recommendation per job, alert list, proposed weight version.

## Purpose
Recommend actions, not just ranks — and learn safely from outcomes.

## Application recommendation (code)
| Condition | Recommendation |
|---|---|
| Green, no failed gates | apply_now |
| Yellow, no failed gates, ≤ 2 missing required | apply_with_tailoring |
| Yellow with one failed soft gate | stretch_apply |
| Red or failed hard gate | skip_for_now |

## Feed hygiene
- Max 3 jobs per employer in the top 10 (diversity).
- New-match alert only for new Green jobs, max one digest per day.
- Cold start: show recent jobs sorted by recency with "Upload a resume to rank these."

## Learning loop
- Log saved/applied/interview/offer **only with consent** (skill: privacy-and-data-protection).
- After ~300 labelled outcomes: fit logistic regression on sub-scores; propose new weights as a new version; check adverse impact (skill: fairness-in-hiring); project lead approves.

## Common mistakes
- Letting click-through drive weights (popularity ≠ fit).
- Training on protected attributes or their proxies.

## Best practices
- Rules in code
- Diversity across employers
- Consent before learning

## Checklist
- [ ] Rule table tested
- [ ] Fairness review before weight change
- [ ] Lead approval recorded

## References
- docs/match-scoring.md §5.4, §8.4
