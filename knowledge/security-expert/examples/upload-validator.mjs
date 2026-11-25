// Worked example: resume upload validation per OWASP File Upload cheat sheet + ADR 0004.
// Extension allow-list after decoding, magic bytes, size cap, server-generated name. Run: node upload-validator.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const MAX = 5 * 1024 * 1024;
export function validateUpload(name, bytes) {
  let decoded; try { decoded = decodeURIComponent(name); } catch { return { ok: false, reason: "bad filename" }; }
  if (/[\0:\\/]/.test(decoded)) return { ok: false, reason: "bad filename" };
  const ext = decoded.toLowerCase().split(".").pop();
  if ((decoded.match(/\./g) ?? []).length !== 1 || !["pdf", "docx"].includes(ext)) return { ok: false, reason: "only .pdf or .docx" };
  if (bytes.length === 0 || bytes.length > MAX) return { ok: false, reason: "size must be 1 byte–5 MB" };
  const head = bytes.subarray(0, 5).toString("latin1");
  if (ext === "pdf" && head !== "%PDF-") return { ok: false, reason: "not a PDF" };
  if (ext === "docx" && !(bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04 && bytes.includes(Buffer.from("word/document.xml")))) return { ok: false, reason: "not a DOCX" };
  return { ok: true, kind: ext, storedName: randomUUID() };   // never reuse the user's file name
}

const pdf = Buffer.from("%PDF-1.7\n…synthetic…");
const fakeDocx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("…word/document.xml…")]);
assert.equal(validateUpload("resume.pdf", pdf).ok, true);
assert.equal(validateUpload("resume.docx", fakeDocx).ok, true);
for (const [n, b] of [["resume.pdf.exe", pdf], ["resume.php%00.pdf", pdf], ["resume.PDF", Buffer.from("MZ…")], ["evil.docx", Buffer.from("PK\x03\x04 no doc")], ["a:b.pdf", pdf], ["big.pdf", Buffer.alloc(MAX + 1, 0x25)], ["resume.doc", pdf]])
  assert.equal(validateUpload(n, b).ok, false, n);
console.log("OK: 2 valid uploads accepted; 7 attacks rejected (double ext, null byte, spoofed type, bad zip, NTFS stream, oversize, legacy .doc)");
