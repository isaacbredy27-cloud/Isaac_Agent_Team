// Validate (magic bytes, size, pages) and extract text. Never logs or keeps content (ADR 0004).
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_PAGES = 10;

export type ResumeErrorCode =
  | "file_too_large"
  | "empty_file"
  | "unsupported_type"
  | "legacy_doc_unsupported"
  | "too_many_pages"
  | "unreadable_file";

/** Message is the stable code only, never file content or names. */
export class ResumeError extends Error {
  constructor(public readonly code: ResumeErrorCode) {
    super(code);
    this.name = "ResumeError";
  }
}

export type FileKind = "pdf" | "docx" | "txt";
export type Extracted = { text: string; pages: number; kind: FileKind };

const startsWith = (b: Uint8Array, sig: number[]) => sig.every((v, i) => b[i] === v);
const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

function containsBytes(hay: Uint8Array, needle: number[]): boolean {
  outer: for (let i = 0; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

/** Decide the type from content only; the client's name and Content-Type are never trusted. */
export function detectKind(bytes: Uint8Array): FileKind {
  if (bytes.length === 0) throw new ResumeError("empty_file");
  if (bytes.length > MAX_BYTES) throw new ResumeError("file_too_large");
  if (startsWith(bytes, ascii("%PDF-"))) return "pdf";
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    throw new ResumeError("legacy_doc_unsupported");
  }
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    // ZIP entry names are stored uncompressed in local and central headers.
    if (containsBytes(bytes, ascii("word/document.xml"))) return "docx";
    throw new ResumeError("unsupported_type");
  }
  // Plain text: no NUL bytes and valid UTF-8.
  if (bytes.includes(0)) throw new ResumeError("unsupported_type");
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ResumeError("unsupported_type");
  }
  return "txt";
}

export async function extractResumeText(input: Uint8Array): Promise<Extracted> {
  const bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  const kind = detectKind(bytes);
  try {
    if (kind === "pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      if (pdf.numPages > MAX_PAGES) throw new ResumeError("too_many_pages");
      const { totalPages, text } = await extractText(pdf, { mergePages: false });
      const pages = Array.isArray(text) ? text : [text];
      return { text: pages.join("\n").normalize("NFKC"), pages: totalPages, kind };
    }
    if (kind === "docx") {
      // externalFileAccess stays off (default). Warnings are dropped: they can leak internals.
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      return { text: value.normalize("NFKC"), pages: 1, kind };
    }
    const text = new TextDecoder("utf-8").decode(bytes).normalize("NFKC");
    return { text, pages: 1, kind };
  } catch (e) {
    if (e instanceof ResumeError) throw e;
    throw new ResumeError("unreadable_file");
  }
}
