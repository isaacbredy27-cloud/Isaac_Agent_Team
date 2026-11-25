---
name: github-api
description: GitHub REST API from Netlify Functions with a fine-grained PAT (ADR 0001) — read file contents, atomic multi-file commits via Git Data API (blobs, trees, commits, refs), Contents API for single files, base-SHA checks, rate limits and errors. Use for the Agent Console commit path or any GitHub call.
metadata:
  owner: agent-console-engineer
  backups: [netlify-engineer, security-expert]
  version: 1.0.0
---

# GitHub API

## Inputs → Outputs
- Inputs: Approved proposal (paths, contents, base SHA).
- Outputs: Commit SHA on main, or stale / error status.

## Purpose
Read repo files and commit approved changes to `main` safely.

## Use when
- Building `read_file` for agents, or the commit step after approval.

## Token (ADR 0001)
Fine-grained PAT, this repo only, **Contents: read & write**, 90-day expiry, `GITHUB_TOKEN` Production-only.

## Headers
```
Accept: application/vnd.github+json
Authorization: Bearer $GITHUB_TOKEN
X-GitHub-Api-Version: 2026-03-10
```

## Atomic commit to main (ADR 0002)
1. `GET /repos/{o}/{r}/git/ref/heads/main` → `head` (Contents read).
2. If `head ≠ proposal.baseCommitSha` and any proposed file changed since → mark **stale**, stop.
3. `GET /repos/{o}/{r}/git/commits/{head}` → `tree.sha`.
4. `POST /git/blobs` per file (`content`, `encoding: "base64"`).
5. `POST /git/trees` `{ base_tree, tree: [{ path, mode: "100644", type: "blob", sha }] }` (delete: `sha: null`).
6. `POST /git/commits` `{ message, tree, parents: [head] }` → 201.
7. `PATCH /git/refs/heads/main` `{ sha, force: false }` → 200; 422 if not fast-forward.

Single file alternative: `PUT /repos/{o}/{r}/contents/{path}` with `message`, base64 `content`, current `sha` when updating, `branch`. Don't run it in parallel with the delete endpoint (GitHub: they conflict).

## Limits and errors
- 5,000 req/h primary; secondary 80 content-creating req/min, 500/h, ≤ 100 concurrent.
- Honour `retry-after`; if `x-ratelimit-remaining` is 0 wait until `x-ratelimit-reset`.
- 404 on private repo = bad token scope; 409 empty repo/conflict; 422 validation or non-fast-forward.
- Get contents: ≤ 1 MB full support; 1–100 MB raw only.

## Checklist
- [ ] Path validated against allow/deny lists before any call (skill: authorization)
- [ ] Base-SHA check
- [ ] `force: false`
- [ ] Token never logged
- [ ] Mocked tests for each step + one 422 path

## Common mistakes
- Using the Contents API for multi-file changes (multiple commits, partial states).
- Forgetting `parents` → creates a root commit.

## Best practices
- One atomic commit per proposal
- Base-SHA check before writing
- `force: false` always
- Serial writes; respect secondary limits

## References
- https://docs.github.com/en/rest/repos/contents
- https://docs.github.com/en/rest/git/trees
- https://docs.github.com/en/rest/git/commits
- https://docs.github.com/en/rest/git/refs
- https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
