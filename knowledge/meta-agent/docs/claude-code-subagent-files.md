# Claude Code subagent files — notes

Source: https://code.claude.com/docs/en/sub-agents (read 2026-11-25)

- Project scope: `.claude/agents/` (priority 3, after managed settings and `--agents`). "Check them into version control." Claude Code watches the folder; edits apply within seconds.
- Format: YAML frontmatter, then Markdown body = the system prompt. Subagents get this prompt plus environment details, **not** the Claude Code system prompt.
- "Only `name` and `description` are required." Field names are camelCase and must match exactly — **"Claude Code ignores a field it doesn't recognize without reporting an error"** (find typos with `claude --debug`: "does not recognize or apply").
- Fields: `name`, `description`, `tools`, `disallowedTools`, `model` (`sonnet`, `opus`, `haiku`, `fable`, full ID, or `inherit`), `permissionMode`, `maxTurns`, `autoCompactWindow`, `skills`, `mcpServers`, `hooks`, `memory` (`user`/`project`/`local`), `background`, `omitClaudeMd`, `effort`, `isolation` (`worktree`), `color`, `initialPrompt`, `experimental`.
- Files skipped: no `name` (treated as documentation — e.g. a README), opening `---` not on line 1, `name` with `:` or starting with `-`, `name` without `description`, unparsable YAML. Validate with `claude plugin validate .claude/agents`.
- `skills`: "The full content of each listed skill is injected into the subagent's context at startup, up to the first 32." Skills with `disable-model-invocation: true` can't be preloaded. Without the field, subagents can still invoke skills via the Skill tool.
- `memory` auto-enables Read, Write and Edit — don't add it to read-only reviewers.
- Keep descriptions short: combined descriptions over 15,000 tokens trigger a startup warning; put detail in the body.
- Tools filter: `Agent` is the spawn tool; omit it to stop a subagent spawning others. `Agent(type, …)` allowlists apply only when running as the main thread (`--agent`).
