# Security

Research date: 2026-11-24. Threat model, controls and acceptance criteria. This is engineering guidance, not legal advice.

## 1. Assets and threats

| Asset | Threat | Impact |
|---|---|---|
| Resumes and profiles (PII) | Data leak, over-retention | High (privacy, breach notice duties) |
| `ANTHROPIC_API_KEY` | Theft, abuse | High (spend) |
| `GITHUB_TOKEN` | Theft; malicious commits | Critical (code integrity) |
| Admin accounts | Takeover | Critical (can approve commits) |
| Agent console | Prompt injection → bad proposals | High |
| Job ingestion | Hostile page content (injection, XSS) | Medium |
| Claude budget | Abuse via public endpoints | Medium–High |

## 2. Authentication and roles

### 2.1 Options

| Option | Pros | Cons |
|---|---|---|
| Netlify Identity | Built in. Invite-only registration. External logins (Google, GitHub, GitLab, Bitbucket). Role-based redirects. | No MFA. Netlify announced deprecation in 2025, then reversed it on 2026-02-19 (per a community summary of Netlify's edited blog post). Git Gateway remains deprecated. |
| Auth0 (Netlify extension) | MFA, enterprise SSO, many providers, RBAC | Extra vendor; free-tier limits |
| Own password auth | Full control | You own hashing, reset, lockout, MFA. Most risk. |

### 2.2 Recommendation

- **Admins (can approve commits): require MFA.** Use the Auth0 extension, or another OIDC provider with MFA.
- **Job seekers:** Netlify Identity or the same Auth0 tenant. One provider is simpler. Pick Auth0 if admins need it anyway.
- Verify the JWT in every function (issuer, audience, expiry, signature via JWKS). Never trust a role sent by the client.

### 2.3 Roles

| Role | Can |
|---|---|
| `user` | Upload resume, view matches, save jobs, delete own data |
| `viewer` | All `user` rights + read Agent Console and proposals |
| `admin` | All `viewer` rights + chat with agents, create proposals, approve/reject, manage employer registry |
| `owner` | All `admin` rights + manage roles, rotate secrets runbook |

Enforce in a single `requireRole(req, role)` helper. Deny by default.

### 2.4 Password-protected administration

- Admin routes (`/admin/*`, `/api/agents/*`, `/api/proposals/*`) require `admin` role and MFA claim (`amr` includes `mfa`).
- Approval requires a **step-up**: re-authentication within 10 minutes.
- Optional extra layer: Netlify site password protection on the admin path for staging.

## 3. Secrets

- Secrets live only in Netlify environment variables, **Functions** scope, marked "Contains secret values". Changes land in Netlify's team audit log.
- Different values per deploy context. Deploy Previews get no `GITHUB_TOKEN` and a low-limit Claude key.
- Never prefix secrets with `VITE_` or any client-exposed prefix. CI fails the build if `dist/` contains `sk-ant-`, `github_pat_`, `ghp_`, or `-----BEGIN`.
- Rotation: every 90 days, and at once after any suspected leak. Keep a runbook.

## 4. GitHub fine-grained token

- Resource owner: the repo owner. **Repository access: Only select repositories → this one repo.**
- Permissions: **Contents: Read and write**. Metadata: read (granted automatically). Nothing else. Do **not** grant Workflows, Actions, Administration, Secrets or Pull requests unless a later feature needs it.
- Expiration: 90 days (GitHub allows 1–366 days or none; set one). Calendar the renewal.
- Branch protection on `main`: block force-push and deletion. Consider requiring signed commits or a pull-request flow in phase 2 (`agent-console.md` §6.5).
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
| App | Per-user daily Claude token budget in Blobs (e.g., users 200k tokens/day; admins 2M) |
| App | Max 3 resume uploads per user per day |
| Anthropic Console | Workspace spend limit set below the org tier cap |
| Bot defense | Turnstile or hCaptcha on signup and upload if abuse appears |
| Netlify WAF / traffic rules | Enable if on a plan that includes Advanced Web Security |

Return `429` with `Retry-After`. Show a friendly message.

## 8. Audit logging

Append-only events in Blobs store `audit`, one object per event (`log/{yyyy-mm-dd}/{ulid}.json`):

```json
{ "ts": "2026-11-24T18:03:11Z", "actor": "user_123", "role": "admin",
  "action": "proposal.approve", "target": "proposal/7", "ip": "203.0.113.4",
  "details": { "commitSha": "abc123", "files": 2 } }
```

Log: sign-in, role change, resume upload/delete, profile export, agent chat start, proposal create/approve/reject/commit, secret-dependent failures, rate-limit hits.

- Never log resume text, tokens or full prompts.
- Keep audit logs 1 year.
- Weekly export to cold storage (optional).

## 9. Uploaded resume handling

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

- "Delete my data" button removes profile, matches, saved jobs and kept files at once. Log the deletion (without content).
- A daily scheduled function enforces retention.
- Breach response: Florida's Information Protection Act (s. 501.171, F.S.) sets notice duties for breaches of personal information. Have counsel confirm scope and timelines before launch.

## 12. Browser hardening

- Strict CSP (see `netlify-architecture.md` §8). No inline scripts. `connect-src 'self'`.
- `frame-ancestors 'none'`.
- Session tokens in memory or `HttpOnly; Secure; SameSite=Lax` cookies. Not `localStorage`.
- CSRF: same-site cookies plus an `Origin` check on state-changing routes.
- Dependency scanning: `npm audit` and GitHub Dependabot alerts. Lockfile committed.

## 13. Monitoring

- Netlify function logs: errors, 4xx/5xx spikes, rate-limit blocks.
- Anthropic usage: daily spend alert at 50% and 80% of budget.
- GitHub: alert on any push to `main` not tied to an approved proposal or human PR.
- Weekly review of audit log for admin actions.
- Uptime check on `/api/health`.

## 14. Acceptance criteria

- Build fails if a secret pattern appears in client assets.
- Every personal API route rejects missing or invalid JWTs (automated tests).
- A `user` cannot reach any admin route (403 tests).
- Approval without recent re-auth fails.
- A proposal touching a denied path never reaches storage.
- "Delete my data" removes all user keys from every store (integration test lists keys before and after).
- Rate limits return 429 with `Retry-After`.
- The GitHub token cannot modify `.github/workflows/**` (GitHub rejects without Workflows permission).

## Sources

- GitHub, Managing personal access tokens. https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub REST, repository contents and rate limits. https://docs.github.com/en/rest/repos/contents · https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- Netlify, Environment variables overview (scopes, secret values, audit log, limits). https://docs.netlify.com/build/environment-variables/overview/
- Netlify, Rate limiting. https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/
- Netlify Identity overview. https://docs.netlify.com/manage/security/secure-access-to-sites/identity/overview/
- Netlify Support Forums community summary, "Netlify Identity is staying (Feb 2026 reversal)". https://answers.netlify.com/t/netlify-identity-is-staying-feb-2026-reversal-what-changed-whos-affected-and-how-to-proceed/162733
- Netlify Blobs (encryption at rest). https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- mammoth.js security notes. https://github.com/mwilliamson/mammoth.js
- Claude API rate limits and refusal handling (Anthropic docs).
