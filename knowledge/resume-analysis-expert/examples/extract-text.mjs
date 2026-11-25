// Worked example: extract text from SYNTHETIC PDF and DOCX resumes with the real libraries (unpdf, mammoth),
// then NFKC-normalize and decide whether the PDF needs the Claude PDF fallback. Run: node extract-text.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

const fx = (f) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url));

const pdf = await getDocumentProxy(new Uint8Array(fx("synthetic-resume.pdf")));
const { totalPages, text: pages } = await extractText(pdf);              // per-page strings
const pdfText = pages.join("\n").normalize("NFKC");
const charsPerPage = pdfText.length / totalPages;
const needsClaudePdfFallback = charsPerPage < 200;                         // scanned/garbled heuristic

const { value: docxText } = await mammoth.extractRawText({ buffer: fx("synthetic-resume.docx") }); // external file access stays OFF

for (const t of [pdfText, docxText]) {
  assert.match(t, /Senior Financial Analyst/);
  assert.match(t, /CFA Level II Candidate/);
  assert.match(t, /University of Central Florida/);
}
assert.equal(needsClaudePdfFallback, false);
console.log(`PDF: ${totalPages} page, ${Math.round(charsPerPage)} chars/page → fallback=${needsClaudePdfFallback}`);
console.log(`DOCX: ${docxText.split(/\n\n/).length} paragraphs`);
console.log("OK: unpdf and mammoth extracted the same key facts from synthetic PDF and DOCX");
