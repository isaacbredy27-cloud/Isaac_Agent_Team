import type { Config, Context } from "@netlify/functions";
import { ResumeTextRequestSchema } from "../../packages/schemas/src/index.ts";
import { MAX_BYTES, parseResume, ResumeError } from "../../packages/resume/src/index.ts";
import { error, json, readJson } from "./_lib/platform/http.ts";

// ADR 0004: never log, store or echo resume content, names or errors from parsers.
export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method !== "POST") return error("method_not_allowed", 405);
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES + 64 * 1024) return error("file_too_large", 413);
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return error("invalid_request", 400);
      if (file.size > MAX_BYTES) return error("file_too_large", 413);
      const bytes = new Uint8Array(await file.arrayBuffer());
      return json({ profile: await parseResume({ bytes }) }, {}, { private: true });
    }
    const body = await readJson(req, ResumeTextRequestSchema);
    if (!body.ok) return body.response;
    return json({ profile: await parseResume({ text: body.data.text }) }, {}, { private: true });
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
