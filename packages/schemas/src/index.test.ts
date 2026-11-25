import { describe, expect, it } from "vitest";
import {
  bandFor,
  ChatEventSchema,
  ErrorResponseSchema,
  JobSchema,
  MatchResultSchema,
  ProposalSchema,
} from "./index";

const sha = "a".repeat(40);

describe("schemas v1", () => {
  it("maps scores to bands at the edges", () => {
    expect(bandFor(80)).toBe("Strong");
    expect(bandFor(79.9)).toBe("Moderate");
    expect(bandFor(60)).toBe("Moderate");
    expect(bandFor(59)).toBe("Weak");
  });

  it("accepts a synthetic job", () => {
    const job = {
      id: "seed-1",
      title: "Staff Accountant",
      company: "Example Co",
      location: "Orlando, FL",
      remote: false,
      postedAt: "2026-11-20T12:00:00Z",
      url: "https://example.com/jobs/1",
      source: "seed",
      description: "Month-end close.",
      skills: ["GAAP"],
    };
    expect(JobSchema.parse(job)).toEqual(job);
  });

  it("rejects a band that does not match the score", () => {
    const base = {
      jobId: "seed-1",
      evidence: [],
      gaps: [{ skill: "CPA", importance: "required" }],
      explanation: "",
      recommendation: { action: "tailor", text: "Add CPA progress." },
    };
    expect(MatchResultSchema.safeParse({ ...base, score: 85, band: "Strong" }).success).toBe(true);
    expect(MatchResultSchema.safeParse({ ...base, score: 85, band: "Weak" }).success).toBe(false);
  });

  it("requires after unless a file is deleted", () => {
    const p = {
      id: "p1",
      agent: "software-architect",
      title: "Doc fix",
      rationale: "Typo",
      diff: "",
      baseSha: sha,
      status: "pending",
      requestedBy: "admin",
      createdAt: "2026-11-25T00:00:00Z",
    };
    expect(ProposalSchema.safeParse({ ...p, files: [{ path: "docs/x.md", action: "delete" }] }).success).toBe(true);
    expect(ProposalSchema.safeParse({ ...p, files: [{ path: "docs/x.md", action: "update" }] }).success).toBe(false);
    expect(ProposalSchema.safeParse({ ...p, status: "merged", files: [{ path: "a", action: "delete" }] }).success).toBe(false);
  });

  it("keeps errors to a code only", () => {
    expect(ErrorResponseSchema.safeParse({ error: "base_sha_changed" }).success).toBe(true);
    expect(ErrorResponseSchema.safeParse({ error: "x", stack: "..." }).success).toBe(false);
    expect(ChatEventSchema.safeParse({ type: "proposal", id: "p1" }).success).toBe(true);
  });
});
