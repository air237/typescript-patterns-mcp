export {
  PATTERNS,
  REFACTORING_GURU_BASE,
  patternInfo,
  patternFromKey,
  referenceUrl,
  type Pattern,
  type PatternInfo,
} from "./pattern.js";

export {
  PATTERN_CATEGORIES,
  categoryInfo,
  categoryFromKey,
  type PatternCategory,
  type PatternCategoryInfo,
} from "./patternCategory.js";

export { type PatternMetadata } from "./patternMetadata.js";

export {
  PatternRegistry,
  getPatternRegistry,
  _resetPatternRegistryForTests,
} from "./patternRegistry.js";
