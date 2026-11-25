# GitHub REST: contents and Git Data — notes

Sources (read 2026-11-24/25): https://docs.github.com/en/rest/repos/contents · https://docs.github.com/en/rest/git/trees · https://docs.github.com/en/rest/git/commits · https://docs.github.com/en/rest/git/refs · https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api

## Headers
`Accept: application/vnd.github+json` · `Authorization: Bearer <TOKEN>` · `X-GitHub-Api-Version: 2026-03-10`.

## Contents API
- Get: `GET /repos/{owner}/{repo}/contents/{path}` — ≤ 1 MB full support; 1–100 MB `raw`/`object` media types only; > 100 MB unsupported.
- Create/update: `PUT /repos/{owner}/{repo}/contents/{path}` with `message`, base64 `content`, `sha` (required when updating), optional `branch`, `committer`.
- Fine-grained permission: "Contents" repository permissions (write); workflow files also need "Workflows" (write).
- "If you use this endpoint and the Delete a file endpoint in parallel, the concurrent requests will conflict … use these endpoints serially."

## Git Data (atomic multi-file commit)
- `GET /repos/{o}/{r}/git/ref/{ref}` — ref formatted `heads/<branch>`; 404 if missing; "Contents" read; works unauthenticated for public repos.
- `POST /git/trees` — `base_tree` + `tree[]` entries (`path`, `mode`, `type`, `sha` or `content`); "Contents" write.
- `POST /git/commits` — `message` (required), `tree` (required), `parents` (array of SHAs; "If omitted or empty, the commit will be written as a root commit"), optional `author`, `committer`, `signature`; returns 201.
- `PATCH /git/refs/{ref}` — `sha` (required), `force` (default false: "make sure the update is a fast-forward update"); 422 "Validation failed".

## Rate limits
Authenticated PAT: 5,000 requests/hour. Secondary: ≤ 80 content-generating requests/minute, ≤ 500/hour, ≤ 100 concurrent. Honour `retry-after`; if `x-ratelimit-remaining` is 0, wait until `x-ratelimit-reset` (UTC epoch seconds).
