# ADR 0002 — Approved agent changes are committed directly to `main`

Status: Accepted · Date: 2026-11-25 · Decider: project lead · Supersedes the "agent/* branch" option in `docs/agent-console.md` §6.5

## Context

Agent Console proposals need a path from approval to production. Options were (a) commit to `main`, which Netlify deploys automatically, or (b) commit to `agent/<id>` branches with a preview and a second approval.

## Decision

- After explicit approval, the Agent Console commits **directly to `main`** as one atomic commit (Git Data API: blobs → tree → commit → update `refs/heads/main` with `force: false`).
- Netlify continuous deployment builds the push. No build hook is needed while continuous deployment is on.
- Every commit message records the proposal ID, the agent and the approver.

## Safeguards (all required)

1. Human approval with step-up re-authentication within 10 minutes and typing the proposal number.
2. Path allow-list and deny-list (deny wins). Functions, `netlify.toml`, `package*.json` and `.github/**` are always denied.
3. Secret scan on proposed content.
4. Base-SHA check: if `main` moved and a proposed file changed, the proposal is marked **stale** and cannot be committed.
5. `force: false` on the ref update, so non-fast-forward updates fail with 422.
6. Branch protection on `main`: block force-push and deletion. Do not require pull requests, or the token's direct commits would be refused.
7. A one-click **Revert** proposal for every committed change, through the same approval flow.
8. QA's CI runs on every push to `main`; a failed run alerts the project lead.

## Consequences

- Fast loop: approve → live in minutes.
- No preview before production. Risk is limited by the allow-list (UI code, taxonomy, docs, tests, agent files only) and fast revert.
- Human pull requests remain the only route for functions, config and dependencies.

Referenced by: `docs/agent-console.md`, `docs/security.md`, skills `agent-console`, `github-api`, `netlify-deployment`.
