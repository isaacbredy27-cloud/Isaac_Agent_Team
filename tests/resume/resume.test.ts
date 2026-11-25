// Synthetic resumes only (ADR 0004).
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import JSZip from "jszip";
import { CandidateProfileSchema } from "../../packages/schemas/src/index.ts";
import { buildProfile, detectKind, estimateYears, extractResumeText, isZipSafe, parseResume, ResumeError, MAX_BYTES } from "../../packages/resume/src/index.ts";
import handler, { config } from "../../netlify/functions/resume.ts";

const ASOF = new Date(Date.UTC(2026, 10, 15));
const TEXT = [
  "Jordan Example", "EXPERIENCE",
  "Senior Financial Analyst, Example Resorts  Jan 2022 - Present",
  "- Built forecast in Excel; monthly variance analysis; FP&A reporting",
  "Staff Accountant, Example Bank  Jun 2019 - Mar 2022",
  "EDUCATION", "B.S. Finance, University of Central Florida, 2015 - 2019",
  "CERTIFICATIONS", "Certified Public Accountant (CPA)", "SKILLS", "SQL, Excel",
].join("\n");
const enc = (s: string) => new TextEncoder().encode(s);

async function makeDocx(text: string): Promise<Uint8Array> {
  const z = new JSZip();
  z.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  z.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  const paras = text.split("\n").map((l) => `<w:p><w:r><w:t>${l.replace(/&/g, "&amp;")}</w:t></w:r></w:p>`).join("");
  z.file("word/document.xml", `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras}</w:body></w:document>`);
  return z.generateAsync({ type: "uint8array" });
}

describe("estimateYears", () => {
  it("merges overlaps and skips education ranges", () => {
    // Jun 2019 .. Nov 2026 inclusive = 90 months = 7.5 years
    expect(estimateYears(TEXT, ASOF)).toBe(7.5);
  });
  it("handles numeric dates and year-only ranges", () => {
    expect(estimateYears("Analyst 01/2020 - 12/2020", ASOF)).toBe(1);
    expect(estimateYears("Analyst 2018 – 2019", ASOF)).toBe(2);
  });
  it("falls back to 'X years'", () => {
    expect(estimateYears("Finance pro with 8+ years of experience", ASOF)).toBe(8);
    expect(estimateYears("no dates here", ASOF)).toBe(0);
  });
});

describe("parseResume", () => {
  it("builds a schema-valid profile from text", async () => {
    const p = await parseResume({ text: TEXT }, { asOf: ASOF });
    expect(CandidateProfileSchema.safeParse(p).success).toBe(true);
    expect(p.skills).toEqual(expect.arrayContaining(["excel", "sql", "variance_analysis", "fpa"]));
    expect(p.titles).toEqual(expect.arrayContaining(["senior_financial_analyst", "staff_accountant"]));
    expect(p.certifications).toContain("cpa");
    expect(p.education).toContain("bachelors");
    expect(p.yearsExperience).toBe(7.5);
  });
  it("uses word boundaries", () => {
    const tax = { skills: [{ id: "r", label: "R", aliases: [] }, { id: "sql", label: "SQL", aliases: [] }], titles: [], certifications: [], education: [] };
    expect(buildProfile("mysql and research", tax, ASOF).skills).toEqual([]);
    expect(buildProfile("Used SQL, R.", tax, ASOF).skills).toEqual(["r", "sql"]);
  });
  it("parses a DOCX built in-test", async () => {
    const bytes = await makeDocx(TEXT);
    expect((await extractResumeText(bytes)).kind).toBe("docx");
    const p = await parseResume({ bytes }, { asOf: ASOF });
    expect(p.certifications).toContain("cpa");
    expect(p.skills).toContain("excel");
  });
});

describe("validation", () => {
  it("rejects bad input by content, not name", async () => {
    const code = (b: Uint8Array) => { try { detectKind(b); return "ok"; } catch (e) { return (e as ResumeError).code; } };
    expect(code(new Uint8Array(0))).toBe("empty_file");
    expect(code(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0]))).toBe("legacy_doc_unsupported");
    expect(code(new Uint8Array(MAX_BYTES + 1).fill(65))).toBe("file_too_large");
    expect(code(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]))).toBe("unsupported_type");
    expect(code(new Uint8Array([0xff, 0xfe, 0, 1]))).toBe("unsupported_type");
    expect(code(enc("%PDF-1.4"))).toBe("ok");
    expect(code(enc("plain"))).toBe("ok");
  });
  it("reports a corrupt PDF as unreadable", async () => {
    await expect(extractResumeText(enc("%PDF-1.4 garbage"))).rejects.toMatchObject({ code: "unreadable_file" });
  });
});

