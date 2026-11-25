# Privacy note: Supabase Auth

Owner: privacy-compliance-specialist. Written 2026-11-25. Updated 2026-11-25. Status: **Draft. Most vendor facts now sourced. Open items marked "to verify".**

Sources are official Supabase and Google pages, read by the main session on 2026-11-25.
The fact notes are in the session scratchpad. Each sourced fact below carries its URL.
Counsel confirms any legal point. This note flags, it does not conclude.

## Decisions made (project lead, 2026-11-25)

- `profiles` holds only `id`, `role`, `created_at`.
- We copy no Google name or avatar into any table of ours.
- Deletion is a manual dashboard runbook for now. A self-delete function is still to verify.
- No secret key anywhere without a new ADR.
- No login on Deploy Previews.

## Purpose test (ADR 0004)

Is the data needed at all? Sign-in needs an identifier and a credential. Nothing else.
Auth data proves who the user is. It is not used for matching, analytics or marketing.

## Data Supabase Auth holds

| Data | Why needed | Needed? | Notes |
|---|---|---|---|
| Email address | Sign-in identifier, password reset | Yes | In `auth.users`. The JWT also carries `email` (https://supabase.com/docs/guides/auth/jwts). |
| Password hash | Email+password sign-in | Yes, for that method | Never handled by our code. Hashing details: to verify. |
| Google name and avatar URL | None | **No** | We do not copy or show them. Whether Supabase itself stores them in `user_metadata`: to verify. |
| Google account ID (provider identity) | Link Google sign-in to the user | Yes | Which table holds it: to verify. |
| Sign-in timestamps, IP, user agent | Security | Vendor-side | What Supabase logs: to verify. Retention: see Retention. |
| MFA factor (TOTP secret) | `super_admin` only | Yes, admins only | TOTP MFA is free and on by default (https://supabase.com/docs/guides/auth/auth-mfa/totp). Secret storage details: to verify. |
| `profiles.id`, `profiles.role`, `profiles.created_at` | Role check | Yes | Our table, FK to `auth.users` |

Google scopes (https://supabase.com/docs/guides/auth/social-sign-in/auth-google, updated 2026-11-20):
`openid` (added by hand), `userinfo.email` and `userinfo.profile` (defaults).
The `profile` scope is what lets Google return name and avatar. We do not need them.
Whether we can drop `profile` and keep only `openid` and `email`: to verify. Minimise if yes.

Rules:
- Do not write Google name or avatar into `user_metadata` on purpose.
- Treat `user_metadata` as user-editable and untrusted. Supabase says users can modify it and it is "not a good place to store authorization data". `app_metadata` "cannot be updated by the user" (https://supabase.com/docs/guides/database/postgres/row-level-security).
- Email is personal data. Never log it. Audit events use the hashed user ID (skill audit-logging).
- Florida s. 501.171(1)(b): a user name or email combined with a password that permits account access is "personal information". Protect auth data to that standard.

### Identity linking

"Supabase Auth automatically links identities with the same email address to a single user." (https://supabase.com/docs/guides/auth/auth-identity-linking, updated 2026-11-16.)
Privacy effect: a Google sign-in and a password account with the same email become one user and one `profiles` row.
Deletion must therefore remove the whole user, with all identities.
Account-takeover risk if an email is unverified: to verify (https://supabase.com/docs/guides/auth/identities#how-auth-links-identities). Security-expert reviews this.
Email confirmation is required by default on hosted projects (https://supabase.com/docs/guides/auth/passwords). Do not turn it off.

## Resume data and Supabase (ADR 0004)

**No. No resume data may touch Supabase.**

That covers raw files, extracted text, profiles, skills, match results, saved jobs and outcome labels.
Supabase is an identity vendor only. Those data stay in encrypted Netlify Blobs under a hashed user ID.
Do not put resume-derived values in `profiles`, `user_metadata`, `app_metadata`, Storage buckets or any new table.
Any change needs a new ADR approved by the project lead.

The user ID in Blobs keys stays a salted hash of the Supabase user ID. Never use the email in a key.

## Retention

| Data | Rule |
|---|---|
| `auth.users` row, identities, factors | Kept while the account exists. Deleted on account deletion. |
| `profiles` row | Deleted with the `auth.users` row, if the FK uses `on delete cascade`. Supabase's own example does (https://supabase.com/docs/guides/auth/managing-user-data). Our migration must match. Test it. |
| Inactive accounts | Proposed: delete the account after 12 months of no sign-in, matching the Blobs profile rule. Needs lead and counsel decision. Manual until a job exists. |
| Supabase auth audit log | **24 hours on the Free plan** (https://supabase.com/pricing, read 2026-11-25). Do not rely on it for investigations. |
| Our audit log (`auth.sign_in`, `auth.role_change`) | 1 year, Blobs `audit`, hashed ID only. This is our durable record. |

## Deletion

Supabase says: "You may delete users directly or via the management console at Authentication > Users." The programmatic call `auth.admin.deleteUser()` needs a secret key (https://supabase.com/docs/guides/auth/managing-user-data, updated 2026-11-20).
Secret keys bypass Row Level Security and must never reach a browser (https://supabase.com/docs/guides/getting-started/api-keys).
We allow no secret key without a new ADR. So deletion is manual for now.

### Runbook (interim)

"Delete my data" must do all of these, in order:
1. Delete Blobs keys for the user: profile, matches, saved, raw file, rate-limit keys. Use strong consistency. Keep one `data.delete_all` audit event with no content.
2. An admin deletes the user in the Supabase dashboard (Authentication > Users). This removes all linked identities too.
3. Confirm no `profiles` row remains (cascade).
4. Record the date in the audit log. Never store the email in the record.
5. Answer the user within a deadline. Proposed: 30 days, matching the Florida notice window. Lead and counsel set the real number.

Step 1 is the user-facing button. Steps 2 to 5 are an admin task. The user sees "request received" until step 2 is done.

Access token after deletion: `getUser` always asks the Auth server, so it sees deleted users at once. `getClaims` with asymmetric keys checks the token locally (https://supabase.com/docs/reference/javascript/auth-getclaims, updated 2026-11-23). A deleted user's token may therefore pass `getClaims` until it expires.
Token lifetime: to verify. Use `getUser` on any route that reads or deletes personal data.

Self-delete function: to verify. It would be a `SECURITY DEFINER` function that deletes the caller's own row. Supabase warns never to put such a function in an exposed schema (https://supabase.com/docs/guides/database/postgres/row-level-security). Whether it can delete from `auth.users` at all is unconfirmed. Security-expert reviews before any use.

QA test: extend the delete-my-data test. Assert zero keys per Blobs store. Then, on a synthetic user in a test project, assert zero `profiles` rows and no `auth.users` row after the dashboard step. Never use a live project.

## Other flags

- Supabase becomes a new subprocessor. Counsel reviews its data processing terms before launch. Record the result here. NOT YET DONE.
- Data location and transfer: to verify. Record the project region.
- Privacy notice must name Supabase (sign-in) and Google (if used) and say what each receives.
- Google sign-in: Google learns of the sign-in event. Say so in the notice. Follow Google's button rules (https://developers.google.com/identity/branding-guidelines).
- Deploy Previews: ADR 0003 gives no env scopes, so previews would share the production project. Decision: **no login on Deploy Previews.** Do not add a Netlify preview wildcard to the Supabase Redirect URLs list. Supabase documents one (`https://**--my_org.netlify.app/**`) and recommends exact production paths (https://supabase.com/docs/guides/auth/redirect-urls). Use the exact production URL only.
- Consent: sign-up does not need outcome-logging consent. Outcome logging stays opt-in and off by default.
- Availability: "Free projects are paused after 1 week of inactivity." (https://supabase.com/pricing, read 2026-11-25.) A paused project blocks sign-in. It also blocks the admin deletion step. The runbook must include a check for a paused project. Unpausing steps: to verify.
- Sign-up trigger: Supabase's example `handle_new_user` is `SECURITY DEFINER` and "could block signups" if it fails. Put it in a private schema, not an exposed one. The trigger inserts only `id` (and defaults for `role`, `created_at`). It must not read Google name or avatar. Security-expert owns the design.
- Leaked-password protection is "Not included in free" (https://supabase.com/pricing). Residual risk for password accounts. Prefer Google sign-in. Flag to security-expert.

## Data inventory rows (for docs/security.md §11)

| Data | Store | Retention |
|---|---|---|
| Email, password hash, Google identity ID | Supabase Auth (`auth.users`, identities) | Until account deletion; proposed 12 months inactive |
| MFA factor (super_admin) | Supabase Auth | Until factor removed or account deleted |
| `profiles` (`id`, `role`, `created_at`) | Supabase Postgres | Cascade-deleted with `auth.users` |
| Supabase auth audit log | Supabase (Free plan) | 24 hours (vendor-set) |
| Google name and avatar | Not copied by us. Supabase `user_metadata` copy: to verify | Not collected into our tables |

## Verdict

Approve-with-fixes for the design. Remaining conditions are below.

### Remaining veto conditions

Release is vetoed (`release:privacy`) until all of these hold:
1. Counsel has reviewed the Supabase data processing terms, and the result is recorded here.
2. The privacy notice names Supabase and Google and says what each receives.
3. The `profiles` FK uses `on delete cascade`, and the deletion test passes on a synthetic user in a test project.
4. The deletion runbook has an owner and a response deadline set by the lead.
5. No resume-derived data exists in any Supabase table, metadata field or bucket (ADR 0004).
6. No secret key exists in the repo, Netlify or the browser.
7. Login is disabled on Deploy Previews, and no preview wildcard sits in the Redirect URLs list.
8. Whether Supabase stores Google name or avatar in `user_metadata` is checked. If it does, either drop the `profile` scope or record the copy in the inventory and notice.

### Still to verify (not a veto alone)

Password hashing details; TOTP secret storage; what auth logs capture (IP, user agent); access token lifetime; project region; verified-email conditions for automatic linking; self-delete function; unpausing steps; whether `profile` scope can be dropped.
