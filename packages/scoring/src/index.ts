export { score, scoreDetailed, WEIGHTS } from "./score.ts";
export { skillGaps } from "./gaps.ts";
export { rankResults } from "./rank.ts";
export { extractRequirements } from "./requirements.ts";
export { indexTaxonomy, normalize, resolveTerm } from "./taxonomy.ts";
export { WEIGHTS_VERSION } from "./types.ts";
export type {
  Taxonomy, ScoreDetail, SubScore, Gate, MissingItem, SkillGapEntry, CriterionKey,
} from "./types.ts";
