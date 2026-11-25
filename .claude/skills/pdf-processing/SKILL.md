---
name: pdf-processing
description: PDF handling for resumes — unpdf (serverless PDF.js) text extraction, page limits, detecting scanned or multi-column PDFs, Claude PDF document blocks (≤ 600 pages, 1,500–3,000 text tokens + ≤ 1,568 image tokens per page). Use when reading or troubleshooting PDF resumes.
metadata:
  owner: resume-analysis-expert
  backups: [ai-systems-engineer, security-expert]
  version: 1.0.0
---

# PDF Processing

## Inputs → Outputs
- Inputs: PDF bytes (validated).
- Outputs: Text per page, or a Claude PDF document block.

## Purpose
Get reliable text from PDFs cheaply; fall back to Claude's PDF reading when needed.

## Use when
- Editing `packages/resume/pdf.ts` or debugging a bad parse.

## unpdf
```ts
import { extractText, getDocumentProxy } from "unpdf";
const pdf = await getDocumentProxy(new Uint8Array(bytes));
const { totalPages, text } = await extractText(pdf, { mergePages: true });
```
- MIT licence; serverless PDF.js build. README lists Node.js 24+ (confirm Netlify runtime; pin version otherwise).
- Without `mergePages`, `text` is one string per page → use it to measure chars/page.

## Fallback to Claude PDF
- Send `{ type: "document", source: { type: "base64", media_type: "application/pdf", data } }` before the text instruction.
- Each page: text + page image. Costs 1,500–3,000 text tokens + ≤ 1,568 image tokens per page.
- Limits: 600 pages (100 if context < 1M); request ≤ 128 MB on the Claude API (our cap: 5 MB, 10 pages).

## Heuristics
| Signal | Action |
|---|---|
| < 200 chars/page | Scanned → Claude PDF |
| > 30% lines under 25 chars, alternating | Multi-column → Claude PDF |
| Encrypted / parse error | Reject with friendly message |

## Common mistakes
- Passing a Node `Buffer` where `Uint8Array` is expected in some runtimes.
- Rendering PDFs to images ourselves (unnecessary; Claude does it).

## Best practices
- Measure chars per page before trusting text
- Fallback only when needed (cost)
- Keep the 10-page cap

## Checklist
- [ ] Synthetic fixtures pass
- [ ] Fallback heuristic tested
- [ ] Encrypted PDFs rejected politely

## References
- https://github.com/unjs/unpdf
- https://platform.claude.com/docs/en/build-with-claude/pdf-support
