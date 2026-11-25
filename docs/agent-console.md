# Agent Console

Research date: 2026-11-24. Updated 2026-11-25: approved changes commit **directly to `main`** ([ADR 0002](adr/0002-commit-approved-changes-to-main.md)) using a fine-grained PAT for this repo only ([ADR 0001](adr/0001-github-fine-grained-pat-single-repo.md)). Access uses Supabase Auth ([ADR 0006](adr/0006-supabase-auth.md), proposed). Owner: `agent-console-engineer` (skill `agent-console`). Goal: an in-app console that lists the agents in `.claude/agents`, lets a `super_admin` chat with them, and lets agents **propose** code changes that a human approves before anything is committed or deployed.

## 1. Requirements recap

- List every agent in `.claude/agents`, with name, model, personality and responsibilities.
- Chat with an agent.
- Call Claude only from a Netlify Function. The API key lives in environment variables.
- Agents may propose changes. They cannot deploy.
- Flow: propose → show diff → explicit approval → commit to GitHub → Netlify redeploys.

## 2. Agent definitions

Claude Code subagents are Markdown files with YAML frontmatter in `.claude/agents/`. The console reuses that format so the same files serve both Claude Code and the app.

```markdown
---
name: scoring-engineer
description: Owns the match scoring module and its tests. Use for weight, gate and sub-score changes.
model: claude-opus-5-5
tools: Read, Grep, Glob, Edit
personality: Precise, cautious, explains trade-offs with numbers.
responsibilities:
  - packages/scoring/**
  - data/taxonomy/**
---

You are the scoring engineer for Finance Match Orlando...
```

- `name`, `description`, `model`, `tools`: standard Claude Code fields.
- `personality`, `responsibilities`: app-specific fields. Claude Code ignores unknown keys, but verify that during build.
- `responsibilities` doubles as the agent's **path allow-list** for proposals (section 6).

Implemented: 18 agents in `.claude/agents/` (see `docs/expert-roster.md` §14). Claude Code ignores unknown frontmatter fields, so console metadata (personality, responsibilities, persona, status) lives in a `yaml console-profile` block in each agent body, which the manifest builder parses.

## 3. How the app reads agents

Functions do not see the repo at runtime unless files are bundled. So:

1. At build time, a script parses `.claude/agents/*.md` (with `gray-matter`).
2. It validates frontmatter with Zod.
3. It writes `agents-manifest.json` with `{ name, description, model, personality, responsibilities, systemPromptHash }`. The file is bundled into the `agents-*` functions, not the publish directory. The UI fetches it from `GET /api/agents`, behind the §4.1 checks.
4. It writes system prompts to a **server-only** module bundled into the chat function. The browser never receives full system prompts.

Each deploy refreshes the manifest. An approved change to an agent file shows up after the redeploy.

## 4. Console UI

```
Agent Console                                   [Proposals (2)]
┌───────────────────────┐ ┌──────────────────────────────────┐
│ ● scoring-engineer    │ │ scoring-engineer · claude-opus-5-5│
│   claude-opus-5-5     │ │ Precise, cautious...             │
│ ● frontend-engineer   │ │ Owns: packages/scoring/**        │
│   claude-opus-5-5     │ │──────────────────────────────────│
│ ● qa-accessibility    │ │ You: Lower education weight to 10│
│   ...                 │ │ Agent: Here's why... [Proposal #7]│
└───────────────────────┘ │ [ Type a message…        ] [Send]│
                          └──────────────────────────────────┘
```

- Agent list: name, model badge, one-line description.
- Detail: personality, responsibilities (paths), tools.
- Chat: streamed responses. Markdown rendered with a sanitizer (no raw HTML).
- Proposals tab: pending, approved, rejected, committed.

Access: `super_admin` with MFA only. See §4.1.

### 4.1 Access control (Supabase Auth)

Roles: `user` (default) and `super_admin`. No other role exists.

| Action | Needs |
|---|---|
| Open the Agents page, list agents (`GET /api/agents`) | `super_admin` + `aal2` |
| Chat (`POST /api/agents/chat`) | `super_admin` + `aal2` |
| List and view proposals, Reject | `super_admin` + `aal2` |
| Approve, Revert | `super_admin` + `aal2` + step-up (TOTP ≤ 600 s) |

Every `agents-*` and `proposals-*` Function runs these checks first, on every request, in this order:

1. Read `Authorization: Bearer <access token>`. Missing → `401 {"error":"unauthorized"}`.
2. Verify with `supabase.auth.getClaims(token)`. Asymmetric signing keys let this run locally against the cached JWKS. Any error → `401 {"error":"unauthorized"}`.
3. Read `role` from `public.profiles` where `id = claims.sub`. Use a client built from `SUPABASE_URL`, the publishable key and the user's own token, so RLS applies. Never read the role from the JWT, `user_metadata` or the request. No row means `user`. A lookup failure returns `503` (fail closed).
4. Role `user` → `403 {"error":"forbidden"}`. The body is the same on every route and names nothing.
5. `claims.aal !== "aal2"` → `403 {"error":"mfa_required"}`.
6. Approve and Revert only: require `claims.amr[0].method === "totp"` and `now − claims.amr[0].timestamp ≤ 600` s. Otherwise `403 {"error":"step_up_required"}`.