describe("POST /api/resume", () => {
  const ctx = {} as never;
  it("is configured with path and rate limit", () => {
    expect(config.path).toBe("/api/resume");
    expect((config.rateLimit as { windowLimit: number }).windowLimit).toBe(5);
  });
  it("accepts JSON text with no-store", async () => {
    const res = await handler(new Request("http://x/api/resume", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: TEXT }) }), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(CandidateProfileSchema.safeParse((await res.json()).profile).success).toBe(true);
  });
  it("accepts a multipart DOCX", async () => {
    const fd = new FormData();
    fd.set("file", new File([Buffer.from(await makeDocx(TEXT))], "ignored.docx"));
    const res = await handler(new Request("http://x/api/resume", { method: "POST", body: fd }), ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).profile.certifications).toContain("cpa");
  });
  it("returns stable error codes", async () => {
    const fd = new FormData();
    fd.set("file", new File([new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])], "a.doc"));
    const r1 = await handler(new Request("http://x/api/resume", { method: "POST", body: fd }), ctx);
    expect(r1.status).toBe(400);
    expect(await r1.json()).toEqual({ error: "legacy_doc_unsupported" });
    const r2 = await handler(new Request("http://x/api/resume", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), ctx);
    expect(r2.status).toBe(400);
    const r3 = await handler(new Request("http://x/api/resume", { method: "GET" }), ctx);
    expect(r3.status).toBe(405);
  });
  it("rejects a streamed oversize body with 413", async () => {
    const chunk = new Uint8Array(1024 * 1024).fill(65);
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(c) { if (sent++ < 7) c.enqueue(chunk); else c.close(); },
    });
    const req = new Request("http://x/api/resume", { method: "POST", headers: { "content-type": "application/json" }, body: stream, duplex: "half" } as RequestInit);
    const res = await handler(req, ctx);
    expect(res.status).toBe(413);
  });
  it("rejects wrong content types with 415", async () => {
    for (const ct of ["text/plain", "application/x-www-form-urlencoded", ""]) {
      const headers: Record<string, string> = ct ? { "content-type": ct } : {};
      const res = await handler(new Request("http://x/api/resume", { method: "POST", headers, body: "{}" }), ctx);
      expect(res.status).toBe(415);
      expect(await res.json()).toEqual({ error: "unsupported_media_type" });
    }
  });
});

describe("zip bomb guard", () => {
  it("rejects a high-ratio DOCX as unreadable", async () => {
    const z = new JSZip();
    z.file("word/document.xml", "A".repeat(5 * 1024 * 1024));
    const bytes = await z.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 9 } });
    expect(bytes.length).toBeLessThan(MAX_BYTES);
    await expect(extractResumeText(bytes)).rejects.toMatchObject({ code: "unreadable_file" });
  });
  it("rejects too many entries and accepts a normal DOCX", async () => {
    const z = new JSZip();
    z.file("word/document.xml", "<w:document/>");
    for (let i = 0; i < 501; i++) z.file(`f${i}.txt`, `file ${i} ${Math.random()}`);
    await expect(extractResumeText(await z.generateAsync({ type: "uint8array" }))).rejects.toMatchObject({ code: "unreadable_file" });
    expect(isZipSafe(await makeDocx(TEXT))).toBe(true);
    expect(isZipSafe(enc("PK\x03\x04 not a zip"))).toBe(false);
  });
});

describe("real PDF", () => {
  const fx = new URL("../../knowledge/resume-analysis-expert/examples/fixtures/synthetic-resume.pdf", import.meta.url);
  it.skipIf(!existsSync(fx))("extracts the synthetic PDF", async () => {
    const out = await extractResumeText(new Uint8Array(readFileSync(fx)));
    expect(out.kind).toBe("pdf");
    expect(out.text).toMatch(/Senior Financial Analyst/);
    const p = await parseResume({ bytes: new Uint8Array(readFileSync(fx)) }, { asOf: ASOF });
    expect(p.titles).toContain("senior_financial_analyst");
  });
});
