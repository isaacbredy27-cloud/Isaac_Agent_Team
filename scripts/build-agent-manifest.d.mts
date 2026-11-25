export type BundledAgent = {
  name: string;
  description: string;
  model: string;
  personality: string;
  group: string;
  persona: string;
  tools: string[];
  skills: string[];
  responsibilities: string[];
  knowledge: { docs: string[]; examples: string[] };
  systemPrompt: string;
};
export type AgentBundle = { version: 1; agents: BundledAgent[] };

export const DEFAULT_MODEL: string;
export const MODEL_ALIASES: Record<string, string>;
export const PROMPT_CAP: number;
export const BUNDLE_PATH: string;
export function parseFrontmatter(text: string): { data: Record<string, string | string[]>; body: string };
export function splitTools(v: unknown): string[];
export function parseConsoleProfile(body: string): Record<string, string | string[]>;
export function parsePersona(body: string): string;
export function resolveModel(alias: unknown): string;
export function buildManifest(root?: string): AgentBundle;
export function writeBundle(manifest?: AgentBundle, out?: string): string;
