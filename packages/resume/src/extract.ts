// Validate (magic bytes, size, pages) and extract text. Never logs or keeps content (ADR 0004).
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import { isZipSafe } from "./zip-guard.ts";

export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_PAGES = 10;
export const MAX_TEXT_CHARS = 200_000;
const PDF_TIMEOUT_MS = 8_000;

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

const cap = (t: string) => t.normalize("NFKC").slice(0, MAX_TEXT_CHARS);

async function extractPdf(bytes: Uint8Array): Promise<Extracted> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const work = (async () => {
      pdf = await getDocumentProxy(new Uint8Array(bytes), { isEvalSupported: false });
      if (pdf.numPages > MAX_PAGES) throw new ResumeError("too_many_pages");
      const { totalPages, text } = await extractText(pdf, { mergePages: false });
      const pages = Array.isArray(text) ? text : [text];
      return { text: cap(pages.join("\n")), pages: totalPages, kind: "pdf" as const };
    })();
    work.catch(() => undefined); // a late failure after the timeout must not go unhandled
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ResumeError("unreadable_file")), PDF_TIMEOUT_MS);
    });
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
    await pdf?.destroy().catch(() => undefined);
  }
}

export async function extractResumeText(input: Uint8Array): Promise<Extracted> {
  const bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  const kind = detectKind(bytes);
  try {
    if (kind === "pdf") return await extractPdf(bytes);
    if (kind === "docx") {
      if (!isZipSafe(bytes)) throw new ResumeError("unreadable_file");
      // externalFileAccess stays off (default). Warnings are dropped: they can leak internals.
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      return { text: cap(value), pages: 1, kind };
    }
    return { text: cap(new TextDecoder("utf-8").decode(bytes)), pages: 1, kind };
  } catch (e) {
    if (e instanceof ResumeError) throw e;
    throw new ResumeError("unreadable_file");
  }
}
