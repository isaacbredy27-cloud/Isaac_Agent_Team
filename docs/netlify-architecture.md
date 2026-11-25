# Netlify Architecture

Research date: 2026-11-24. Updated 2026-11-25: runs on the **Netlify Free plan** ([ADR 0003](adr/0003-netlify-free-plan.md)) — 300 credits/month, and going over pauses every project on the account; code-based rate limits are available; env-var scopes, basic-auth headers and long log retention are not. Auth uses Supabase Auth ([ADR 0006](adr/0006-supabase-auth.md), proposed; §3.1). Owner: `netlify-engineer`. Goal: a secure, low-cost architecture with a static frontend and Netlify Functions.

## 1. Platform facts that shape the design

From Netlify's Functions configuration reference:

| Setting | Default | Configurable |
|---|---|---|
| Region | `cmh` (US East, Ohio) | Yes |
| Memory | 1024 MB | Yes (`memory: "2gb"`) |
| Synchronous execution limit | 60 seconds | No |
| Scheduled execution limit | 30 seconds | No |
| Background execution limit | 15 minutes | No |
| Buffered request/response payload | 6 MB | No |
| Streamed response payload | 20 MB | No |
| Background request/response payload | 256 KB | No |

Other facts:

- Background functions return `202` at once. On error, Netlify retries after 1 minute, then again 2 minutes later.
- Scheduled functions use cron syntax in UTC. They run only on published deploys, not Deploy Previews. They cannot be called by URL.
- Netlify Blobs: eventual consistency by default (updates reach all edges within 60 seconds); strong consistency is opt-in per store or per call. Objects up to 5 GB, metadata up to 2 KB, keys up to 600 bytes, list pages of 1,000. Encrypted at rest and in transit.
- Site-wide stores (`getStore`) persist across deploys. Deploy stores (`getDeployStore`) are tied to one deploy.
- Rate limits can be declared per function in `config.rateLimit` (`windowLimit`, `windowSize`, `aggregateBy: ["ip", "domain"]`). They cannot be set in `netlify.toml`.
- Environment variables can be scoped to **Functions** only on Pro and Enterprise — **not on our Free plan**, so secrets are also visible to builds. Values may be up to 5,000 characters. Variables can be marked "Contains secret values". Changes appear in the team audit log.
- The legacy Lambda-compatible streaming API documents a 10-second streaming limit. Use the modern `(req, context) => Response` API for streaming and verify the limit during the build spike (section 9).

## 2. Architecture diagram

```
                ┌──────────────────────────── Browser (PWA) ───────────────────────────┐
                │  Static app (Vite + React/TS)    Service worker   IndexedDB (saved)  │
                │  Filters, sorting, band colors computed locally from API data        │
                │  supabase-js (publishable key): sign-in, Google PKCE, MFA, refresh   │
                └───────────────┬─────────────────────────────────────────┬────────────┘
                                │ HTTPS (same origin /api/*)              │ HTTPS
                                │ Authorization: Bearer <access token>    ▼
                                │                               Supabase Auth + Postgres
                                │                               (auth.users, public.profiles)
┌───────────────────────────────▼───────────────────────── Netlify ────────────────────────────┐
│ Every protected function: getClaims() (local ES256) → read role from profiles (RLS)          │
│ Synchronous functions (≤60 s)                     Background functions (≤15 min)             │
│  /api/resume        upload + parse (text path)     extract-background    job requirements    │
│  /api/jobs          list/filter (cached)           match-background      score a profile     │
│  /api/match/:id     scores + explanation           agent-task-background long agent work     │
│  /api/agents        list agent manifest                                                       │
│  /api/agents/chat   streaming Claude chat        Scheduled functions (≤30 s)                  │
│  /api/proposals/*   diff review + approve         schedule-ingest (hourly) → fan out          │
│                                                   schedule-cleanup (daily) → retention         │
│                                                                                                │
│ Netlify Blobs stores: jobs, profiles, matches, proposals, tasks, audit, ratelimit, registry   │
│ Env vars, secret (no scopes on Free): ANTHROPIC_API_KEY, GITHUB_TOKEN, DATA_KEY, ...          │
│ Env vars, public: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY (Production context only)           │
└───────────┬──────────────────────────┬────────────────────────────┬──────────────┬───────────┘
            │                          │                            │              │
     Claude API (Messages)     GitHub REST API (one repo)     Job sources     Supabase (role read
                                                              (Greenhouse,    with the caller's
                                                              Lever, USAJOBS, token; JWKS fetch,
                                                              career pages)   cached)
```

