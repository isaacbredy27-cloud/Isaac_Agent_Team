// Scoring contracts. Pure types; no I/O (CLAUDE.md: packages/scoring is pure).
import type { Job, MatchResult } from "../../schemas/src/index.ts";

export const WEIGHTS_VERSION = "D-1.1" as const;

export type Taxonomy = {
  version: number;
  skills: { id: string; label: string; aliases: string[]; related?: { id: string; weight: number }[] }[];
  titles: { id: string; label: string; aliases: string[]; family: string; seniority: number }[];
  certifications: { id: string; label: string; aliases: string[] }[];
  education: { id: string; label: string; level: number; aliases: string[] }[];
};

export type Importance = "required" | "preferred";
export type CriterionKey = "reqSkills" | "prefSkills" | "experience" | "education" | "certs" | "title";

export type SubScore = { value: number | null; weight: number; active: boolean };

export type Gate = {
  type: "clearance" | "license" | "degree";
  cap: number;
  /** Posting sentence that states the requirement (fairness-in-hiring: quote, never infer). */
  quote: string;
  passed: boolean;
  /** License gate only: candidate lists the cert as in progress. */
  inProgress?: boolean;
};

export type MissingItem = { id: string; label: string; kind: "skill" | "cert"; importance: Importance };

export type ScoreDetail = {
  result: MatchResult;
  rawScore: number;
  subScores: Record<CriterionKey, SubScore>;
  gates: Gate[];
  missing: MissingItem[];
  weightsVersion: typeof WEIGHTS_VERSION;
  taxonomyVersion: number;
};

export type SkillGapEntry = {
  gap: string;
  kind: "skill" | "cert";
  jobsMissing: number;
  /** Jobs that move up at least one band when the gap is closed (what-if re-score). */
  bandUpgrades: number;
  link: string | null;
};

export type JobLike = Pick<Job, "id" | "title" | "company" | "description" | "skills" | "postedAt">;
