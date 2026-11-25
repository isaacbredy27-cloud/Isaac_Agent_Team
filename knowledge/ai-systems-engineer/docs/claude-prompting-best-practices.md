# Claude prompting best practices — notes

Source: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices (read 2026-11-25)

- **Be clear and direct.** "Think of Claude as a brilliant but new employee who lacks context on your norms and workflows." Key test: would a colleague with minimal context be able to follow the prompt?
- **Add context / motivation.** Say why: "Your response will be read aloud by a text-to-speech engine, so never use ellipses" beats "NEVER use ellipses".
- **Use examples effectively.** Relevant, diverse, wrapped in example tags; "Include 3–5 examples for best results."
- **Structure prompts with XML tags** — consistent, descriptive names; nest when content is hierarchical.
- **Give Claude a role** in the system prompt.
- **Long context:** put long documents at the top, query at the end ("can improve response quality by up to 30 percent"); wrap each document with source/metadata tags; ask Claude to quote relevant parts first.
- **Balancing autonomy and safety:** ask before hard-to-reverse or shared-system actions; "do not use destructive actions as a shortcut."
- **Subagent orchestration:** recent models delegate readily; give guidance on when subagents are and aren't warranted.
- **Chain complex prompts** when you need to inspect intermediate outputs (draft → review → refine).
- **Avoid hard-coding to pass tests**; "If … any of the tests are incorrect, please inform me rather than working around them."
- **Minimize hallucinations:** "Never speculate about code you have not opened."
- **Payments, account numbers and financial records:** the docs provide a verbatim block — never copy full account/card/ID numbers unless needed; never initiate payments; say a check was done only if a tool result showed it. Relevant to our finance-domain agents.
