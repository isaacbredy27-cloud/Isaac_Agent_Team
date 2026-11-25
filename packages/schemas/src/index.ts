// Shared Zod contracts for Finance Match Orlando (contract v1).
// Source of truth: docs/plans/app-build.md "Contracts". Breaking change = new version + ADR.
// This module must not import anything app-specific (skill system-architecture).
import { z } from "zod";

export const SCHEMA_VERSION = 1 as const;

const isoDate = z.iso.datetime({ offset: true });
const nonEmpty = z.string().trim().min(1);

// ---------- Jobs ----------
export const JobSchema = z.object({
  id: nonEmpty,
  title: nonEmpty,
  company: nonEmpty,
  location: z.string(),
  remote: z.boolean(),
  postedAt: isoDate,
  url: z.url(),
  source: nonEmpty,
  description: z.string(),
  skills: z.array(nonEmpty),
});
export type Job = z.infer<typeof JobSchema>;

// ---------- Candidate profile (browser-only; ADR 0004) ----------
export const CandidateProfileSchema = z.object({
  skills: z.array(nonEmpty),
  titles: z.array(nonEmpty),
  certifications: z.array(nonEmpty),
  yearsExperience: z.number().min(0).max(70),
  education: z.array(nonEmpty),
});
export type CandidateProfile = z.infer<typeof CandidateProfileSchema>;

// ---------- Match result ----------
export const MatchBandSchema = z.enum(["Strong", "Moderate", "Weak"]);
export type MatchBand = z.infer<typeof MatchBandSchema>;

/** Strong >= 80, Moderate 60-79, Weak < 60. */
export function bandFor(score: number): MatchBand {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Moderate";
  return "Weak";
}

export const SkillGapSchema = z.object({
  skill: nonEmpty,
  importance: z.enum(["required", "preferred"]),
});
export type SkillGap = z.infer<typeof SkillGapSchema>;

export const RecommendationSchema = z.object({
  action: z.enum(["apply", "tailor", "stretch", "skip"]),
  text: z.string(),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const MatchResultSchema = z
  .object({
    jobId: nonEmpty,
    score: z.number().min(0).max(100),
    band: MatchBandSchema,
    evidence: z.array(z.string()),
    gaps: z.array(SkillGapSchema),
    explanation: z.string(),
    recommendation: RecommendationSchema,
  })
  .refine((r) => r.band === bandFor(r.score), {
    message: "band does not match score",
    path: ["band"],
  });
export type MatchResult = z.infer<typeof MatchResultSchema>;

// ---------- Agents ----------
export const AgentSummarySchema = z.object({
  name: nonEmpty,
  description: z.string(),
  model: nonEmpty,
  personality: z.string(),
  group: z.string(),
  knowledge: z.object({
    docs: z.array(z.string()),
    examples: z.array(z.string()),
  }),
});
export type AgentSummary = z.infer<typeof AgentSummarySchema>;

// ---------- Proposals (ADR 0002) ----------
export const ProposalStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "committed",
  "failed",
  "stale",
]);
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

export const ProposalFileSchema = z
  .object({
    path: nonEmpty,
    action: z.enum(["create", "update", "delete"]),
    before: z.string().optional(),
    after: z.string().optional(),
  })
  .refine((f) => f.action === "delete" || f.after !== undefined, {
    message: "after is required unless action is delete",
    path: ["after"],
  });
export type ProposalFile = z.infer<typeof ProposalFileSchema>;

export const ProposalSchema = z.object({
  id: nonEmpty,
  agent: nonEmpty,
  title: nonEmpty,
  rationale: z.string(),
  files: z.array(ProposalFileSchema).min(1),
  diff: z.string(),
  baseSha: z.string().regex(/^[0-9a-f]{40}$/),
  status: ProposalStatusSchema,
  requestedBy: nonEmpty,
  reviewer: nonEmpty.optional(),
  commitSha: z.string().regex(/^[0-9a-f]{40}$/).optional(),
  createdAt: isoDate,
});
export type Proposal = z.infer<typeof ProposalSchema>;

// ---------- API envelopes ----------
export const JobsQuerySchema = z.object({
  q: z.string().max(200).optional(),
  since: isoDate.optional(),
});
export type JobsQuery = z.infer<typeof JobsQuerySchema>;

export const JobsResponseSchema = z.object({
  jobs: z.array(JobSchema),
  source: z.enum(["seed", "mixed"]),
  fetchedAt: isoDate,
});
export type JobsResponse = z.infer<typeof JobsResponseSchema>;

/** JSON body variant of POST /api/resume (multipart `file` is validated in the function). */
export const ResumeTextRequestSchema = z.object({
  text: z.string().min(1).max(200_000),
});
export type ResumeTextRequest = z.infer<typeof ResumeTextRequestSchema>;

export const ResumeResponseSchema = z.object({ profile: CandidateProfileSchema });
export type ResumeResponse = z.infer<typeof ResumeResponseSchema>;

export const MatchRequestSchema = z.object({
  profile: CandidateProfileSchema,
  jobIds: z.array(nonEmpty).max(500).optional(),
});
export type MatchRequest = z.infer<typeof MatchRequestSchema>;

export const MatchResponseSchema = z.object({ results: z.array(MatchResultSchema) });
export type MatchResponse = z.infer<typeof MatchResponseSchema>;

export const AgentsResponseSchema = z.object({ agents: z.array(AgentSummarySchema) });
export type AgentsResponse = z.infer<typeof AgentsResponseSchema>;

export const ChatRequestSchema = z.object({
  agent: nonEmpty,
  conversationId: nonEmpty.optional(),
  message: z.string().trim().min(1).max(20_000),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/** SSE events on /api/agents/chat. */
export const ChatEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("proposal"), id: nonEmpty }),
  z.object({ type: z.literal("done") }),
  z.object({ type: z.literal("error"), error: nonEmpty }),
]);
export type ChatEvent = z.infer<typeof ChatEventSchema>;

export const ProposalsQuerySchema = z.object({ status: ProposalStatusSchema.optional() });
export type ProposalsQuery = z.infer<typeof ProposalsQuerySchema>;

export const ProposalsResponseSchema = z.object({ proposals: z.array(ProposalSchema) });
export type ProposalsResponse = z.infer<typeof ProposalsResponseSchema>;

export const ApproveResponseSchema = z.object({
  commitSha: z.string().regex(/^[0-9a-f]{40}$/),
  commitUrl: z.url(),
});
export type ApproveResponse = z.infer<typeof ApproveResponseSchema>;

export const RejectRequestSchema = z.object({ reason: z.string().max(2_000).optional() });
export type RejectRequest = z.infer<typeof RejectRequestSchema>;

export const RejectResponseSchema = z.object({ status: z.literal("rejected") });
export type RejectResponse = z.infer<typeof RejectResponseSchema>;

/** Errors are `{ error: "<code>" }` only, e.g. "base_sha_changed". */
export const ErrorResponseSchema = z.object({ error: z.string().regex(/^[a-z0-9_]+$/) }).strict();
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
