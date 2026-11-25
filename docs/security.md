# Security

Research date: 2026-11-24. Updated 2026-11-25 for the decisions in [ADR 0001](adr/0001-github-fine-grained-pat-single-repo.md), [ADR 0002](adr/0002-commit-approved-changes-to-main.md), [ADR 0003](adr/0003-netlify-free-plan.md) [ADR 0004](adr/0004-resume-confidentiality.md) and [ADR 0006](adr/0006-supabase-auth.md) (proposed). Supabase Auth design: [security/supabase-auth.md](security/supabase-auth.md). Threat model, controls and acceptance criteria. This is engineering guidance, not legal advice.

Owners: `security-expert` (skills `security-architecture`, `authentication`, `authorization`, `secrets-management`, `rate-limiting`, `prompt-injection-defense`, `audit-logging`) and `privacy-compliance-specialist` (skill `privacy-and-data-protection`).

## 1. Assets and threats

| Asset | Threat | Impact |
|---|---|---|
| Resumes and profiles (PII) | Data leak, over-retention | High (privacy, breach notice duties) |
| `ANTHROPIC_API_KEY` | Theft, abuse | High (spend) |
| `GITHUB_TOKEN` | Theft; malicious commits | Critical (code integrity) |
| `super_admin` accounts | Takeover | Critical (can approve commits) |
| Supabase secret / `service_role` key | Would bypass RLS if it existed | Critical (banned; never issued) |
| `profiles.role` | Self-promotion | Critical (can approve commits) |
| Agent console | Prompt injection → bad proposals | High |
| Job ingestion | Hostile page content (injection, XSS) | Medium |
| Claude budget | Abuse via public endpoints | Medium–High |

## 2. Authentication and roles

Decision: **Supabase Auth** ([ADR 0006](adr/0006-supabase-auth.md), proposed). Full design: [security/supabase-auth.md](security/supabase-auth.md). Auth0 and Netlify Identity were considered and dropped (see ADR 0006).

### 2.1 Methods

- Email and password, with email confirmation on. Sign up, log in, log out, forgot password.
- Continue with Google (`signInWithOAuth`, provider `google`, PKCE).
- Browser and Functions use only `SUPABASE_URL` and the publishable key. Secret (`sb_secret_…`) and legacy `service_role` keys are banned. They bypass RLS.

### 2.2 Verify on every request

- Every Function: Bearer token → `getClaims` (ES256, local JWKS) → check `alg`, `iss`, `role = authenticated`, `exp`.
- Never use `getSession()` on the server. Fail closed (503) if Supabase is unreachable.
- Read the role from `public.profiles` through a per-request client that carries the user's token, so RLS applies. Never from `user_metadata`.

### 2.3 Roles

| Role | Can |
|---|---|
| `user` (default) | Upload resume, view matches, save jobs, delete own data |
| `super_admin` | All `user` rights + Agents page, agent chat, proposals, approve/reject, employer registry |

No role can read another user's resume or profile (ADR 0004). Helpers: `requireUser`, `requireRole`, `requireAal2`, `requireStepUp` (skill `authorization`). Deny by default.

Promotion: manual SQL by the project lead in the Supabase dashboard. A trigger logs it to `private.role_changes`; the runbook mirrors it to the audit log. No API can change a role. RLS lets people read only their own `profiles` row and has no write policies.

### 2.4 Administration

- `/api/agents/*` and `/api/proposals/*` need `super_admin` and `aal2` (TOTP MFA).
- Approve and Revert also need a step-up: `amr[0].method = "totp"` within 600 s, else 403 `step_up_required`. This meets ADR 0002's "re-authentication within 10 minutes".
- Deploy Previews have no login. The Supabase variables are set for Production only.

## 3. Secrets

- Secrets live only in Netlify environment variables, marked "Contains secret values". Changes land in Netlify's team audit log.
- **Free plan (ADR 0003):** variable *scopes* are a Pro feature, so secrets are also visible to the build step. Never reference a secret in client code; read secrets only inside function handlers.
- Different values per deploy context. Deploy Previews get no `GITHUB_TOKEN` and a low-limit Claude key.
- Never prefix secrets with `VITE_` or any client-exposed prefix. CI fails the build if `dist/` contains `sk-ant-`, `github_pat_`, `ghp_`, or `-----BEGIN`.
- Public, not secret: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (Production context only). The Google OAuth client secret lives only in the Supabase dashboard. CI also fails on `sb_secret_` and on `service_role` JWTs.
- Rotation: every 90 days, and at once after any suspected leak. Keep a runbook.

## 4. GitHub fine-grained token

