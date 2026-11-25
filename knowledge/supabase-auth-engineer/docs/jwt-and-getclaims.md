# JWTs, signing keys and getClaims — notes

Sources (read 2026-11-25):
- https://supabase.com/docs/guides/auth/jwts (page updated 2026-11-20)
- https://supabase.com/docs/guides/auth/signing-keys (page updated 2026-11-20)
- https://supabase.com/docs/reference/javascript/auth-getclaims (reference updated 2026-11-23)

## Claims
- Example claims: `iss` "https://project_id.supabase.co/auth/v1", `exp`, `sub` "<user ID>", `role` "authenticated", `email`.
- UNVERIFIED: the `aud` value. The scrape did not confirm "authenticated". Do not check `aud` until confirmed on the JWTs page.

## Signing keys
- ES256 (P-256) is recommended. RS256 is supported. HS256 shared secret is "Not recommended for production applications."
- JWKS: `GET https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`.
- "This discovery endpoint is cached by Supabase's edge servers for 10 minutes. Furthermore the Supabase client libraries may cache the keys in memory for an additional 10 minutes." The multi-level cache "is cleared every 20 minutes".
- If a backend cannot reach the endpoint, you can copy the public keys into the app. "Verifying a JWT then needs no network call."

## getClaims
- "Extracts the JWT claims present in the access token by first verifying the JWT against the server's JSON Web Key Set endpoint `/.well-known/jwks.json` which is often cached ... Prefer this method over GoTrueClient.getUser which always sends a request to the Auth server for each JWT."
- "If your project is using asymmetric JWT signing keys, then the verification is done locally usually without a network request using the WebCrypto API."
- "If your project is using a symmetric secret to sign the JWT, it always sends a request similar to `getUser()`".
- Parameter `jwt` (optional): "An optional specific JWT you wish to verify". Returns `{ data: { claims, header, signature }, error }`.
- `getSession`: "If using an insecure storage medium, such as cookies or request headers, the user object returned by this function must not be trusted." Never use it for server auth.
- `getUser`: always a network call. It also catches revoked or deleted users at once.

## Still to verify before coding
- `createClient` options for a per-request server client (`global.headers.Authorization`, `auth.persistSession: false`): https://supabase.com/docs/reference/javascript/initializing
- The `aud` claim value.

## Project rule
Our per-request check also tests `iss`, `exp` and `role === 'authenticated'` itself (defence in depth). See `examples/token-claims.mjs`.
