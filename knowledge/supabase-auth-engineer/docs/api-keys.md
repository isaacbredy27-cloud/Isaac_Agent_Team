# Supabase API keys — notes

Source: https://supabase.com/docs/guides/getting-started/api-keys (read 2026-11-25; page updated 2026-11-18)

- Publishable key `sb_publishable_...`: "Safe to expose online: web page, mobile or desktop app, GitHub actions, CLIs, source code."
- Secret keys `sb_secret_...`: "They provide full access to your project's data, bypassing Row Level Security." "Policies never apply to a secret key, because `service_role` has the `BYPASSRLS` attribute."
- Legacy `anon` = legacy publishable key. Legacy `service_role` = legacy secret key. Both are long-lived JWTs.
- "A secret key doesn't work in a browser. Supabase matches on the `User-Agent` header and returns HTTP 401 Unauthorized."

Project rule: only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` exist in our code and env. Never a secret key or `service_role`. Both env vars are public values, so they are not secrets (skill `secrets-management`).

Also read: https://supabase.com/docs/guides/database/postgres/row-level-security — "Never use a secret key in the browser or expose it to customers." (read 2026-11-25)
