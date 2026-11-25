---
name: security-architecture
description: Security architecture and threat model for Finance Match Orlando mapped to OWASP Top 10:2025 and OWASP LLM01 — assets, trust boundaries, controls, security review checklist, release veto criteria. Use for design reviews, new endpoints, new data flows or release security sign-off.
metadata:
  owner: security-expert
  backups: [software-architect]
  version: 1.0.0
---

# Security Architecture

## Purpose
Map threats to controls and decide whether a change is safe to ship.

## Use when
- Design reviews
- New endpoint or data flow
- Release sign-off

## Inputs → Outputs
- Inputs: Design, diff, data flows.
- Outputs: Threat notes, required controls, verdict.

## Trust boundaries
Browser (untrusted) → Netlify Functions (trusted, hold secrets) → Claude API / GitHub / job sources (external). Resumes, postings and repo files are **untrusted data** to models.

## OWASP Top 10:2025 → our controls
| Risk | Control |
|---|---|
| A01 Broken Access Control | requireRole, ownership keys, path allow-list |
| A02 Security Misconfiguration | CSP/HSTS headers, no secrets in netlify.toml, Preview has no GitHub token |
| A03 Supply Chain | lockfile, Dependabot, deny agent edits to package.json |
| A04 Cryptographic Failures | HTTPS, AES-256-GCM for profiles, Blobs encryption at rest |
| A05 Injection | Zod validation, no HTML from mammoth, LLM injection controls |
| A06 Insecure Design | human approval, code-decides scoring, ADRs |
| A07 Authentication Failures | Supabase Auth, per-request getClaims + profiles role (RLS), MFA (aal2) for super_admin, TOTP step-up |
| A08 Integrity Failures | base-SHA check, force:false, signed releases optional |
| A09 Logging & Alerting Failures | audit log in Blobs (1 yr), alerts |
| A10 Exceptional Conditions | refusal/max_tokens handling, safe error messages |

## Release veto (security-expert)
Block on any known high/critical issue, any secret exposure, any new resume data path not covered by ADR 0004.

## Review checklist
- [ ] Data flow diagram updated
- [ ] AuthN/AuthZ on every route
- [ ] Inputs validated; outputs encoded
- [ ] Secrets only in functions
- [ ] Rate limit + budget
- [ ] Audit events

## Best practices
- Review early
- Pair every finding with a fix
- Re-check ADR 0001 and 0004 on each review

## Common mistakes
- Reviewing only code, not data flows
- Vetoing without a path forward

## References
- https://owasp.org/Top10/2025/
- https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- docs/security.md