The role check runs before the MFA check, so a `user` never learns that a route needs MFA. Every response sends `Cache-Control: private, no-store`. No secret key (`sb_secret_…` or legacy `service_role`) exists in code, env vars or docs.

UI behaviour:

- The UI hides console links from `user`. This is a convenience only; the Functions enforce access.
- `forbidden`: show the plain "not available" screen ([auth flows](design/ux/auth-flows.md)).
- `mfa_required`: continue sign-in with the TOTP challenge, or enrolment if no factor exists. Do not sign the user out.
- `step_up_required`: open the step-up sheet (`mfa.challenge` + `mfa.verify`). It closes and returns focus to Approve. The user presses Approve again. No auto-retry.

Identity: Functions take `sub` only from verified claims. Request bodies carry no user ID, email or approver field; Functions ignore any that arrive. Audit events record the hashed `sub`, route, action, proposal ID and result.

## 5. Chat function

`POST /api/agents/chat` (synchronous, streaming).

1. Run the §4.1 checks (`super_admin` + `aal2`).
2. Check per-user Claude budget (`ratelimit` store).
3. Load agent system prompt from the server-only bundle by `name`. Ignore any system prompt the client sends.
4. Build messages from the stored conversation (`conversations/{sub}/{agent}/{id}.json`, with `sub` from verified claims).
5. Call Claude with streaming and one client tool, `propose_change`.
6. Stream text to the browser (Server-Sent Events or a chunked `ReadableStream`).
7. When the model calls `propose_change`, validate and store a proposal (section 6). Return a `tool_result` with the proposal ID. Do not write anything to GitHub.
8. Append an audit event.

```ts
const stream = client.messages.stream({
  model: agent.model ?? "claude-opus-5-5",
  max_tokens: 64000,
  system: [{ type: "text", text: agent.systemPrompt, cache_control: { type: "ephemeral" } }],
  tools: [proposeChangeTool],         // with eager_input_streaming: true; validate input with Zod before use
  messages,
});
```

Key rules from the Claude docs and SDK guidance:

- Stream long responses to avoid timeouts. Use `finalMessage()` to collect the complete message.
- Validate each tool input against its schema before acting. Stop on `max_tokens` or `refusal` stop reasons.
- Forced `tool_choice` (`any` / `tool`) returns 400 on Opus 5.5. Use `auto` and instruct the model.
- Put stable content first (system, tools) for prompt caching.

Long tasks (multi-file analysis) run as a background task instead. See `long-running-jobs.md`.

## 6. Proposals

### 6.1 Tool definition

```ts
const proposeChangeTool = {
  name: "propose_change",
  description: "Propose edits to repository files. A human reviews a diff and must approve before anything is committed.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "rationale", "files"],
    properties: {
      title: { type: "string", maxLength: 120 },
      rationale: { type: "string", maxLength: 4000 },
      files: {
        type: "array", maxItems: 10,
        items: {
          type: "object", additionalProperties: false,
          required: ["path", "action"],
          properties: {
            path: { type: "string", maxLength: 300 },
            action: { type: "string", enum: ["create", "update", "delete"] },
            content: { type: "string", maxLength: 200000 }
          }
        }
      }
    }
  }
};
```

The agent needs current file contents to propose edits. Give it a read-only `read_file` tool that serves files from the **GitHub API at the current `main` SHA**, limited to its allow-list.

### 6.2 Server-side validation

For each file:

1. Normalize the path. Reject `..`, absolute paths, backslashes, null bytes, symlink targets.
2. Check the agent's `responsibilities` globs.
3. Check the **global allow-list** and **deny-list** (deny wins):
   - Allow: `apps/web/src/**`, `packages/**`, `data/taxonomy/**`, `docs/**`, `.claude/agents/**`, `tests/**`.
   - Deny: `netlify.toml`, `netlify/functions/**`, `package.json`, `package-lock.json`, `.github/**`, `.env*`, `**/*.key`, `**/*.pem`, `scripts/**`, any file > 200 KB.
4. Scan content for secret patterns (API key prefixes, private keys). Reject on match.
5. Fetch the base file and its blob SHA from GitHub at `main` HEAD. Record `baseCommitSha`.
6. Compute a unified diff (`diff` npm package).

Store:

```ts
type Proposal = {
  id: string; agent: string; requestedBy: string; /* Supabase sub, from verified claims */ createdAt: string;
  title: string; rationale: string;
  baseCommitSha: string;
  files: Array<{ path: string; action: "create" | "update" | "delete"; baseBlobSha?: string; newContent?: string; diff: string }>;
  status: "pending" | "approved" | "rejected" | "committed" | "failed" | "stale";
  reviewer?: string; /* approver sub, from verified claims */ reviewedAt?: string; commitSha?: string; error?: string;
};
```

