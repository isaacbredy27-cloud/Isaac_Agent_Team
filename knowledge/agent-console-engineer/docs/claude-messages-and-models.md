# Claude Messages API and models — notes

Sources (read 2026-11-25): https://platform.claude.com/docs/en/about-claude/models/overview · https://platform.claude.com/docs/en/api/messages/create · https://platform.claude.com/docs/en/api/rate-limits

## Request basics
- `POST https://api.anthropic.com/v1/messages`
- Headers: `x-api-key`, `anthropic-version` (docs examples use `2026-10-21`), `content-type: application/json`. The SDK sets these.
- Required body: `model`, `max_tokens`, `messages`. Common: `system`, `tools`, `tool_choice`, `stream`, `output_config` (`effort`, `format`), `thinking`.
- Check `stop_reason` before reading content: `end_turn`, `tool_use`, `max_tokens`, `refusal`, `pause_turn`.

## Models (current lineup)
| Model | API ID | Price in/out per MTok | Default effort | Context / max out |
|---|---|---|---|---|
| Claude Fable 5.2 | `claude-fable-5-2` | $8 / $40 | high | 1M / 128K |
| Claude Opus 5.5 | `claude-opus-5-5` | $4 / $20 | medium | 1M / 128K |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | $2 / $10 | high | 1M / 128K |
| Claude Haiku 5.5 | `claude-haiku-5-5` | from $0.10 / $0.50 | medium | 1M / 128K |

"If you're unsure which model to use, start with Claude Opus 5.5 for most workloads." Project default: `claude-opus-5-5`.
Batch API is 50% off; cache reads cost 5% of base input on Opus 5.5 and Sonnet 5.5.

## Rate limits (Tier 1, Opus 5.5)
4,000 RPM · 2,000,000 ITPM · 400,000 OTPM. Token bucket (continuous refill). `cache_read_input_tokens` do **not** count toward ITPM. On 429, wait `retry-after` seconds. Headers: `anthropic-ratelimit-{requests,tokens,input-tokens,output-tokens}-{limit,remaining,reset}`.

## Opus 5.5 specifics (project skill `claude-api`)
- Thinking is adaptive and always on; don't send `budget_tokens`, sampling params or assistant prefill.
- Forced `tool_choice` `any`/`tool` returns 400; use `auto` with `strict: true` tools.
