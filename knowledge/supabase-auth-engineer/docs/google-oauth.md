# Continue with Google — notes

Sources (read 2026-11-25):
- https://supabase.com/docs/guides/auth/social-sign-in/auth-google (page updated 2026-11-20)
- https://supabase.com/docs/guides/auth/redirect-urls (page updated 2026-10-30)
- https://supabase.com/docs/guides/auth/auth-identity-linking (page updated 2026-11-16)
- https://developers.google.com/identity/branding-guidelines (read 2026-11-25)

## Google Cloud set-up
- "Create a new OAuth client ID ... choose Web application".
- "Under Authorized JavaScript origins add your application's URL".
- "Under Authorized redirect URIs add your Supabase project's callback URL", shown on the Supabase Google provider page. Form: `https://<project-ref>.supabase.co/auth/v1/callback`.
- Scopes: `openid` (add manually), `.../auth/userinfo.email` and `.../auth/userinfo.profile` (default).
- Consent-screen Branding and Verification show your logo and name instead of the Supabase project ID.
- Enter Client ID and Client Secret on the Supabase dashboard Google provider page. The Google client secret lives in Supabase, never in our repo or Netlify.

## Client code
- `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'https://example.com/auth/callback' } })`.
- PKCE: "you need an extra step to handle the code exchange", so call `supabase.auth.exchangeCodeForSession(code)`.

## Redirect URLs
- "The Site URL ... defines the default redirect URL when no `redirectTo` is specified."
- "The URL in `redirectTo` should match the Redirect URLs list configuration."
- The docs show a Netlify preview pattern, `https://**--my_org.netlify.app/**`. We do not use it: Deploy Previews get no login (project decision). Allow-list = production URL + localhost only. The docs "recommend setting the exact redirect URL path for your site URL in production."

## Identity linking
- "Supabase Auth automatically links identities with the same email address to a single user."
- UNVERIFIED: what happens for unverified emails. Read https://supabase.com/docs/guides/auth/identities#how-auth-links-identities before launch.
- Manual linking: `supabase.auth.linkIdentity({ provider: 'google' })`; it must be enabled in the dashboard.

## Google branding
- Allowed text: "Sign in with Google", "Sign up with Google", "Continue with Google".
- Standard colour "G" logo, unmodified, on light, dark or neutral themes. Font: Google Sans Medium.
- "The Sign in with Google button should be displayed at least as prominently as other third party sign-in options."
- Do not: use the logo alone without text, a monochrome "G", a "G" on other coloured backgrounds, a custom or outdated icon, or "Google" alone as the label.
