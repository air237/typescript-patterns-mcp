/**
 * Shared helpers for the pattern-refactoring implementations.
 *
 * Re-exports the AST utilities used by the detect / validate sides so
 * every engine agrees on the "class field" abstraction
 * (PropertyDeclaration | ParameterDeclaration).
 */

import {
  SyntaxKind,
  type ParameterDeclaration,
  type PropertyDeclaration,
} from "ts-morph";

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

/**
 * Add the `readonly` modifier to a class field (either a
 * `PropertyDeclaration` or a `ParameterDeclaration` parameter property).
 *
 * Returns `true` iff the modifier was actually added (i.e. was not
 * present before). This lets the caller decide whether to count the
 * site as changed for the refactoring's `changes` list.
 *
 * Idempotent: no-op if `readonly` was already present.
 */
export function addReadonly(
  field: PropertyDeclaration | ParameterDeclaration,
): boolean {
  if (field.hasModifier(SyntaxKind.ReadonlyKeyword)) return false;
  field.toggleModifier("readonly", true);
  return true;
}
