# Claude PDF support — notes

Source: https://platform.claude.com/docs/en/build-with-claude/pdf-support (read 2026-11-24)

- Limits: request ≤ 128 MB on the first-party API; ≤ 600 pages per request (100 when the context window is under 1M).
- Processing: "The system converts each page of the document into an image" and "extracts the text from each page and provides it alongside that page's image."
- Cost: text 1,500–3,000 tokens per page; image ≤ 1,568 visual tokens per page. No extra PDF fee.
- "All active models support PDF processing."
- Place PDFs **before** text in the request.
- "Binary formats such as .xlsx or .docx are not supported in document blocks, so convert them to text or PDF first."
