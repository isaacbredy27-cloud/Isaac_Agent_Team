# Finance Match Orlando

Finance Match Orlando is an installable web app (PWA) on Netlify. A job seeker uploads a resume. The app collects recent Orlando-area finance jobs. It scores each job against the resume with a fixed algorithm and explains the score. An Agent Console lets admins chat with the project's agents and accept code changes only after human review.

Resumes are never public. The app uses them only to match candidates to jobs (ADR 0004).

## Features

- Browse recent Orlando-area finance jobs. The list is cached at the CDN and refreshed every 2 hours.
- Upload a resume (PDF, DOCX or text). The app extracts a profile.
- Match scores and bands per job, with the evidence behind each score.
- Skill gaps: what to add to move jobs up a band.
- Installable PWA with an offline page.
- Sign-in with Supabase (email or Google). Admins need MFA.
- Agent Console (admins only): chat with 18 agents, review diffs, approve, reject or revert.
- In-app guide at `/guide/` and a Resources page at `/resources`.

## Tech stack

- TypeScript (strict), Node 22+.
- React 19, React Router, Vite (`apps/web`).
- Netlify Functions (modern `(req, context)` API) and Netlify Blobs.
- Zod for input checks. Pure scoring code in `packages/scoring`.
- Claude through the official SDK, called only from Functions. Code scores. Claude extracts and explains.
- Supabase Auth for sign-in and roles.
- Vitest and Playwright (with axe) for tests.

## Repository layout

| Path | What lives there |
|---|---|
| `apps/web` | The PWA (React, Vite). Output goes to `apps/web/dist`. |
| `netlify/functions` | HTTP functions. Shared code in `_lib/`. |
| `packages/schemas`, `scoring`, `resume`, `sources` | Shared Zod schemas, scoring, resume parsing, job sources. |
| `supabase` | SQL migrations and setup notes. |
| `scripts` | Manifest build, agent validation, local server. |
| `tests` | Unit and integration tests. |
| `docs` | Research, architecture, ADRs (`docs/adr/`), runbooks (`docs/runbooks/`). |
| `.claude`, `knowledge` | Project agents, skills and their knowledge. |

## Local development

```bash
npm ci
npm run build           # runs build:manifest, then vite build
npm run serve:local     # offline server on http://localhost:8888
# or, on a machine with internet:
npx netlify dev
```

`netlify dev` needs to download Deno for edge functions. It fails in sandboxes. `serve:local` does not. Details and test results: [docs/runbooks/local-run.md](docs/runbooks/local-run.md).

For a stubbed login and a fake Claude, start the server like this:

```bash
CONTEXT=dev E2E_AUTH_STUB=1 E2E_FAKE_CLAUDE=1 \
SUPABASE_URL=https://example.supabase.co SUPABASE_PUBLISHABLE_KEY=sb_publishable_test \
npm run serve:local
```

Test commands:

```bash
npm run build:manifest   # run this before typecheck (also in CI)
npm run typecheck
npm test                 # vitest
npm run e2e              # playwright
npm run validate:agents
```

## Environment variables

Set these in the Netlify UI, never in `netlify.toml` or git. Functions cannot read `netlify.toml` variables.

| Name | Kind | Where | Notes |
|---|---|---|---|
| `VITE_SUPABASE_URL` | public | browser | Supabase project URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | public | browser | `sb_publishable_...` key. |
| `SUPABASE_URL` | public | functions | Same URL as above. |
| `SUPABASE_PUBLISHABLE_KEY` | public | functions | Same key as above. Never use a secret or `service_role` key. |
| `ANTHROPIC_API_KEY` | secret | functions | Netlify UI only. Mark "Contains secret values". Rotate every 90 days. |
| `GITHUB_TOKEN` | secret | functions | Fine-grained PAT, this repo only, Contents read/write, 90-day expiry, **Production only** (ADR 0001). Deploy Previews never get it. |
| `GITHUB_REPO` | config | functions | `isaacbredy27-cloud/Isaac_Agent_Team` |
| `JOBS_GREENHOUSE` | optional | functions | Set `1` to enable the Greenhouse source. |

Test-only flags. Never set them in production. The stub login works only when `CONTEXT` is `dev` or `test`.

| Name | Purpose |
|---|---|
| `E2E_AUTH_STUB` | Accept `stub.<role>.<aal>.<time>` tokens in functions. |
| `E2E_FAKE_CLAUDE` | Replace Claude calls with canned replies. |
| `VITE_E2E_AUTH_STUB` | Stub login in the browser build. |
| `GITHUB_API_BASE` | Point GitHub calls at a fake server. |

## Deploy on the Netlify Free plan

The Free plan has 300 credits a month. Going over pauses every project on the account (ADR 0003). Check credits weekly. Alerts at 60% and 80%.

1. In Netlify, add a site from this GitHub repo.
2. Leave build settings alone. They come from `netlify.toml` (`npm run build`, publish `apps/web/dist`).
3. Set the variables above in the UI, per deploy context. Mark secrets as secret. Put `GITHUB_TOKEN` in Production only.
4. Set up Supabase as described in [supabase/README.md](supabase/README.md). Run the migrations.
5. In Supabase, enable Google OAuth. Put the redirect URLs in exactly as listed in that file. Keep the Google client secret in Supabase only.
6. Deploy. Sign in once, then promote yourself to `super_admin` with the SQL in `supabase/README.md`.
7. Enrol MFA (TOTP). Admin routes need an `aal2` session.
8. Tighten `connect-src` in `netlify.toml` to your exact Supabase host (see the TODO there).

Smoke test after each deploy:

- [ ] `/` loads and the app installs.
- [ ] `/guide/` loads.
- [ ] `/api/jobs` returns jobs.
- [ ] Upload a synthetic resume. Match and gaps return results.
- [ ] `/api/agents` returns 401 without a token.
- [ ] Admin sign-in with MFA works. The console lists 18 agents.
- [ ] No secret appears in `apps/web/dist`.

## How the Agent Console commits

1. An admin chats with an agent. The agent drafts a proposal (a set of file changes).
2. The admin reviews the diff and approves with a fresh TOTP step-up (10 minutes at most).
3. The function checks the allow-list and the base commit SHA. Then it commits once, directly to `main` (ADR 0002).
4. Netlify sees the push and redeploys. Run the smoke test.
5. To undo, approve a Revert proposal or publish the previous deploy in Netlify.

Functions, `netlify.toml`, `package*.json` and `.github/**` change only through human pull requests.

## More

- Docs start at [docs/README.md](docs/README.md). Binding decisions are in [docs/adr/](docs/adr/).
- Operating manual: [CLAUDE.md](CLAUDE.md).
- In the app: `/guide/` and `/resources`.

## CI note

Run `npm run build:manifest` before `npm run typecheck`. The typecheck needs the generated agent bundle.
