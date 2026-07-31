/**
 * Outcome of running one refactoring on a source.
 *
 * TypeScript sibling of `com.javapatterns.mcp.refactor.RefactoringResult`.
 *
 * Fields:
 *   - `refactoringId` — which refactoring was applied.
 *   - `newSource`     — the rewritten source. Equal to the input when
 *                       `changed === false`.
 *   - `changed`       — true iff anything was actually rewritten.
 *                       Idempotency check: applying the same refactoring
 *                       twice makes `changed === false` on the second pass.
 *   - `changes`       — human-readable list of what changed (one entry
 *                       per modified site, with class name + line).
 */

import { type RefactoringId } from "./refactoringId.js";

export interface RefactoringResult {
  readonly refactoringId: RefactoringId;
  readonly newSource: string;
  readonly changed: boolean;
  readonly changes: readonly string[];
}
