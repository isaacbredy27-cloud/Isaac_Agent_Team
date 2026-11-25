---
name: match-explanations
description: The match explanation engine — Claude writes strengths, gaps (deal-breaker likely/possible/unlikely), resume improvements, application recommendation text and interview-readiness from the MatchResult evidence only; evidence check; template fallback; caching. Use when changing explanation prompts, schema or UI copy.
metadata:
  owner: candidate-job-matching-expert
  backups: [ai-systems-engineer, ux-designer-apple-hig]
  version: 1.0.0
---

# Match Explanations

## Use when
- Changing explanation prompts, schema or UI copy
- An explanation names something not in the evidence

## Inputs → Outputs
- Inputs: MatchResult evidence, job title, profile summary.
- Outputs: Validated MatchExplanation or template fallback.

## Purpose
Explain the score honestly and usefully, without changing it.

## Flow
1. Code computes `MatchResult` (skill: candidate-job-scoring).
2. Send only evidence + job title/employer + short profile summary inside `<evidence>` tags.
3. Claude returns `MatchExplanation` via structured outputs (skill: claude-api).
4. Validate: every skill/cert named must exist in evidence; drop others.
5. Recommendation and readiness level come from code; Claude writes the reasons.
6. Cache by `(jobId, profileHash, weightsVersion)`. Fallback: template from evidence.

## Band tone
- Green: what fits closely; top 2 tailoring keywords.
- Yellow: met vs missing; deal-breaker judgement (required+gate = likely; required = possible; preferred = unlikely).
- Red: major gaps first; 2–4 concrete future actions (skill: finance-career-paths). Supportive, never discouraging (skill: ux-writing).

## Checklist
- [ ] 0 unsupported claims in eval set
- [ ] Reading level ≤ grade 8
- [ ] Works with Claude down (template)

## Best practices
- Evidence in, prose out
- Code chooses recommendation and readiness
- Cache per (job, profile, weights)

## Common mistakes
- Sending the full resume again
- Letting the model pick apply/skip
- No fallback when Claude is unavailable

## References
- docs/match-scoring.md §8
