# Claude streaming and tool use — notes

Sources (read 2026-11-25): https://platform.claude.com/docs/en/build-with-claude/streaming · https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview

## Streaming event flow
1. `message_start` — a Message with empty `content`.
2. Per content block: `content_block_start`, any number of `content_block_delta` (`text_delta`, `input_json_delta`, `thinking_delta`), `content_block_stop`. Each block's `index` matches its position in the final `content`.
3. One or more `message_delta` (top-level changes, e.g. `stop_reason`, usage).
4. `message_stop`.
- `ping` events can appear any time.
- Errors can arrive mid-stream: `event: error` `data: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}` (≈ HTTP 529).
- SDK: `client.messages.stream(params)`; `stream.on("text", …)`; `await stream.finalMessage()`.

## Client tool loop
- Define tools with `name`, `description`, `input_schema` (JSON Schema); add `strict: true` to guarantee schema conformance.
- Claude replies `stop_reason: "tool_use"` with `tool_use` blocks `{ id, name, input }`.
- Your code runs the tool and sends a user message with `{ type: "tool_result", tool_use_id, content }` (`is_error: true` on failure).
- Parallel tool calls: return **all** `tool_result` blocks in **one** user message.
- `tool_choice: { type: "auto", disable_parallel_tool_use: true }` limits to one call per turn.
- Parse tool inputs as JSON objects; never string-match serialized input.
