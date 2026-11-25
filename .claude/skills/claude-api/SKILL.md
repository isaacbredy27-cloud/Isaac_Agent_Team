---
name: claude-api
description: Calling the Claude API from Netlify Functions with @anthropic-ai/sdk — model choice (claude-opus-5-5 default), effort, streaming, tool use, structured outputs, prompt caching, refusals, rate limits, errors and cost. Use for any code that calls Claude.
metadata:
  owner: ai-systems-engineer
  backups: [agent-console-engineer, resume-analysis-expert]
  version: 1.0.0
---

# Claude API

## Inputs → Outputs
- Inputs: Validated input, prompt version, schema.
- Outputs: Typed result or a handled stop reason, plus usage metrics.

## Purpose
Correct, safe, affordable Claude calls — server-side only.

## Use when
- Writing or reviewing any `client.messages.*` call.
- Choosing model, effort, max_tokens, caching or streaming.

## Ground rules
- Call Claude **only from Netlify Functions**. Key: `ANTHROPIC_API_KEY` env var (ADR 0003 notes it is also visible to builds on Free; never reference it in client code).
- Official SDK `@anthropic-ai/sdk`; never raw `fetch` in TypeScript code.
- Default model `claude-opus-5-5` ($4 / $20 per MTok; default effort `medium`). Model changes are the project lead's decision after an eval (skill: ai-evaluation).
- Opus 5.5: thinking is adaptive and always on; do not send `temperature`/`top_p`/`top_k`, `budget_tokens`, assistant prefill, or forced `tool_choice` (`any`/`tool` → 400). Use `tool_choice: auto` + `strict: true` tools, or structured outputs.
- API version header used in raw examples: `anthropic-version: 2026-10-21`.

## Patterns
| Need | Pattern |
|---|---|
| Extract JSON (resume, job reqs) | `client.messages.parse({ output_config: { effort: "low", format: zodOutputFormat(Schema) } })` |
| Chat (Agent Console) | `client.messages.stream(...)` + `finalMessage()`; `max_tokens` 64000 |
| Tools | `strict: true`; validate inputs with Zod before acting; return all `tool_result`s in one user message |
| Long stable prompt | `cache_control: { type: "ephemeral" }` on the last stable block; order tools → system → messages |

## Must handle
- `stop_reason`: `end_turn`, `tool_use`, `max_tokens`, `refusal` (check before reading content).
- Refusals: opt into server fallback (`betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"`); still handle a final `refusal`.
- Errors: 429 (respect `retry-after`), 529 overloaded, 5xx; SDK retries twice by default. Mid-stream `error` events (e.g. `overloaded_error`).
- Rate limits (Tier 1, Opus 5.5): 4,000 RPM, 2M ITPM, 400k OTPM; cache reads don't count toward ITPM.

## Cost controls
- Cache extraction results by content hash; never re-extract unchanged input.
- Prompt caching: reads cost 5% of input price on Opus 5.5; 5-min TTL default; min cacheable length applies.
- Batch API (50% off) for backlog extraction.
- Per-user daily token budget (skill: rate-limiting).

## Checklist
- [ ] Server-only; key never logged
- [ ] `stop_reason` handled; refusal path tested
- [ ] Output validated (Zod) before use
- [ ] Untrusted text wrapped in tags; no tools on untrusted-content calls (skill: prompt-injection-defense)
- [ ] Usage (incl. `cache_read_input_tokens`) recorded per feature

## Common mistakes
- `max_tokens` too low → truncated JSON.
- Non-streaming `create()` with a large `max_tokens` (e.g. 64000): the TypeScript SDK throws "Streaming is required for operations that may take longer than 10 minutes" before sending. Use ~16000 for `create()`/`parse()`, or `stream()` (verified 2026-11-25, `@anthropic-ai/sdk` 1.14.0; see knowledge/agent-console-engineer/examples).
- Timestamps or IDs in the system prompt → cache never hits.
- Treating a 200 response as success without checking `stop_reason`.

## Best practices
- Server-side only, official SDK
- Stream long outputs
- Structured outputs for JSON
- Byte-stable system prompts for caching
- Check stop_reason every time

## References
- https://platform.claude.com/docs/en/about-claude/models/overview
- https://platform.claude.com/docs/en/api/messages/create
- https://platform.claude.com/docs/en/build-with-claude/streaming
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- https://platform.claude.com/docs/en/api/rate-limits
