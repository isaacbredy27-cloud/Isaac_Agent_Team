// Server-only agent bundle (docs/agent-console.md §3). Importing the JSON makes esbuild bundle it
// into every agents-* / proposals-* function. Run `npm run build:manifest` before typecheck or dev.
import type { AgentSummary } from "../../../../packages/schemas/src/index";
import type { AgentBundle, BundledAgent } from "../../../../scripts/build-agent-manifest.mjs";
import raw from "./agents-bundle.json" with { type: "json" };

export type { BundledAgent };
const bundle = raw as unknown as AgentBundle;

export const listAgents = (): readonly BundledAgent[] => bundle.agents;

export function getAgent(name: string): BundledAgent | undefined {
  return bundle.agents.find((a) => a.name === name);
}

/** Public summary. Never includes systemPrompt. Extra fields (responsibilities, tools, persona) are display-only. */
export type ConsoleAgentSummary = AgentSummary & { persona: string; responsibilities: string[]; tools: string[] };

export function toSummary(a: BundledAgent): ConsoleAgentSummary {
  return {
    name: a.name,
    description: a.description,
    model: a.model,
    personality: a.personality,
    group: a.group,
    persona: a.persona,
    responsibilities: a.responsibilities,
    tools: ["read_file", "propose_change"],
    knowledge: a.knowledge,
  };
}
