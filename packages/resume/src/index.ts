import type { CandidateProfile } from "../../schemas/src/index.ts";
import taxonomyJson from "../../../data/taxonomy/skills.v1.json" with { type: "json" };
import { extractResumeText } from "./extract.ts";
import { buildProfile, type Taxonomy } from "./profile.ts";

export * from "./extract.ts";
export * from "./profile.ts";

export type ParseInput = { bytes: Uint8Array } | { text: string };
export type ParseOptions = { taxonomy?: Taxonomy; asOf?: Date };

/** Resume bytes or text in, CandidateProfile out. Nothing is logged or stored (ADR 0004). */
export async function parseResume(input: ParseInput, opts: ParseOptions = {}): Promise<CandidateProfile> {
  const text = "text" in input ? input.text.normalize("NFKC") : (await extractResumeText(input.bytes)).text;
  return buildProfile(text, opts.taxonomy ?? (taxonomyJson as Taxonomy), opts.asOf);
}
