---
name: resume-parsing
description: End-to-end resume pipeline — upload validation, text extraction (PDF/DOCX), Claude structured extraction into CandidateProfile, normalization to the taxonomy, experience math, user review step and privacy rules. Use for anything that turns an uploaded resume into a profile.
metadata:
  owner: resume-analysis-expert
  backups: [ai-systems-engineer, finance-job-market-specialist]
  version: 1.0.0
---

# Resume Parsing

## Inputs → Outputs
- Inputs: Uploaded file (PDF/DOCX).
- Outputs: Reviewed CandidateProfile; raw file discarded.

## Purpose
Accurate, private, reproducible candidate profiles.

## Use when
- Changing `packages/resume/**`, the upload endpoint, or CandidateProfile.

## Pipeline
1. Validate: extension allow-list (`.pdf`, `.docx`), magic bytes (`%PDF-`; ZIP `PK\x03\x04` with `word/document.xml`), ≤ 5 MB, ≤ 10 pages; server-generated ID, never the user's file name.
2. Extract text: PDF → skill pdf-processing; DOCX → skill docx-processing. NFKC-normalize.
3. If text < 200 chars/page or columns interleave → send PDF as a Claude `document` block instead.
4. Claude structured extraction (skill: claude-api) with `<resume>` tags; no tools.
5. Code normalization: merge overlapping dates; compute `totalYearsExperience`, `relevantFinanceYears`; map skills/titles/certs (skill: skill-taxonomy).
6. User reviews profile; inferred fields flagged.
7. Discard raw file unless user opted in (ADR 0004). Cache profile by `sha256(text)`.

## Checklist
- [ ] Synthetic fixtures only
- [ ] Field accuracy gates (skill: ai-evaluation)
- [ ] No resume text in logs/errors
- [ ] p95 ≤ 20 s for 5 MB

## Common mistakes
- Trusting `Content-Type` from the client (spoofable).
- Letting the model compute years of experience.
- Summing overlapping jobs.

## Best practices
- Validate first, parse second
- Code does dates and totals
- Let the user correct the profile
- Cache by text hash

## References
- docs/resume-analysis.md · ADR 0004
- https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- https://platform.claude.com/docs/en/build-with-claude/pdf-support
