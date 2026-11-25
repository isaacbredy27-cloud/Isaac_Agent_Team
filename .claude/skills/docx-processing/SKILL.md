---
name: docx-processing
description: DOCX resume handling with mammoth — extractRawText from a buffer, external file access disabled, no HTML rendering, text-box ordering, reject legacy .doc; Claude document blocks do not accept .docx. Use when reading or troubleshooting Word resumes.
metadata:
  owner: resume-analysis-expert
  backups: [security-expert]
  version: 1.0.0
---

# DOCX Processing

## Inputs → Outputs
- Inputs: DOCX bytes (validated).
- Outputs: Plain text with paragraph breaks.

## Purpose
Turn Word resumes into clean text safely.

## Use when
- Editing `packages/resume/docx.ts`.

## mammoth
```js
import mammoth from "mammoth";
const { value: text, messages } = await mammoth.extractRawText({ buffer });
```
- `extractRawText` ignores formatting; each paragraph ends with two newlines.
- External file access is **disabled by default** — never set `externalFileAccess: true` (could read server files).
- mammoth does no sanitization; we never use `convertToHtml` output in the UI.
- Text boxes come out as a paragraph after their anchor paragraph.
- BSD-2-Clause licence.

## Rules
- Accept `.docx` only; reject `.doc` (binary).
- Check ZIP magic bytes and presence of `word/document.xml`.
- Claude `document` blocks don't accept `.docx`: always convert to text first.

## Common mistakes
- Trusting the `.docx` extension (could be any ZIP).
- Showing `messages` warnings to users (may include file internals).

## Checklist
- [ ] `.docx` only, ZIP signature and word/document.xml checked
- [ ] `extractRawText` only
- [ ] externalFileAccess left off
- [ ] Synthetic test fixture passes

## References
- https://github.com/mwilliamson/mammoth.js
- https://platform.claude.com/docs/en/build-with-claude/pdf-support
