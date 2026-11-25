# Claude Code skills — notes

Source: https://code.claude.com/docs/en/skills (read 2026-11-25)

- "Create a skill when you keep pasting the same instructions, checklist, or multi-step procedure into chat, or when a section of CLAUDE.md has grown into a procedure rather than a fact." A skill's body loads only when used.
- Project skills: `.claude/skills/<skill-name>/SKILL.md`; the folder name (or frontmatter `name`) is the `/command`.
- Frontmatter (all optional; `description` recommended): `name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `model`, `effort`, `context: fork`, `agent`, `background`, `hooks`, `paths`, `shell`, `metadata` (free-form map for our own data), `license`, `compatibility`. Unknown fields are ignored silently.
- `description` + `when_to_use` are truncated at **1,536 characters** in the skill listing — put the key use case first.
- Content types: **reference** (conventions, domain knowledge) and **task** (step-by-step actions; often `disable-model-invocation: true`).
- "Keep SKILL.md under 500 lines. Move detailed reference material to separate files" and link them.
- Invocation control: default = both user and Claude; `disable-model-invocation: true` = user only (and can't be preloaded into subagents); `user-invocable: false` = Claude only.
- After compaction only the start of an invoked skill may be kept — put the most important instructions near the top.
- Rules that must hold every time belong in hooks, not skills.
