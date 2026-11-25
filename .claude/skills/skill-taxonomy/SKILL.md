---
name: skill-taxonomy
description: The versioned finance skills, titles, certifications and industries taxonomy in data/taxonomy — canonical IDs, aliases, related-skill partial-credit edges, title→role family/seniority, transferable-skill weights, and how to add terms. Use when mapping resume or job text to canonical terms or editing taxonomy JSON.
metadata:
  owner: finance-job-market-specialist
  backups: [resume-analysis-expert, candidate-job-matching-expert]
  version: 1.0.0
---

# Skill Taxonomy

## Inputs → Outputs
- Inputs: Raw phrases from resumes and postings.
- Outputs: Canonical IDs with match weights; unknown-term log.

## Purpose
One shared vocabulary so resumes and jobs compare fairly.

## Use when
- Editing `data/taxonomy/*.v<N>.json`.
- An "unknown term" backlog grows.

## Files
| File | Content |
|---|---|
| `skills.v1.json` | id → label, aliases[], category (tool/domain/soft), related{id: weight 0.3–0.8} |
| `titles.v1.json` | raw title patterns → normalized title, family, level 1–5 |
| `certifications.v1.json` | CPA, CFA (L1–L3), CMA, FRM, CTP, SIE, SERIES_7, SERIES_66, CFP, PMP |
| `industries.v1.json` | NAICS-sector labels + adjacency |

## Rules
- Lowercase, NFKC, strip punctuation before matching.
- Exact alias → 1.0; related edge → its weight; else unknown (logged).
- Content changes by finance-job-market-specialist; matching code by resume-analysis-expert.
- Any change bumps the version and reruns scoring tests.
- Seed sources: O*NET technology skills (13-2051, 13-2011, 13-2041, 13-2054, 11-3031) and live Orlando postings.

## Checklist
- [ ] No duplicate aliases across ids
- [ ] Related weights 0.3–0.8 and symmetric where sensible
- [ ] Version bumped; changelog line

## Common mistakes
- Near-duplicate ids ("excel", "ms_excel").
- Over-generous related weights that inflate scores.

## References
- https://www.onetonline.org/
- docs/resume-analysis.md §6
