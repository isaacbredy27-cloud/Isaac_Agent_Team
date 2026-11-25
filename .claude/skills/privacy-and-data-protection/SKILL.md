---
name: privacy-and-data-protection
description: Privacy rules for Finance Match Orlando — resume confidentiality and purpose limitation (ADR 0004), data inventory, retention schedule, consent for outcome logging, delete-my-data, encryption, vendor terms (Anthropic, Netlify, auth provider), Florida s. 501.171 duties. Use for any feature that collects, stores, shares or deletes personal data.
metadata:
  owner: privacy-compliance-specialist
  backups: [security-expert, resume-analysis-expert]
  version: 1.0.0
---

# Privacy and Data Protection

## Purpose
Use personal data only for matching, keep it safe, and delete it on time.

## Use when
- Any feature that collects, stores, shares or deletes personal data
- A breach is suspected

## Inputs → Outputs
- Inputs: Feature spec, data flows, vendor terms.
- Outputs: Inventory update, retention rule, consent design, verdict.

## Non-negotiables (ADR 0004)
Resumes, extracted text and profiles are never public and are used only for candidate-job matching. Not for analytics, training, the Agent Console, tests or other users.

## Data inventory and retention
| Data | Store | Retention |
|---|---|---|
| Raw resume file | none (memory) | deleted after parse; opt-in 30 days encrypted |
| Profile | Blobs `profiles` (encrypted) | until deleted or 12 months inactive |
| Matches, explanations, saved | Blobs | same as profile |
| Outcome labels | Blobs, consented only | until consent withdrawn |
| Job postings | Blobs `jobs` | 30 days after close |
| Agent chats | Blobs | 90 days |
| Audit log | Blobs `audit` | 1 year |

## Consent
- Outcome logging (applied/interview/offer) is opt-in, off by default, revocable.
- No marketing use.

## Florida s. 501.171 (summary; counsel confirms)
- "Reasonable measures to protect and secure data in electronic form containing personal information."
- Breach notice to affected Floridians no later than 30 days after determination; to the Department of Legal Affairs within 30 days if 500+ affected.
- Dispose of records by making personal information unreadable.
Note: a resume alone may not meet the statute's "personal information" definition (name + SSN/ID/financial account/medical/etc.), but we protect it to the same standard.

## Checklist (new feature)
- [ ] Purpose fits ADR 0004
- [ ] Inventory and retention updated
- [ ] Delete-my-data covers new keys (test)
- [ ] No PII in logs/metrics
- [ ] Privacy notice updated if user-visible

## Best practices
- Collect the minimum
- Default to deleting raw files
- Consent before outcome logging
- Encrypt profiles at app level

## Common mistakes
- Logging resume snippets while debugging
- Keeping 'just in case' copies
- Putting personal data in JSON schemas sent to the API

## References
- https://www.flsenate.gov/Laws/Statutes/2024/501.171
- docs/security.md §9–§11 · ADR 0004
