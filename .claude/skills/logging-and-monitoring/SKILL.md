---
name: logging-and-monitoring
description: Structured operational logging for Netlify Functions — JSON log lines, request IDs, levels, redaction rules, persisting key events to Blobs because Free-plan logs last 24 hours. Use when writing any console.log in a function or reviewing logs for PII.
metadata:
  owner: netlify-engineer
  backups: [qa-engineer, security-expert]
  version: 1.0.0
---

# Logging and Monitoring

## Inputs → Outputs
- Inputs: Events from functions and workers.
- Outputs: Redacted JSON log lines; persisted warn/error events.

## Purpose
Logs that help debugging without leaking personal data.

## Use when
- Adding logging to a function or worker.
- Investigating an error.

## Log line shape
```json
{"ts":"2026-11-25T14:03:11Z","level":"error","event":"resume.parse_failed","requestId":"01J...","userHash":"u_3f9a…","code":"PDF_NO_TEXT","durationMs":812}
```

## Rules
- JSON, one line, fixed `event` names (`area.action_outcome`).
- Never log: resume text, file names, emails, phone numbers, tokens, prompts, Claude outputs, raw job-board HTML (ADR 0004).
- Hash user IDs (`sha256(userId + LOG_SALT)` truncated).
- Levels: `debug` (local only), `info`, `warn`, `error`.
- Persist `warn`/`error` and security events to Blobs `audit`/`errors` store (Free plan keeps function logs 24 h).
- Security-relevant events go through the audit log (skill: audit-logging), not here.

## Checklist
- [ ] Redaction helper used
- [ ] Request ID present
- [ ] Error has a stable `code`
- [ ] Test asserts no PII in log output

## Common mistakes
- `console.log(err)` on a Claude or GitHub error object that contains headers or request bodies.
- Logging whole `req` objects.

## References
- https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- ADR 0003, ADR 0004
