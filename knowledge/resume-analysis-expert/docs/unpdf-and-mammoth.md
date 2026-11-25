# unpdf and mammoth — notes

Sources (read 2026-11-24): https://github.com/unjs/unpdf · https://github.com/mwilliamson/mammoth.js

## unpdf (MIT)
- "Ships with a serverless build of Mozilla's PDF.js, optimized for edge environments."
- `extractText(data, { mergePages?: boolean }): Promise<{ totalPages, text: string | string[] }>` — without `mergePages`, one string per page.
- `getDocumentProxy(data: Uint8Array | ArrayBuffer)` creates a `PDFDocumentProxy` with `useSystemFonts: true`.
- Runtimes listed: Node.js 24+, Bun, browsers, serverless (e.g. Cloudflare Workers). (Our examples ran on Node 22 in this repo; confirm on Netlify's runtime.)

## mammoth (BSD-2-Clause)
- `mammoth.extractRawText({ buffer })` → `{ value, messages }`; ignores formatting; "each paragraph followed by two newlines".
- Input: Node `{ path }` or `{ buffer }`; browser `{ arrayBuffer }`.
- "Access to any such external files is disabled by default to prevent arbitrary files on the server from being read and exfiltrated" (`externalFileAccess`). Keep it off.
- "Mammoth performs no sanitisation of the source document" — `javascript:` links possible in HTML output. We only use raw text.
- Text boxes: content becomes a separate paragraph after the paragraph containing the text box.
