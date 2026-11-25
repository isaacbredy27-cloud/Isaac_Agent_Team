---
name: candidate-job-scoring
description: The deterministic match score — model D weights (required skills 30, experience 20, education 10, certs 10, industry 10, preferred 10, title 5, location 5), sub-score formulas, weight redistribution, hard-gate caps, role-family presets, bands (Green 80–100, Yellow 60–79, Red < 60), versioning. Use for any change to packages/scoring or score display logic.
metadata:
  owner: candidate-job-matching-expert
  backups: [ai-systems-engineer, finance-job-market-specialist]
  version: 1.0.0
---

# Candidate–Job Scoring

## Use when
- Changing a weight, gate, sub-score or band
- Answering why a job scored what it did

## Inputs → Outputs
- Inputs: CandidateProfile, JobRequirements, taxonomy version.
- Outputs: MatchResult with score, band, sub-scores, gates, evidence.

## Purpose
Same inputs → same score, every time, with evidence.

## Rules
- Pure TypeScript in `packages/scoring`; no I/O, no model calls.
- Version every change (`weightsVersion`, `taxonomyVersion`).
- Claude never scores (skill: match-explanations).

## Sub-scores (0–1)
- Required skills: Σ best_match / N (exact 1.0; related edge weight; listed-only 0.85 vs quantified 1.0).
- Experience: in band → 1; below → (1 − (min−y)/min)^1.5; above max+3 → 0.85.
- Education: meets+field 1; meets 0.8; one below with equivalence 0.8; one below 0.3; else 0.
- Certifications: 0.7·required + 0.3·preferred; in-progress 0.5; unasked CPA/CFA +0.1 (cap 1).
- Industry: same 1; adjacent 0.6; domain keywords 0.5; none 0.2.
- Title: gap 0–1 → 1; 2 → 0.6; −1 → 0.7; else 0.3.
- Location: per docs/match-scoring.md §3.7.
- Redistribute weights of criteria the job does not state.

## Gates (cap final score)
Clearance missing but citizen 69 · not citizen 40 · required license 59 · required degree w/o equivalence 59 · sponsorship conflict 40. Each gate stores the posting quote.

## Presets
analyst: skills +5, experience −5 · manager: experience +5, certs +5, required −5, preferred −5.

## Bands
Round, then Green ≥ 80, Yellow 60–79, Red ≤ 59.

## Checklist
- [ ] Property tests: 0–100; adding a matched skill never lowers score
- [ ] Band edge tests 59/60/79/80
- [ ] ≥ 95% coverage
- [ ] Change > 10% band moves → project lead approval

## Common mistakes
- Letting Claude adjust a score
- Penalising unstated criteria instead of redistributing
- Changing weights without a version bump
- Gates without the posting quote

## References
- docs/match-scoring.md
