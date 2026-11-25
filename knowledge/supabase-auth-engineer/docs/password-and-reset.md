# Email and password auth — notes

Source: https://supabase.com/docs/guides/auth/passwords (read 2026-11-25; page updated 2026-11-17)

- Sign up: `supabase.auth.signUp({ email, password, options: { emailRedirectTo } })`.
- Email confirmation is required by default on hosted projects.
- Log in: `supabase.auth.signInWithPassword({ email, password })`.
- Forgot password: `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://example.com/account/update-password' })`.
- Set a new password: `supabase.auth.updateUser({ password: 'new_password' })`.
- PKCE flow needs an exchange step (`verifyOtp` with `token_hash`, or `exchangeCodeForSession`). Implicit flow returns the token directly.
- Built-in email: "rate limit of 2 emails per hour, and availability is on a best-effort basis. For production use, you should consider configuring a custom SMTP server."

Project rules
- `redirectTo` and `emailRedirectTo` must be on the redirect allow-list (see google-oauth.md).
- Error copy must not reveal whether an email exists (UX plan T2).
- 2 emails per hour is too low for real use: see rate-limits-and-plan.md. Custom SMTP needs the project lead.
- Leaked-password protection is not in the Free plan (pricing page, rate-limits-and-plan.md).
