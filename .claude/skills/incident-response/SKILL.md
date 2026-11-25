---
name: incident-response
description: Incident response runbook for Finance Match Orlando — severity levels, containment steps for leaked secrets, outages, Netlify pause, bad agent commit, and suspected resume data exposure (Florida s. 501.171 30-day notice). Use when something is broken or a security or privacy event is suspected.
metadata:
  owner: netlify-engineer
  backups: [security-expert, orchestrator]
  version: 1.0.0
---

# Incident Response

## Use when
- Production is broken or degraded
- A secret may have leaked
- Resume data may be exposed
- Netlify pauses the site

## Inputs → Outputs
- Inputs: Alert or report.
- Outputs: Contained incident, recovery, post-incident note.

## Purpose
Contain fast, recover safely, learn once.

## Severity
| Sev | Example | Response |
|---|---|---|
| 1 | Secret leaked; resume data exposed; site paused | Immediate; project lead paged |
| 2 | Core flow broken (upload, matches) | Within 1 h |
| 3 | Degraded (stale jobs, slow explanations) | Same day |

## Playbooks
- **Leaked GitHub token or Claude key:** revoke at GitHub/Anthropic Console → set new value in Netlify → redeploy → audit recent commits/usage → record (skill: secrets-management).
- **Bad agent commit on main:** approve the Revert proposal, or publish the previous Netlify deploy → root-cause the validator gap.
- **Netlify pause (credits exceeded):** all projects pause (ADR 0003). Lead decides: upgrade plan or wait for cycle; reduce polling; enable CDN caching.
- **Suspected resume exposure:** stop the leak path → preserve evidence (audit logs) → privacy-compliance-specialist assesses → counsel decides notices. Florida s. 501.171: notice to individuals no later than 30 days after determination; notice to the Department of Legal Affairs if 500+ Floridians affected, also within 30 days.

## Steps
1. Declare sev; one incident lead (netlify-engineer, or security-expert for security).
2. Contain. 3. Recover. 4. Communicate (lead). 5. Post-incident note in `docs/incidents/YYYY-MM-DD-slug.md` within 5 days: timeline, cause, fixes, ADR changes.

## Common mistakes
- Deleting evidence while cleaning up.
- Rotating a secret but not redeploying.

## Best practices
- Contain before investigating
- One incident lead
- Preserve evidence
- Write the post-incident note within 5 days

## Checklist
- [ ] Severity declared
- [ ] Containment done
- [ ] Lead informed
- [ ] Post-incident note filed

## References
- https://www.flsenate.gov/Laws/Statutes/2024/501.171
- https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
