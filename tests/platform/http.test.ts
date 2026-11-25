import { describe, expect, it } from "vitest";
import { error, json, readBodyLimited } from "../../netlify/functions/_lib/platform/http";

function streamReq(chunks: Uint8Array[]): Request {
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (const ch of chunks) c.enqueue(ch);
      c.close();
    },
  });
  return new Request("https://x.test/up", {
    method: "POST",
    body: stream,
    duplex: "half",
  } as RequestInit);
}

describe("readBodyLimited", () => {
  it("returns bytes under the limit", async () => {
    const r = await readBodyLimited(streamReq([new Uint8Array([1, 2]), new Uint8Array([3])]), 10);
    expect(r.ok).toBe(true);
    if (r.ok) expect(Array.from(r.bytes)).toEqual([1, 2, 3]);
  });

  it("rejects an over-limit stream with 413", async () => {
    const r = await readBodyLimited(streamReq([new Uint8Array(6), new Uint8Array(6)]), 10);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(413);
      expect(await r.response.json()).toEqual({ error: "payload_too_large" });
    }
  });

  it("rejects early on Content-Length", async () => {
    const req = new Request("https://x.test/up", {
      method: "POST",
      body: new Uint8Array(20),
      headers: { "content-length": "20" },
    });
    const r = await readBodyLimited(req, 10);
    expect(!r.ok && r.response.status).toBe(413);
  });

  it("rejects empty and missing bodies with 400", async () => {
    const empty = await readBodyLimited(streamReq([]), 10);
    expect(!empty.ok && empty.response.status).toBe(400);
    const none = await readBodyLimited(new Request("https://x.test/up", { method: "POST" }), 10);
    expect(!none.ok && none.response.status).toBe(400);
    if (!none.ok) expect(await none.response.json()).toEqual({ error: "empty_body" });
  });
});

describe("json headers", () => {
  it("sets hardening headers and Netlify-Vary", () => {
    const r = json({ a: 1 }, {}, { cdnSeconds: 60, vary: "query=q|since" });
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("content-security-policy")).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(r.headers.get("netlify-vary")).toBe("query=q|since");
    expect(error("x", 400).headers.get("x-content-type-options")).toBe("nosniff");
  });
});
