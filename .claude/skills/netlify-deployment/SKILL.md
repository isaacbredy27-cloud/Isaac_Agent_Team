---
name: netlify-deployment
description: Deploying Finance Match Orlando on the Netlify Free plan — Git continuous deployment from main, deploy contexts, environment variables and secrets, build hooks, custom headers, credit budget. Use for netlify.toml, env var, deploy, rollback or plan-limit questions.
metadata:
  owner: netlify-engineer
  backups: [qa-engineer, agent-console-engineer]
  version: 1.0.0
---

# Netlify Deployment

## Purpose
Ship every approved change safely, inside Free-plan limits (ADR 0003).

## Use when
- Editing `netlify.toml`, headers or build settings.
- Adding or rotating an environment variable.
- A deploy fails, or a rollback is needed.
- Checking credit usage.

## Inputs → Outputs
- Inputs: merged commit on `main`, env var list, plan limits.
- Outputs: green production deploy, deploy report, updated runbook.

## Workflow
1. Push to `main` (human PR merge or approved Agent Console commit, ADR 0002) → Netlify builds production.
2. PRs get Deploy Previews. Previews never get `GITHUB_TOKEN`.
3. Build: `npm run build` (web app + agent manifest + typecheck).
4. On failure: keep the previous deploy live; open an incident (skill: incident-response).
5. Rollback: publish the previous deploy in Netlify UI, or approve a Revert proposal.

## Environment variables (Free plan)
- Set in the Netlify UI/CLI, never in `netlify.toml` (stored in git, not visible to functions).
- Mark secrets "Contains secret values". Scopes are Pro-only, so secrets are also visible to the build: never reference them in client code.
- Use per-deploy-context values: Production gets real `GITHUB_TOKEN` and `ANTHROPIC_API_KEY`; Deploy Previews get a low-budget Claude key and no GitHub token.
- Keys: letters, digits, `_`; ≤ 255 chars; values ≤ 5,000 chars. Changes need a new deploy to apply.

## Headers (`netlify.toml`)
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; connect-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'"
    Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

## Build hooks
POST to the secret hook URL; optional `trigger_branch`, `trigger_title`, `clear_cache=true`. Only needed if continuous deployment is off.

## Checklist
- [ ] CI green on the commit
- [ ] Secret scan of `dist/` passed
- [ ] Production env vars present; Preview context has no GitHub token
- [ ] Credit usage < 60% month-to-date
- [ ] Post-deploy smoke test (`/api/health`, home, install manifest)

## Common mistakes
- A single over-budget month pauses **all** projects on the account.
- Expecting a changed env var to apply without redeploying.
- Requiring PRs on `main` branch protection, which blocks the Agent Console's direct commits (ADR 0002).

## Best practices
- Deploy only green commits
- Secrets set in the UI per context
- Check credits weekly
- Smoke-test after each deploy

## References
- https://docs.netlify.com/build/environment-variables/overview/
- https://docs.netlify.com/build/configure-builds/build-hooks/
- https://docs.netlify.com/manage/routing/headers/
- https://www.netlify.com/pricing/
- ADR 0001, 0002, 0003
