# MFA, aal and step-up — notes

Sources (read 2026-11-25):
- https://supabase.com/docs/guides/auth/auth-mfa (page updated 2026-11-18)
- https://supabase.com/docs/guides/auth/auth-mfa/totp (page updated 2026-11-03)
- https://supabase.com/pricing (read 2026-11-25)

## Assurance levels
- `aal1`: conventional sign-in. `aal2`: "additionally verified using at least one second factor".
- "This assurance level is encoded in the `aal` claim ... JWTs without an `aal` claim are at the `aal1` level."
- "Adding MFA to your app's UI does not in-and-of-itself offer a higher level of security ... You also need to enforce the MFA rules in your application's database, APIs".
- For other APIs: "Retrieve the `aal` claim from the JWT and compare". "If you've encountered an AAL level that can be increased, ask the user to continue the sign-in process instead of logging them out."

## amr claim and step-up recency
- `amr`: "an array of objects that indicate what authentication methods the user has used so far", with `method` and `timestamp`, "ordered most recent method first".
- Methods: oauth, password, otp, totp, sso/saml, anonymous (with PKCE also invite, magiclink, email/signup, email_change).
- aal2 proves MFA happened, not when. Project rule for Approve: require `amr[0].method === 'totp'` and `now - amr[0].timestamp <= 600` seconds. Timestamp unit is seconds (check against a real token before launch).
- Sample test fixtures: `examples/require-role.mjs`.

## RLS template from the docs
`create policy ... as restrictive to authenticated using ((select auth.jwt()->>'aal') = 'aal2');`

## TOTP API
- `mfa.enroll({ factorType: 'totp' })` returns `data.id`, `data.totp.qr_code`, `data.totp.secret`, `data.totp.uri`.
- `mfa.challenge({ factorId })`, then `mfa.verify({ factorId, challengeId, code })`.
- `mfa.getAuthenticatorAssuranceLevel()` returns `currentLevel` and `nextLevel`. Show the challenge when `nextLevel` is `aal2` and differs.
- `mfa.unenroll({ factorId })`, `mfa.listFactors()`.
- "TOTP MFA API is free to use and is enabled on all Supabase projects by default." Pricing page: "Basic Multi-Factor Auth: Included in free".
- Unenrolling downgrades aal2 to aal1 only after a refresh, unless `refreshSession()` is called.