## 3. Browser vs server responsibilities

| Concern | Browser | Server (Functions) | Reason |
|---|---|---|---|
| UI, routing, filters, sort | ✓ | | Instant, no cost |
| Band colors, display formatting | ✓ | | Pure presentation |
| Match score calculation | ✓ (re-sort on filter change) | ✓ (source of truth, stored) | Same pure TS module, shared package. Server value is canonical. |
| File type/size precheck | ✓ | ✓ (authoritative) | Never trust the client |
| Resume text extraction | | ✓ | Libraries, size limits, privacy |
| Any Claude call | | ✓ only | API key must never reach the browser |
| GitHub commits | | ✓ only | Token must never reach the browser |
| Job ingestion | | ✓ (scheduled + background) | Long-running, rate-limited |
| Sign-in, sign-out, token refresh, MFA enrol | ✓ (supabase-js, publishable key) | | Supabase Auth handles credentials; our code never sees passwords |
| Auth decisions (token check, role, aal2, step-up) | | ✓ | Client claims are not trusted |
| Saved opportunities | ✓ (IndexedDB, offline) | ✓ (sync to Blobs when signed in) | Offline first |

Share one `@finmatch/scoring` package between browser and server. It has no I/O and no dependencies.

### 3.1 Auth flow (ADR 0006, proposed)

Supabase Auth is the identity provider for all users. Netlify Identity and Auth0 are not used. Full security design: [security/supabase-auth.md](security/supabase-auth.md). Screens: [design/ux/auth-flows.md](design/ux/auth-flows.md).

1. **Browser ↔ Supabase Auth.** The app signs users in with supabase-js and the publishable key. Methods: email and password, or Continue with Google (`signInWithOAuth`, PKCE). The browser holds the access token and refresh token. `super_admin` users also pass a TOTP challenge, which raises the token to `aal2`.
2. **Browser → Function.** Each `/api/*` call that needs a user sends `Authorization: Bearer <access token>`.
3. **Function verifies the token on every request.** `getClaims()` checks the signature against the project's JWKS. With asymmetric (ES256) keys this runs locally, usually with no network call. Any error returns 401. Never trust `getSession()` on the server.
4. **Function reads the role on every request.** It builds a Supabase client with the caller's own token and selects the caller's row in `public.profiles`. RLS allows only that row. The role is `user` or `super_admin`. It never comes from `user_metadata`.
5. **Function enforces the rule.** Helpers in `netlify/functions/_lib/auth/` (owner: `security-expert`):
   - `requireUser`: valid token.
   - `requireRole("super_admin")`: Agents page, agent list, chat, proposals.
   - `requireAal2`: `aal` claim is `aal2` for any `super_admin` route.
   - Approve also needs step-up: the newest `amr` entry is `totp`, at most 10 minutes old (ADR 0002).
   - A `user` gets 403. Responses carry `Cache-Control: private, no-store`.
6. **Public routes stay public.** `/api/jobs` needs no token and stays CDN-cached. That keeps auth cost off the busiest route (ADR 0003).

Naming note: Supabase `public.profiles` holds only `id`, `role` and `created_at`. The Blobs `profiles` store holds the encrypted CandidateProfile. They are different things.

No Function holds a Supabase secret key (`sb_secret_...`) or the legacy `service_role` key. Promotion to `super_admin` is a manual SQL step by the project lead, and it is audited. No resume data goes to Supabase (ADR 0004).

Sources (read 2026-11-25): supabase-js `getClaims` https://supabase.com/docs/reference/javascript/auth-getclaims · JWT signing keys https://supabase.com/docs/guides/auth/signing-keys · MFA https://supabase.com/docs/guides/auth/auth-mfa · API keys https://supabase.com/docs/guides/getting-started/api-keys.

## 4. Repository layout

```
/
├─ netlify.toml
├─ package.json                 (workspaces)
├─ apps/web/                    Vite + React + TypeScript PWA
├─ netlify/functions/           Function entry points (TypeScript)
├─ packages/scoring/            pure scoring module (shared)
├─ packages/schemas/            Zod schemas: CandidateProfile, JobRequirements, MatchResult ...
├─ packages/sources/            job source connectors
├─ data/taxonomy/               skills, titles, industries (versioned JSON)
├─ .claude/agents/              agent definitions (read at build into a manifest)
├─ docs/                        this research
└─ tests/                       unit, integration, e2e
```

