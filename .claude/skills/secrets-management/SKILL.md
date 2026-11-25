---
name: secrets-management
description: Secrets handling — inventory (ANTHROPIC_API_KEY, GITHUB_TOKEN, DATA_KEY, INTERNAL_TOKEN, USAJOBS_KEY; public SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY; Supabase secret keys banned), Netlify env vars marked secret with per-context values, Free-plan build visibility, least privilege, 90-day rotation, leak response, CI secret scanning. Use whenever a credential is created, used, rotated or suspected leaked.
metadata:
  owner: security-expert
  backups: [netlify-engineer]
  version: 2.0.0
---

# Secrets Management

## Purpose
Keep every credential least-privileged, short-lived, server-only and quickly revocable.

## Use when
- Creating, using, rotating or revoking a secret
- A secret may be exposed

## Inputs → Outputs
- Inputs: Secret need and scope.
- Outputs: Inventory entry, Netlify variable, rotation date.

## Inventory
| Value | Secret? | Where used | Context | Rotation |
|---|---|---|---|---|
| ANTHROPIC_API_KEY | Yes | Claude calls | Prod real; Preview low-budget key | 90 days |
| GITHUB_TOKEN | Yes | proposals-commit only | **Production only** (ADR 0001) | 90-day expiry |
| DATA_KEY | Yes | profile encryption | Prod | yearly + keyVersion |
| INTERNAL_TOKEN | Yes | background function calls | all | 90 days |
| USAJOBS_KEY | Yes | ingestion | Prod | yearly |
| SUPABASE_URL | No (public) | Browser, Functions | **Production only** (no preview login) | n/a |
| SUPABASE_PUBLISHABLE_KEY | No (public) | Browser, Functions | **Production only** | On compromise |
| Google OAuth client secret | Yes | Supabase dashboard only | Never in git or Netlify | Yearly or on exposure |

Banned: Supabase secret keys (`sb_secret_…`) and the legacy `service_role` key. They bypass RLS. Changing this needs a new ADR (ADR 0006).

## Rules (OWASP)
- Least privilege; expire where possible; rotate regularly; revoke and remove immediately on exposure; document owner and rotation.
- Netlify UI/CLI only; mark "Contains secret values"; never in `netlify.toml` or git.
- Free plan: no scopes, so secrets reach the build too — never reference them in client code; no `VITE_` prefix (ADR 0003).
- CI: fail build if `dist/` or the diff contains `sk-ant-`, `github_pat_`, `ghp_`, `-----BEGIN`.
- Never log, echo, or put a secret in an agent prompt.
- Public values (Supabase URL and publishable key) may reach the client. Every other value may not.
- CI scan also fails on `sb_secret_` and on any JWT whose payload has `"role":"service_role"`.
- Signing-key rotation: publish the standby key, wait ≥ 20 minutes (JWKS caches), then switch.

## Leak response
Revoke → issue new → set in Netlify → redeploy → review usage/commits → incident note (skill: incident-response).

## Checklist
- [ ] Inventory updated
- [ ] Production-only where possible
- [ ] Rotation date set
- [ ] CI scan passes

## Common mistakes
- Secrets in netlify.toml or git
- Client-exposed prefixes like VITE_
- Rotating without redeploying

## References
- https://supabase.com/docs/guides/getting-started/api-keys (read 2026-11-25)
- https://supabase.com/docs/guides/auth/signing-keys (read 2026-11-25)
- https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- https://docs.netlify.com/build/environment-variables/overview/
