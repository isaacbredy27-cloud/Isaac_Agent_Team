# Taxonomy

Owner: `finance-job-market-specialist`. Version 1, written 2026-11-25.

## Files

| File | Content |
|---|---|
| `skills.v1.json` | 65 skills, 26 titles, 14 certifications, 4 education levels |

## Rules

- Aliases are lowercase. Punctuation becomes a space (`fp&a` is `fp a`).
- Match order: exact alias scores 1.0. A related edge scores its weight. Else log as unknown.
- Related weights run 0.3 to 0.8 and are symmetric.
- Title `seniority` runs 1 to 5. Education `level` runs 1 to 4.
- Any change bumps the version. Rerun scoring tests after each change.

## Sources (all read 2026-11-25)

- Role-to-skill and credential map: skill `finance-career-paths`.
- Seed phrases from live Orlando postings, sample of 2026-11-24 (Berkadia, AMERICAN SYSTEMS, Reyes). See `knowledge/finance-job-market-specialist/docs/orlando-postings-sample-2026-11.md`.
- Occupation groups: BLS OEWS, Orlando MSA 36740, May 2025. See `knowledge/finance-job-market-specialist/docs/bls-oews-orlando-may2025.md`.
- Education and licensing: https://www.bls.gov/ooh/business-and-financial/financial-analysts.htm
- Skill seed list: O*NET technology skills, https://www.onetonline.org/ (not fetched for v1; aliases come from the sources above and domain knowledge).

## Known gaps

- Weights are first estimates. No recruiter review yet. Target is 90% label agreement.
- No coverage test on 100 postings yet. Target is 95% of skill phrases.
- No industries file yet.
