/**
 * A single AST-level refactoring.
 *
 * TypeScript sibling of `com.javapatterns.mcp.refactor.PatternRefactoring`.
 *
 * Implementations should:
 *   1. Inspect the source file.
 *   2. Apply the smallest possible mutation that fixes the issue
 *      (do not reformat unrelated code).
 *   3. Be idempotent — running the same refactoring twice on the
 *      same source returns `changed === false` the second time.
 *   4. Return `sourceFile.getFullText()` — ts-morph's manipulation
 *      API preserves whitespace and comments where possible.
 */

import { type SourceFile } from "ts-morph";

import { type RefactoringId } from "./refactoringId.js";
import { type RefactoringResult } from "./refactoringResult.js";

export interface PatternRefactoring {
  /** Public identifier — the enum name used to look up by id. */
  readonly id: RefactoringId;

  /**
   * Apply the refactoring to a parsed source file.
   *
   * @param sourceFile a parsed TS source file, mutated in place.
   * @returns the refactoring result (newSource, changed, changes[]).
   */
  apply(sourceFile: SourceFile): RefactoringResult;
}
