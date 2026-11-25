# knowledge/supabase-auth-engineer

Sourced notes and runnable examples for `supabase-auth-engineer` (Vera). Facts read 2026-11-25. Plan: `docs/plans/supabase-auth.md`.

## docs/
| Note | Topic |
|---|---|
| `docs/api-keys.md` | publishable vs secret keys |
| `docs/jwt-and-getclaims.md` | claims, signing keys, JWKS, getClaims |
| `docs/password-and-reset.md` | sign up, log in, reset |
| `docs/google-oauth.md` | Google set-up, redirect URLs, linking, branding |
| `docs/mfa-and-step-up.md` | aal, amr, TOTP |
| `docs/rls-and-profiles.md` | RLS, profiles, trigger |
| `docs/rate-limits-and-plan.md` | limits and Free plan |

## examples/ (offline, no network, no keys)
| Example | Shows |
|---|---|
| `examples/token-claims.mjs` | exp, iss, role checks on fixture claims |
| `examples/require-role.mjs` | role from profile row, aal2, step-up recency, metadata role ignored |
| `examples/profiles-rls.sql` | reference SQL (not a migration) |
| `examples/profiles-rls-check.mjs` | static self-check of the SQL |

Run all: `node knowledge/run-examples.mjs` (the runner picks up every `.mjs` file).

## Unverified items
`aud` claim value; server client options; identity-linking rules for unverified emails; user self-delete without a secret key. Each is marked in the note where it matters.
