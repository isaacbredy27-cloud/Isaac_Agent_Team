import type { ZodType } from "zod";

export type JsonOptions = {
  /** Personal data: `private, no-store` (ADR 0004). Wins over cdnSeconds. */
  private?: boolean;
  /** Public data: cache at the Netlify CDN for N seconds (ADR 0003). */
  cdnSeconds?: number;
  /** Stale-while-revalidate window; default 6x cdnSeconds. */
  staleSeconds?: number;
  /** Netlify-Vary value, e.g. "query=q|since". Keeps CDN variants apart. */
  vary?: string;
};

export function json(data: unknown, init: ResponseInit = {}, opts: JsonOptions = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  if (opts.private || opts.cdnSeconds === undefined) {
    headers.set("Cache-Control", "private, no-store");
  } else {
    const swr = opts.staleSeconds ?? opts.cdnSeconds * 6;
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    headers.set(
      "Netlify-CDN-Cache-Control",
      `public, s-maxage=${opts.cdnSeconds}, stale-while-revalidate=${swr}`,
    );
  }
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  if (opts.vary) headers.set("Netlify-Vary", opts.vary);
  return new Response(JSON.stringify(data), { ...init, headers });
}

/**
 * Read a request body with a hard byte cap (413 `payload_too_large`).
 * Rejects early on Content-Length; otherwise counts streamed bytes. Empty body -> 400 `empty_body`.
 */
export async function readBodyLimited(
  req: Request,
  max: number,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; response: Response }> {
  const tooLarge = { ok: false as const, response: error("payload_too_large", 413) };
  const declared = req.headers.get("content-length");
  if (declared !== null) {
    const n = Number(declared);
    if (Number.isFinite(n) && n > max) return tooLarge;
  }
  if (!req.body) return { ok: false, response: error("empty_body", 400) };
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await reader.cancel().catch(() => undefined);
        return tooLarge;
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, response: error("invalid_request", 400) };
  }
  if (total === 0) return { ok: false, response: error("empty_body", 400) };
  const bytes = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    bytes.set(c, off);
    off += c.byteLength;
  }
  return { ok: true, bytes };
}

/** Safe error body: a stable code only, never internals. */
export function error(code: string, status: number, init: ResponseInit = {}): Response {
  return json({ error: code }, { ...init, status }, { private: true });
}

/** Parse and validate a JSON body. Returns data or a ready 400 `invalid_request` Response. */
export async function readJson<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: error("invalid_request", 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, response: error("invalid_request", 400) };
  return { ok: true, data: parsed.data };
}
