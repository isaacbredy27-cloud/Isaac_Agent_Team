# Claude Code delegation model — notes for the orchestrator

Source: https://code.claude.com/docs/en/sub-agents (read 2026-11-25)

- "Each subagent runs in its own context window with a custom system prompt, specific tool access, and independent permissions." Results return to the conversation that started it.
- A non-fork subagent starts fresh: system prompt + **the delegation message Claude writes** + CLAUDE.md + git status + preloaded skills. "It doesn't see your conversation history" → every brief must stand alone.
- Run the whole session as the orchestrator: `claude --agent orchestrator` (or `"agent": "orchestrator"` in `.claude/settings.json`). As the main thread, `tools: Agent(a, b, …)` is an **allowlist** of spawnable agents. "If you omit Agent from the tools list entirely, the agent can't spawn any subagents" — that is how specialists are kept from contacting each other.
- Patterns from the docs:
  - **Isolate high-volume operations** (test runs, log reading) — only the summary returns.
  - **Run parallel research** — "spawn multiple subagents to work simultaneously … then Claude synthesizes the findings."
  - **Chain subagents** — "Each subagent completes its task and returns results to Claude, which then passes relevant context to the next subagent."
- Use the main conversation instead when the task needs back-and-forth, shares lots of context across phases, is a quick targeted change, or latency matters.
- Limits: nesting up to three layers by default (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`); 20 concurrent subagents by default (`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`).
- Descriptions drive automatic delegation; "use proactively" encourages it. Combined descriptions over 15,000 tokens trigger a startup warning.

Source: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices — "Use subagents when tasks can run in parallel, require isolated context, or involve independent workstreams that don't need to share state. For simple tasks, sequential operations, single-file edits … work directly rather than delegating."
