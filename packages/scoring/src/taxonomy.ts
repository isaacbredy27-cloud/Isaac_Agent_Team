import type { Taxonomy } from "./types.ts";

/** NFKC, lowercase, drop apostrophes, other punctuation to spaces (skill: skill-taxonomy). */
export function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** True when `phrase` (already normalized) appears in `text` on word boundaries. */
export function containsPhrase(normText: string, phrase: string): boolean {
  return phrase.length > 0 && ` ${normText} `.includes(` ${phrase} `);
}

export type Resolved =
  | { kind: "skill"; id: string; label: string }
  | { kind: "cert"; id: string; label: string }
  | { kind: "unknown"; id: string; label: string };

export type TaxonomyIndex = {
  taxonomy: Taxonomy;
  skillAlias: Map<string, string>;
  certAlias: Map<string, string>;
  skillLabel: Map<string, string>;
  certLabel: Map<string, string>;
  related: Map<string, Map<string, number>>;
};

const cache = new WeakMap<Taxonomy, TaxonomyIndex>();

export function indexTaxonomy(t: Taxonomy): TaxonomyIndex {
  const hit = cache.get(t);
  if (hit) return hit;
  const skillAlias = new Map<string, string>();
  const certAlias = new Map<string, string>();
  const skillLabel = new Map<string, string>();
  const certLabel = new Map<string, string>();
  const related = new Map<string, Map<string, number>>();
  const edge = (a: string, b: string, w: number) => {
    const m = related.get(a) ?? new Map<string, number>();
    m.set(b, Math.max(m.get(b) ?? 0, w));
    related.set(a, m);
  };
  for (const s of t.skills) {
    skillLabel.set(s.id, s.label);
    for (const a of [s.id, s.label, ...s.aliases]) skillAlias.set(normalize(a), s.id);
    for (const r of s.related ?? []) {
      edge(s.id, r.id, r.weight);
      edge(r.id, s.id, r.weight); // symmetric
    }
  }
  for (const c of t.certifications) {
    certLabel.set(c.id, c.label);
    for (const a of [c.id, c.label, ...c.aliases]) certAlias.set(normalize(a), c.id);
  }
  const idx = { taxonomy: t, skillAlias, certAlias, skillLabel, certLabel, related };
  cache.set(t, idx);
  return idx;
}

export function resolveTerm(ix: TaxonomyIndex, term: string): Resolved {
  const n = normalize(term);
  const s = ix.skillAlias.get(n);
  if (s) return { kind: "skill", id: s, label: ix.skillLabel.get(s) ?? term };
  const c = ix.certAlias.get(n);
  if (c) return { kind: "cert", id: c, label: ix.certLabel.get(c) ?? term };
  return { kind: "unknown", id: `term:${n}`, label: term.trim() };
}

/** Related-edge weight between two skill ids, 0 when none. */
export function relatedWeight(ix: TaxonomyIndex, a: string, b: string): number {
  return ix.related.get(a)?.get(b) ?? 0;
}