## 5. Storage design (Netlify Blobs)

| Store | Key pattern | Consistency | Contents |
|---|---|---|---|
| `registry` | `employers.json` | strong | Employer list, ATS type, tokens, terms review |
| `jobs` | `job/{jobId}.json`, `index/{yyyy-mm-dd}.json` | eventual | NormalizedJob, daily indexes |
| `extractions` | `req/{contentHash}.json` | eventual | Cached JobRequirements |
| `profiles` | `user/{userId}/profile.enc` | strong | Encrypted CandidateProfile |
| `matches` | `user/{userId}/{jobId}.json` | eventual | MatchResult + explanation |
| `saved` | `user/{userId}/saved.json` | strong | Saved opportunities |
| `tasks` | `task/{taskId}.json` | strong | Background task status and progress |
| `proposals` | `proposal/{id}.json` | strong | Agent change proposals and diffs |
| `audit` | `log/{yyyy-mm-dd}/{ulid}.json` | strong | Append-only audit events |
| `ratelimit` | `user/{userId}/{window}.json` | strong | Per-user quotas (Claude spend) |

Why Blobs and not a database at first:

- Built in, no new vendor, encrypted at rest.
- Fits key/value access and small scale (thousands of jobs, hundreds of users).

When to add a database (for example Postgres via Netlify DB or Supabase):

- More than ~20,000 active jobs, or cross-user queries.
- Need for SQL filtering on the server.
- Blobs `list` paging becomes a bottleneck.

Keep a storage interface (`JobRepo`, `ProfileRepo`) so the swap is local.

## 6. Caching

| Layer | What | TTL / rule |
|---|---|---|
| Netlify CDN | `/api/jobs` public list | `Netlify-CDN-Cache-Control: public, s-maxage=600, stale-while-revalidate=3600` (verify header names against Netlify caching docs) |
| Netlify CDN | Personal endpoints | `Cache-Control: private, no-store` |
| Service worker | See `pwa-requirements.md` | |
| Blobs | Claude extractions | Forever, keyed by content hash |
| Blobs | Explanations | Until profile or weights version changes |
| Claude prompt cache | System prompts and tool definitions | Keep them byte-stable; put variable data last |

## 7. Claude usage plan

| Task | When | Model / effort | Max tokens |
|---|---|---|---|
| Resume → CandidateProfile | On upload | `claude-opus-5-5`, effort `low` | 16,000 |
| Job → JobRequirements | Once per new job (background) | `claude-opus-5-5`, effort `low` | 8,000 |
| Match explanation | On first open of a job card | `claude-opus-5-5`, effort `low` | 4,000 |
| Agent console chat | On user message (streaming) | Agent's model from frontmatter, default `claude-opus-5-5` | 64,000 streaming |

- Use the official `@anthropic-ai/sdk`.
- Add the server-side refusal fallback (`fallbacks: "default"` with beta `server-side-fallback-2026-07-01`) and handle `stop_reason: "refusal"`.
- Moving bulk extraction to `claude-haiku-5-5` is a cost lever. It is the owner's call, after an eval shows equal accuracy.
- Message Batches (50% cost) suit the nightly re-extraction backlog, if any.
- Tier 1 rate limits for Opus 5.5: 4,000 RPM, 2,000,000 input tokens/min, 400,000 output tokens/min. Cached reads do not count toward ITPM. Monthly spend caps depend on usage tier.

## 8. Deployment workflow

1. Connect the GitHub repo to a Netlify site. Production branch: `main`.
2. Every push to `main` builds and deploys production. Pull requests get Deploy Previews.
3. Build command: `npm run build` → builds web app, generates `agents-manifest.json` from `.claude/agents/*.md`, type-checks functions.
4. Set environment variables in the Netlify UI marked "Contains secret values" (Free plan: no scopes). Use different values per deploy context. Deploy Previews get a low-budget Claude key and **no** GitHub write token (ADR 0001).
5. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the Netlify UI with a value for the **Production** context only (ADR 0006). Both are public by design, so they need not be marked secret. The build may expose them to the browser; they are the only values allowed a client-exposed name. Deploy Previews get no value, so previews have no login and protected Functions return 401. Never set a Supabase secret key or `service_role` key anywhere.
6. Create a **build hook** only if continuous deployment is off. Build hooks accept `trigger_branch`, `trigger_title` and `clear_cache`. Store the hook URL as a secret.
7. Node runtime: pin a version in `netlify.toml` / `package.json engines`. `unpdf` requires Node 24+; confirm Netlify's supported Node versions during the spike.

