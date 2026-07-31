/**
 * A single finding from validating a pattern instance.
 *
 * TypeScript sibling of `com.javapatterns.mcp.validate.ValidationIssue`.
 *
 * Fields:
 *   - `pattern`     — which pattern was being validated.
 *   - `className`   — the anchor class the issue is attached to.
 *   - `line`        — 1-based line number (-1 if unknown).
 *   - `severity`    — {@link Severity}.
 *   - `issue`       — short, one-sentence description of the problem.
 *   - `suggestion`  — actionable fix (may be empty string if no simple
 *                     one-liner exists).
 */

import { type Pattern } from "../catalog/index.js";
import { type Severity } from "./severity.js";

export interface ValidationIssue {
  readonly pattern: Pattern;
  readonly className: string;
  readonly line: number;
  readonly severity: Severity;
  readonly issue: string;
  readonly suggestion: string;
}

/**
 * Build a validated `ValidationIssue`. Non-blank `issue` and non-null
 * `suggestion` are guaranteed at construction time so a buggy validator
 * cannot silently emit corrupted issues.
 */
export function validationIssue(args: {
  pattern: Pattern;
  className: string;
  line: number;
  severity: Severity;
  issue: string;
  suggestion?: string;
}): ValidationIssue {
  if (args.issue.trim() === "") {
    throw new Error("ValidationIssue.issue must be non-blank");
  }
  return {
    pattern: args.pattern,
    className: args.className,
    line: args.line,
    severity: args.severity,
    issue: args.issue,
    suggestion: args.suggestion ?? "",
  };
}
