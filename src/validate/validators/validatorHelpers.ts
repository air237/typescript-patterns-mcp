/**
 * Shared helpers for the pattern validators. Re-exports the AST utilities
 * from `src/detect/detectors/detectorHelpers.ts` so both engine sides
 * agree on how a "class field" is defined (which is a genuine gotcha in
 * TypeScript — see the comment on `instanceFields` for why).
 *
 * Kept as a thin re-export layer rather than a physical move so a future
 * change to the detect side automatically propagates here.
 */

export {
  escapeRegExp,
  instanceFields,
  isAbstractClass,
  isExported,
  isParameterProperty,
  newExpressionsOfClass,
  startLine,
  staticFields,
  typeMentionsClass,
  type Field,
} from "../../detect/detectors/detectorHelpers.js";