### 6.3 Review UI

- Side-by-side or unified diff per file. Syntax highlighted. Line numbers.
- Rationale and the chat link.
- Checks panel: allow-list ✓, secrets scan ✓, size ✓, base still current ✓/✗.
- Buttons: **Approve and commit**, **Reject**, **Request changes** (returns to chat).
- Approve requires `super_admin`, `aal2`, a TOTP step-up within the last 600 seconds (§4.1 step 6) and typing the proposal number. This blocks accidental or forged approvals. It meets ADR 0002's "re-authentication within 10 minutes".
- Reject requires `super_admin` and `aal2`. It needs no step-up.
- Optional two-person rule: when a second `super_admin` exists, the approver's `sub` must differ from `requestedBy`.

### 6.4 Commit flow (GitHub REST, fine-grained token)

For multi-file changes, use the Git Data API for one atomic commit:

1. `GET /repos/{owner}/{repo}/git/ref/heads/main` → current SHA. If it differs from `baseCommitSha` and any proposed file changed since, mark **stale** and ask the agent to rebase.
2. `POST /git/blobs` for each new or updated file.
3. `POST /git/trees` with `base_tree` = current tree, entries for each path (deletes use `sha: null`).
4. `POST /git/commits` with message `agent(<name>): <title>\n\nProposal: #<id>\nApproved-by: <sub>` and parent = current SHA. The `sub` comes from the approver's verified claims, never the request. The email is never written to git history.
5. `PATCH /git/refs/heads/main` with the new commit SHA (`force: false`).

For single-file changes, `PUT /repos/{owner}/{repo}/contents/{path}` also works. It needs `message`, base64 `content`, and the current `sha` when updating. Do not run it in parallel with the delete endpoint; GitHub says concurrent calls conflict.

Token permissions: **Contents: read and write** on the one repository. Workflow files would also need **Workflows: write**. We do not grant it, so `.github/workflows/**` cannot change even if validation failed.

### 6.5 Redeploy

- Default: Netlify continuous deployment builds on every push to `main`. The commit itself triggers the deploy.
- Alternative: if auto-publishing is locked, call the build hook URL (secret env var) with `trigger_title=Proposal%20%23<id>`.
- Poll Netlify deploy status (Netlify API, read-only token) and show "Deploying… / Live / Failed" on the proposal.
- Decided (ADR 0002): commit directly to `main`. The branch-preview variant was considered and not adopted; revisit only through a new ADR.

### 6.6 Rollback

- "Revert" button on committed proposals creates a new proposal that reverses the diff. Pressing it needs `super_admin`, `aal2` and step-up (§4.1). Approving the revert follows §6.3.
- Netlify also allows publishing an earlier deploy from its UI.

## 7. Prompt injection posture

- Agents never see untrusted user resumes or job postings. They only see repo files and `super_admin` chat.
- Agents have no network tools, no shell, and no write path except `propose_change`.
- Every effect passes through code validation plus a human approval.
- Text inside repository files is data. The system prompt says so. Even if an agent is tricked, it can only create a pending proposal.

## 8. Acceptance criteria

- The console lists every `.md` file in `.claude/agents/` after deploy, with name, model, personality and responsibilities.
- Chat responses stream; first token in ≤ 3 s at p50.
- A proposal touching a denied path is rejected before storage.
- No commit happens without an approval event in the audit log from a `super_admin` with a passed step-up (TOTP ≤ 600 s).
- Every `agents-*` and `proposals-*` Function returns 401 without a valid token, 403 `forbidden` for `user`, and 403 `mfa_required` without `aal2`.
- Approve and Revert return 403 `step_up_required` when `amr[0]` is not `totp` or is older than 600 s.
- A role in `user_metadata` or the request body never grants access.
- A stale proposal (main moved and file changed) cannot be committed.
- After approval, the commit appears on `main` and a Netlify deploy starts within 2 minutes.
- Deploy Preview environments have no GitHub write token; the Approve button is disabled there.

## Sources

- Supabase JWTs and signing keys. https://supabase.com/docs/guides/auth/jwts · https://supabase.com/docs/guides/auth/signing-keys (read 2026-11-25)
- supabase-js `getClaims`. https://supabase.com/docs/reference/javascript/auth-getclaims (read 2026-11-25)
- Supabase MFA (`aal`, `amr`). https://supabase.com/docs/guides/auth/auth-mfa (read 2026-11-25)
- GitHub REST, repository contents (create/update file; Contents write; workflow files need Workflows write; no parallel use with delete). https://docs.github.com/en/rest/repos/contents
- GitHub REST, Git trees (Contents write). https://docs.github.com/en/rest/git/trees
- GitHub REST rate limits (5,000 req/h for PATs; 80 content-creating requests/min, 500/h). https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- GitHub, Managing personal access tokens (fine-grained, selected repositories, expiry). https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- Netlify, Build hooks. https://docs.netlify.com/build/configure-builds/build-hooks/
- Claude API: streaming, tool use, strict tools, prompt caching (Anthropic docs and TypeScript SDK reference).