- Decision: **ADR 0001**. Resource owner: the repo owner. **Repository access: Only select repositories → this one repo.**
- Permissions: **Contents: Read and write**. Metadata: read (granted automatically). Nothing else. Do **not** grant Workflows, Actions, Administration, Secrets or Pull requests unless a later feature needs it.
- Expiration: 90 days (GitHub allows 1–366 days or none; set one). Calendar the renewal.
- Value set for the **Production** deploy context only; Deploy Previews have no GitHub token.
- Approved proposals commit **directly to `main`** (ADR 0002). Branch protection on `main`: block force-push and deletion; do **not** require pull requests (that would block the token's commits).
- Rate limits: 5,000 requests/hour; secondary limits of 80 content-creating requests/minute and 500/hour. Honour `retry-after` and `x-ratelimit-reset`.

## 5. Agent file-path allow-list

Defined in `agent-console.md` §6.2. Summary:

- Allow: `apps/web/src/**`, `packages/**`, `data/taxonomy/**`, `docs/**`, `.claude/agents/**`, `tests/**`.
- Deny (wins): `netlify.toml`, `netlify/functions/**`, `package*.json`, `.github/**`, `.env*`, key files, `scripts/**`.
- Per-agent narrowing via `responsibilities`.
- Reject path traversal, absolute paths, and files > 200 KB.
- Secret-pattern scan on proposed content.

Why deny `netlify/functions/**` and `package.json`: a function change could read env vars and exfiltrate them; a dependency change could run install scripts. Those changes go through a normal human pull request.

## 6. Prompt injection

Untrusted text enters from three places: resumes, job postings and (indirectly) repo files.

Controls:

1. **No tools for untrusted-content calls.** Resume extraction, job extraction and explanations use structured outputs only. They have no tools and cannot take actions.
2. **Schema-bound outputs.** Validate every model output with Zod. Drop unknown fields. Clamp strings.
3. **Delimit untrusted input** in prompts (`<resume>…</resume>`, `<job_posting>…</job_posting>`). Tell the model to treat it as data.
4. **Code decides.** Scores, bands, recommendations and gates come from code. The model only writes prose from evidence.
5. **Evidence check.** Reject explanations that mention skills not in the evidence object.
6. **Agents are isolated from user data.** Agent Console calls never include resumes or postings.
7. **Human approval** on every write to the repo.
8. **Output encoding.** Render model text as text or sanitized Markdown (DOMPurify). Never `innerHTML` raw output.
9. **Refusals.** Handle `stop_reason: "refusal"` gracefully.

## 7. Rate limiting and abuse prevention

| Layer | Control |
|---|---|
| Netlify edge | `config.rateLimit` per function, aggregated by IP and domain (e.g., upload: 5/min; chat: 20/min; jobs: 120/min) |
| App | Per-user daily Claude token budget in Blobs (e.g., users 200k tokens/day; `super_admin` 2M) |
| App | Max 3 resume uploads per user per day |
| Anthropic Console | Workspace spend limit set below the org tier cap |
| Supabase Auth | Vendor limits: sign-in 30 per 5 min; emails 2/hour on built-in SMTP (custom SMTP before launch); MFA verify 15/min |
| Netlify edge | Approve 5/min; account routes 5/min |
| Bot defense | Turnstile or hCaptcha on signup and upload if abuse appears |
| Netlify WAF / traffic rules | Enable if on a plan that includes Advanced Web Security |

Return `429` with `Retry-After`. Show a friendly message.

## 8. Audit logging

Append-only events in Blobs store `audit`, one object per event (`log/{yyyy-mm-dd}/{ulid}.json`):

```json
{ "ts": "2026-11-24T18:03:11Z", "actor": "u_9f2c…", "role": "super_admin",
  "action": "proposal.approve", "target": "proposal/7", "ip": "203.0.113.4",
  "details": { "commitSha": "abc123", "files": 2 } }
```

Log: sign-in, role change (mirrored from `private.role_changes`), auth denials on `super_admin` routes, MFA and step-up failures, resume upload/delete, account delete request and completion, profile export, agent chat start, proposal create/approve/reject/commit, secret-dependent failures, rate-limit hits. The actor is the hashed Supabase user ID, never the email or token.

- Never log resume text, tokens or full prompts.
- Keep audit logs 1 year.
- Weekly export to cold storage (optional).

## 9. Uploaded resume handling

**ADR 0004: uploaded resumes must never be exposed publicly and are used only for candidate-job matching workflows.** No public URLs, no CDN or service-worker caching, no logs, no admin or agent access, no use in tests, analytics or training.

- Validate type by magic bytes. Max 5 MB, 10 pages.
- Parse in memory. Do not write the raw file to disk.
- Default: **discard the raw file after parsing.** Keep only the structured profile.
- Optional "keep my file" stores it encrypted (section 10) for 30 days.
- Never pass resume data to analytics, logs or third-party tools other than the Claude API.
- Anthropic API data handling: review current commercial terms and retention for API inputs. Document them in the privacy notice.

## 10. Encryption

- In transit: HTTPS everywhere, HSTS preload.
- At rest: Netlify Blobs encrypts at rest.
- App-level: encrypt profiles and any kept files with AES-256-GCM via Node `crypto`. Key `DATA_KEY` (32 random bytes, base64) in env. Store `{ iv, tag, ciphertext, keyVersion }`. Support key rotation by `keyVersion`.
- Hash user IDs in Blob keys if keys could expose emails. Never use email as a key.

## 11. Data retention

| Data | Retention |
|---|---|
| Raw resume file | Deleted after parse (default); 30 days if user opts in |
| Candidate profile | Until user deletes, or 12 months after last sign-in |
| Match results and explanations | Same as profile |
| Saved opportunities | Same as profile |
| Job postings | 30 days after close |
| Agent chats | 90 days |
| Proposals | Indefinitely (they explain repo history) |
| Audit logs | 1 year |
| Email, password hash, Google identity ID (Supabase `auth.users`, `auth.identities`) | Until account deletion; proposed 12 months inactive |
| MFA factor (`super_admin`) | Until factor removed or account deleted |
| `profiles` (`id`, `role`, `created_at`) | Cascade-deleted with `auth.users` |
| `private.role_changes` | 1 year (matches audit log) |
| Supabase auth audit log | 24 hours (Free plan; https://supabase.com/pricing, read 2026-11-25) |
| Google name and avatar | Not stored by us |

- "Delete my data" button removes profile, matches, saved jobs and kept files at once. Log the deletion (without content). Worked example: `knowledge/privacy-compliance-specialist/examples/delete-my-data.mjs`.
- Account deletion: delete Blobs data first (Function), then the project lead deletes the user in Supabase → Authentication → Users (runbook). No secret key. Details: [privacy/supabase-auth.md](privacy/supabase-auth.md).
- No resume data is ever stored in Supabase (ADR 0004).
- A daily scheduled function enforces retention.
- Breach response: Florida's Information Protection Act (s. 501.171, F.S.) sets notice duties for breaches of personal information. Have counsel confirm scope and timelines before launch.

## 12. Browser hardening

- Strict CSP (see `netlify-architecture.md` §8). No inline scripts. `connect-src 'self'` plus `SUPABASE_URL`.
- `frame-ancestors 'none'`.
- Supabase session in supabase-js browser storage: an accepted exception under strict CSP. See [security/supabase-auth.md](security/supabase-auth.md) §4.4.
- CSRF: Bearer tokens plus an `Origin` check on state-changing routes.
- Dependency scanning: `npm audit` and GitHub Dependabot alerts. Lockfile committed.

## 13. Monitoring

- Netlify function logs: errors, 4xx/5xx spikes, rate-limit blocks.
- Anthropic usage: daily spend alert at 50% and 80% of budget.
- GitHub: alert on any push to `main` not tied to an approved proposal or human PR.
- Weekly review of audit log for `super_admin` actions. Reconcile `private.role_changes` with `auth.role_change` events.
- Uptime check on `/api/health`.

## 14. Acceptance criteria

- Build fails if a secret pattern appears in client assets.
- Every personal API route rejects missing, expired, wrong-`alg` or wrong-`iss` tokens (401).
- A `user` gets 403 on every `super_admin` route; an aal1 `super_admin` gets 403 `mfa_required`.
- Approve without a TOTP in the last 600 s fails with 403 `step_up_required`.
- RLS: user A cannot read B's profile; `authenticated` cannot update `role`.
- No `sb_secret_` or `service_role` value in the repo, `dist/` or proposals.
- A proposal touching a denied path never reaches storage.
- "Delete my data" removes all user keys from every store (integration test lists keys before and after).
- Rate limits return 429 with `Retry-After`.
- The GitHub token cannot modify `.github/workflows/**` (GitHub rejects without Workflows permission).

## Sources

- GitHub, Managing personal access tokens. https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub REST, repository contents and rate limits. https://docs.github.com/en/rest/repos/contents · https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- Netlify, Environment variables overview (scopes, secret values, audit log, limits). https://docs.netlify.com/build/environment-variables/overview/
- Netlify, Rate limiting. https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/
- Supabase API keys. https://supabase.com/docs/guides/getting-started/api-keys (read 2026-11-25)
- Supabase JWTs and signing keys. https://supabase.com/docs/guides/auth/jwts · https://supabase.com/docs/guides/auth/signing-keys (read 2026-11-25)
- supabase-js `getClaims`. https://supabase.com/docs/reference/javascript/auth-getclaims (read 2026-11-25)
- Supabase MFA. https://supabase.com/docs/guides/auth/auth-mfa (read 2026-11-25)
- Supabase Row Level Security. https://supabase.com/docs/guides/database/postgres/row-level-security (read 2026-11-25)
- Supabase Auth rate limits. https://supabase.com/docs/guides/auth/rate-limits (read 2026-11-25)
- Netlify Blobs (encryption at rest). https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- mammoth.js security notes. https://github.com/mwilliamson/mammoth.js
- Claude API rate limits and refusal handling (Anthropic docs).
