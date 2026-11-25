---
name: ai-evaluation
description: Evaluating LLM features and agents — labelled datasets, metrics (field accuracy, recall, precision, evidence consistency, recruiter rating), held-out sets, regression gates, eval-before-model-change, budget approval. Use before changing a prompt, model, effort or agent, and for agent quality reviews.
metadata:
  owner: ai-systems-engineer
  backups: [qa-engineer, meta-agent]
  version: 1.0.0
---

# AI Evaluation

## Inputs → Outputs
- Inputs: Frozen labelled inputs, baseline and candidate outputs.
- Outputs: Metric table, pass/fail against gates, recommendation.

## Purpose
Prove a change helps before it ships.

## Use when
- Any prompt/model/effort change.
- Quarterly agent scorecards (skill: agent-design).

## Eval sets
| Feature | Set | Gate |
|---|---|---|
| Resume extraction | 50 synthetic labelled resumes (PDF/DOCX, 1- and 2-column, 1 scanned) | Titles/dates ≥ 95%; cert recall ≥ 95%; skill precision ≥ 90% |
| Job requirement extraction | 100 labelled Orlando postings | Required/preferred split ≥ 90%; clearance/license gate recall 100% |
| Explanations | 50 MatchResults | 0 unsupported skills; recruiter mean ≥ 4/5 |
| Agents | ≥ 10 golden + 3 boundary + 3 injection tasks each | Quality ≥ 4.0; no hard failures |

## Method
1. Freeze inputs; store expected outputs in `tests/evals/<feature>/`.
2. Run baseline and candidate on the same inputs.
3. Compare metrics; a regression > 1 point blocks the change.
4. Keep ≥ 3 held-out cases never used for tuning; refresh quarterly.
5. Live API runs cost money: get the project lead's budget approval first.

## Checklist
- [ ] Synthetic data only (ADR 0004)
- [ ] Baseline recorded
- [ ] Held-out set untouched
- [ ] Result summary in PR

## Common mistakes
- Tuning on the test set.
- Judging by one example.

## Best practices
- Freeze inputs before comparing
- Report per-metric, not one blended number
- Keep a held-out set
- Prefer deterministic graders; use rubric grading for prose

## References
- https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
