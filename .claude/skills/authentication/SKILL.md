---
name: authentication
description: Authentication for Finance Match Orlando — OIDC/JWT verification in every function (issuer, audience, expiry, signature via JWKS), MFA for admins (Auth0 extension recommended; Netlify Identity has no MFA), step-up re-auth for approvals, session storage rules. Use for login, tokens, sessions or admin access.
metadata:
  owner: security-expert
  backups: [netlify-engineer, agent-console-engineer]
  version: 1.0.0
---

# Authentication

## Purpose
Know who is calling, and require strong proof for anyone who can change code.

## Use when
- Adding a protected route
- Changing login, sessions or MFA
- Building the approval step-up

## Inputs → Outputs
- Inputs: Bearer token or session cookie.
- Outputs: Verified user ID, roles and MFA claim, or a 401.

## Decisions
- Admins (can approve commits to `main`, ADR 0002) **must use MFA** → Auth0 (Netlify extension) or another OIDC provider with MFA.
- Netlify Identity remains supported (Feb 2026 reversal) but lacks MFA; acceptable only for job-seeker accounts if chosen.
- Free plan has no basic-auth headers (ADR 0003); protection is in code.

## Verify on every request
```ts
const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER, audience: AUDIENCE });
// payload.exp checked by jose; roles from a namespaced claim; amr includes "mfa" for admins
```
- Reject missing/expired/invalid tokens with 401; never trust client-sent roles.
- Step-up: approval requires `auth_time` within 10 minutes.
- Sessions: `HttpOnly; Secure; SameSite=Lax` cookie or in-memory token; never `localStorage`.
- CSRF: SameSite + `Origin` check on state-changing routes.

## Checklist
- [ ] Every non-public function calls `requireUser`
- [ ] Admin routes require MFA claim
- [ ] Tests for 401 paths

## Best practices
- Verify signature, issuer, audience and expiry on every request
- Admins require MFA
- Short sessions; step-up for approvals
- Never trust roles sent by the client

## Common mistakes
- Decoding a JWT without verifying it
- Storing tokens in localStorage
- Forgetting the Origin check on POSTs
- Treating Netlify Identity as MFA-capable

## References
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- https://docs.netlify.com/manage/security/secure-access-to-sites/identity/overview/
- docs/security.md §2
