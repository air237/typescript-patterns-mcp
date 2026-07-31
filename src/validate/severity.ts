/**
 * Severity of a pattern-validation issue.
 *
 * TypeScript sibling of `com.javapatterns.mcp.validate.Severity`.
 *
 *   - `ERROR`   — implementation bug, not just style. Examples:
 *                 Singleton with a public constructor (anyone can `new` a
 *                 second instance), Adapter whose adaptee field is
 *                 reassignable at runtime.
 *   - `WARNING` — likely anti-pattern. Examples: Observer that iterates
 *                 the live subscriber list, Bridge whose implementor
 *                 field is not `readonly`.
 *   - `INFO`    — convention or stylistic suggestion. Examples: missing
 *                 `Object.freeze` on a Singleton instance, non-readonly
 *                 Builder field.
 */

export const SEVERITIES = ["ERROR", "WARNING", "INFO"] as const;
export type Severity = (typeof SEVERITIES)[number];

/** Total ordering: ERROR < WARNING < INFO. Used to sort issue lists. */
export function severityRank(s: Severity): number {
  return SEVERITIES.indexOf(s);
}
