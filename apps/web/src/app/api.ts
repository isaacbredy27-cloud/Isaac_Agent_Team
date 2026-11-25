import {
  JobsResponseSchema,
  MatchResponseSchema,
  ResumeResponseSchema,
  type CandidateProfile,
  type JobsResponse,
  type MatchResult,
} from "@schemas";

export class ApiError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
  }
}

async function readJson(res: Response): Promise<unknown> {
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const code = body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : "generic";
    throw new ApiError(code, res.status);
  }
  return body;
}

export async function getJobs(signal?: AbortSignal): Promise<JobsResponse> {
  const init: RequestInit = signal ? { signal } : {};
  return JobsResponseSchema.parse(await readJson(await fetch("/api/jobs", init)));
}

export async function postResume(input: File | string): Promise<CandidateProfile> {
  let init: RequestInit;
  if (typeof input === "string") {
    init = { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: input }) };
  } else {
    const form = new FormData();
    form.append("file", input);
    init = { method: "POST", body: form };
  }
  return ResumeResponseSchema.parse(await readJson(await fetch("/api/resume", init))).profile;
}

export async function postMatch(profile: CandidateProfile, jobIds?: string[], signal?: AbortSignal): Promise<MatchResult[]> {
  const init: RequestInit = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(jobIds ? { profile, jobIds } : { profile }),
    ...(signal ? { signal } : {}),
  };
  return MatchResponseSchema.parse(await readJson(await fetch("/api/match", init))).results;
}