`netlify.toml` sketch:

```toml
[build]
  command = "npm run build"
  publish = "apps/web/dist"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[headers]]
  for = "/*"
  [headers.values]
    # connect-src must allow the Supabase project URL so supabase-js can reach Supabase Auth (ADR 0006)
    Content-Security-Policy = "default-src 'self'; connect-src 'self' https://<project-ref>.supabase.co; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
```

Function example (modern API, with rate limit):

```ts
import type { Config, Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const user = await requireUser(req);          // see security.md
  // ...
  return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
};

export const config: Config = {
  path: "/api/match/:jobId",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
```

## 9. Build-phase spikes (verify before committing)

1. Streaming function response duration on the modern API (target: 60 s chat turns).
2. Supported Node versions for functions (need 24+ for `unpdf`, or pin an older `unpdf`).
3. Resolved: code-based `rateLimit` is available on all plans, including Free.
4. Resolved: Free plan chosen (ADR 0003); no env-var scopes, so secrets stay out of client code.
5. Resolved: auth provider is Supabase Auth (ADR 0006, proposed). Netlify Identity has no MFA and is not used; Auth0 is not used.
6. Added Function time of the per-request `profiles` role read (one HTTPS call to Supabase). Measure credits impact against ADR 0003.

## 10. Scaling and cost

- Static assets: CDN, effectively free at this scale.
- Function invocations: dominated by `/api/jobs` reads (cache at CDN) and ingestion (hourly, bounded by employer count).
- Claude spend: dominated by one-time job extraction. Estimate: 300 new Orlando finance jobs/week × ~3,000 input + ~800 output tokens. At Opus 5.5 prices ($4 / $20 per MTok) that is about 300 × ($0.012 + $0.016) ≈ $8.40/week. Explanations scale with active users; cache them.
- Per-user daily Claude budget enforced in `ratelimit` store (see `security.md`).

## 11. Acceptance criteria

- No secret appears in the built `dist/` bundle (CI grep for key patterns).
- All `/api/*` personal routes return `Cache-Control: private, no-store`.
- Deploy Preview contexts cannot commit to GitHub (no token present).
- Deploy Previews have no Supabase values, so no login works there (ADR 0006).
- Every protected route returns 401 without a valid token and 403 for the wrong role (ADR 0006).
- A new job ingested by the hourly schedule is visible in `/api/jobs` within 70 seconds of its write (Blobs eventual consistency + CDN TTL).

## Sources

- Netlify, Configuration for functions (default limits table). https://docs.netlify.com/build/functions/configuration/
- Netlify, Get started with functions (modern signature, `config.path`). https://docs.netlify.com/build/functions/get-started/
- Netlify, Functions API reference (`rateLimit`). https://docs.netlify.com/build/functions/api/
- Netlify, Background Functions. https://docs.netlify.com/build/functions/background-functions/
- Netlify, Scheduled Functions. https://docs.netlify.com/build/functions/scheduled-functions/
- Netlify, Lambda compatibility (legacy streaming limits). https://docs.netlify.com/build/functions/lambda-compatibility/
- Netlify Blobs. https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- Netlify, Environment variables overview. https://docs.netlify.com/build/environment-variables/overview/
- Netlify, Build hooks. https://docs.netlify.com/build/configure-builds/build-hooks/
- Netlify, Rate limiting. https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/
- Claude API rate limits. https://platform.claude.com/docs/en/api/rate-limits
- unpdf (Node 24+). https://github.com/unjs/unpdf
- Supabase, supabase-js `getClaims` (read 2026-11-25). https://supabase.com/docs/reference/javascript/auth-getclaims
- Supabase, JWT signing keys (read 2026-11-25). https://supabase.com/docs/guides/auth/signing-keys
- Supabase, API keys (read 2026-11-25). https://supabase.com/docs/guides/getting-started/api-keys
- Supabase, Multi-factor authentication (read 2026-11-25). https://supabase.com/docs/guides/auth/auth-mfa
