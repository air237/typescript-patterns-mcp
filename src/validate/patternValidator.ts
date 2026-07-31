/**
 * Validates one pattern's implementation inside a parsed `SourceFile`.
 *
 * TypeScript sibling of `com.javapatterns.mcp.validate.PatternValidator`.
 *
 * A validator is stateless and side-effect free. It runs unconditionally
 * on every source (no gating on detector output), but must be selective
 * enough NOT to emit issues on unrelated classes — a validator should
 * only fire when the enclosing class LOOKS LIKE the target pattern
 * (i.e. carries at least one of that pattern's characteristic
 * structural signals). That "gate" is enforced by each validator; the
 * engine does not check it centrally.
 *
 * Returning `[]` means: "the implementation matches the rules this
 * validator encodes".
 */

import { type SourceFile } from "ts-morph";

import { type Pattern } from "../catalog/index.js";
import { type ValidationIssue } from "./validationIssue.js";

export interface PatternValidator {
  /** Which pattern this validator scrutinises. */
  readonly pattern: Pattern;

  /**
   * @param sourceFile a parsed TS source file. Never null.
   * @returns all issues found, in declaration order.
   */
  validate(sourceFile: SourceFile): readonly ValidationIssue[];
}
