# Prompt caching, structured outputs, models and rate limits — notes

Sources (read 2026-11-24/25): https://platform.claude.com/docs/en/build-with-claude/prompt-caching · https://platform.claude.com/docs/en/build-with-claude/structured-outputs · https://platform.claude.com/docs/en/about-claude/models/overview · https://platform.claude.com/docs/en/api/rate-limits

## Prompt caching
- Prefix covers `tools` → `system` → `messages`, up to and including the block with `cache_control`.
- Default lifetime 5 minutes, refreshed on use; `"ttl": "1h"` available. Lifetime counts from request start.
- Up to 4 breakpoints. Lookback window of 20 blocks per breakpoint.
- Pricing: 5-min write 1.25× base input; 1-hour write 2×; reads 0.1× — **5% on Claude Opus 5.5 and Sonnet 5.5**.
- Minimum cacheable length applies; if `cache_creation_input_tokens` and `cache_read_input_tokens` are both 0, nothing was cached.
- Invalidation: any change at a level invalidates it and everything after; changing effort can invalidate. Put timestamps/IDs after the last breakpoint. Mid-conversation `{"role":"system"}` messages keep the cache on Opus 5.5.
- Cache hits are not deducted from rate limits.

## Structured outputs
- Guarantees: "Always valid … Type safe … Reliable" via constrained decoding. Request: `output_config: { format: { type: "json_schema", schema } }`. TS: `client.messages.parse({ output_config: { format: zodOutputFormat(Schema) } })` → `parsed_output`.
- Every object needs `additionalProperties: false`; use `z.object()` not `z.record()` for known keys.
- Limits per request: ≤ 20 strict tools; ≤ 24 optional parameters; ≤ 16 union-typed parameters; "Schema is too complex for compilation" 400 beyond internal limits.
- Still check `stop_reason`: `refusal` (200, billed, may not match schema) and `max_tokens` (incomplete).
- Incompatible with citations and with prefill.
- Schemas are cached up to 24 h: keep personal data out of schema text.

## Models and limits
- Default: `claude-opus-5-5` ($4/$20 per MTok, default effort `medium`, 1M context, 128K output). Haiku 5.5 from $0.10/$0.50; Sonnet 5.5 $2/$10. Batch API 50% off.
- Tier 1 Opus 5.5: 4,000 RPM, 2,000,000 ITPM, 400,000 OTPM; token bucket; 429 with `retry-after`.
