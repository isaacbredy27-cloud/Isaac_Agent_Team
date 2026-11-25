import type { Config, Context } from "@netlify/functions";
import { ResumeTextRequestSchema } from "../../packages/schemas/src/index.ts";
import { MAX_BYTES, parseResume, ResumeError } from "../../packages/resume/src/index.ts";
import { error, json, readBodyLimited } from "./_lib/platform/http.ts";

// ADR 0004: never log, store or echo resume content, names or errors from parsers.
export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method !== "POST") return error("method_not_allowed", 405);
  const type = req.headers.get("content-type") ?? "";
  const isMultipart = /^multipart\/form-data\b/i.test(type);
  const isJson = /^application\/json\b/i.test(type);
  if (!isMultipart && !isJson) return error("unsupported_media_type", 415);
  const body = await readBodyLimited(req, MAX_BYTES + 64 * 1024);
  if (!body.ok) return body.response;
  try {
    if (isMultipart) {
      const form = await new Request(req.url, { method: "POST", headers: { "content-type": type }, body: body.bytes as BodyInit }).formData();
      const file = form.get("file");
      if (!(file instanceof File)) return error("invalid_request", 400);
      if (file.size > MAX_BYTES) return error("file_too_large", 413);
      const bytes = new Uint8Array(await file.arrayBuffer());
      return json({ profile: await parseResume({ bytes }) }, {}, { private: true });
    }
    let raw: unknown;
    try {
      raw = JSON.parse(new TextDecoder().decode(body.bytes));
    } catch {
      return error("invalid_request", 400);
    }
    const parsed = ResumeTextRequestSchema.safeParse(raw);
    if (!parsed.success) return error("invalid_request", 400);
    return json({ profile: await parseResume({ text: parsed.data.text }) }, {}, { private: true });
  } catch (e) {
    if (e instanceof ResumeError) {
      const status = e.code === "file_too_large" ? 413 : e.code === "unreadable_file" ? 422 : 400;
      return error(e.code, status);
    }
    return error("resume_unavailable", 500);
  }
};

export const config: Config = {
  path: "/api/resume",
  method: "POST",
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
