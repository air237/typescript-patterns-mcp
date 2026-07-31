/**
 * Validates Composite pattern implementations.
 *
 * Rules (pinned to a class that owns a children collection of a
 * Component-shaped type):
 *   - ERROR   — children collection field is not `readonly`. Callers
 *               can replace the whole children array in one go.
 *   - ERROR   — the accessor returning children returns the LIVE
 *               internal array (not `[...children]` / `readonly T[]`).
 *               Callers can mutate the composite's internal state.
 *   - WARNING — the composite has no `add` / `remove` method AND no
 *               constructor accepts children — the composite is
 *               unpopulable, dead code.
 *   - INFO    — the children field is not `#private`. Composite
 *               strongly prefers `#children` to keep the collection
 *               unreachable from outside.
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import { instanceFields, startLine } from "./validatorHelpers.js";

export class CompositeValidator implements PatternValidator {
  readonly pattern = "COMPOSITE" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const composite of sourceFile.getClasses()) {
      const name = composite.getName();
      if (name === undefined) continue;

      const line = startLine(composite);

      // Find a candidate "children" field: array typed, of a locally-
      // declared interface / class type.
      const localTypeNames = new Set<string>([
        ...sourceFile.getInterfaces().map((i) => i.getName()),
        ...sourceFile.getClasses().map((c) => c.getName() ?? ""),
      ]);
      const childrenField = instanceFields(composite).find((f) => {
        const t = f.getTypeNode()?.getText() ?? "";
        // Foo[] or Array<Foo> or readonly Foo[] where Foo is local.
        const m = /^(?:readonly\s+)?(\w+)\s*\[\]$|^Array\s*<\s*(\w+)\s*>$/.exec(
          t.replace(/\s+/g, " ").trim(),
        );
        if (m === null) return false;
        const eltType = m[1] ?? m[2]!;
        return localTypeNames.has(eltType) && eltType !== name;
      });
      if (childrenField === undefined) continue;
      const fieldName = childrenField.getName();

      // ─── ERROR: children field not readonly ─────────────────────
      const isReadonly =
        childrenField.hasModifier?.(SyntaxKind.ReadonlyKeyword) === true;
      const isHashPrivate = fieldName.startsWith("#");
      // A `#field` is not readonly at the modifier level but is
      // structurally locked (no outside `.field = ...`). Treat it as
      // acceptable.
      if (!isReadonly && !isHashPrivate) {
        issues.push(
          validationIssue({
            pattern: "COMPOSITE",
            className: name,
            line: startLine(childrenField),
            severity: "ERROR",
            issue: `Composite ${name}'s children field '${fieldName}' is neither \`readonly\` nor \`#private\` — callers can replace the whole array.`,
            suggestion:
              "Mark the children field `readonly` (best: use an ES-private `#children` field).",
          }),
        );
      }

      // ─── ERROR: getter returns the live array ──────────────────
      const arrayGetter = composite.getMethods().find((m) => {
        const rt = m.getReturnTypeNode()?.getText() ?? "";
        if (!/\[\]|Array\s*<|^readonly\s+.*\[\]/.test(rt)) return false;
        const body = m.getBodyText() ?? "";
        // Live return of `this.<field>` with no snapshot.
        const returnsLive = new RegExp(
          `return\\s+this\\.${fieldName}\\s*;`,
        ).test(body);
        if (!returnsLive) return false;
        // A `readonly Foo[]` return type is a lie if the array is live
        // and callers can cast; but the intent (locked view) is right.
        // We only complain if the RT is NOT readonly-typed.
        return !/^readonly\s+/.test(rt);
      });
      if (arrayGetter !== undefined) {
        issues.push(
          validationIssue({
            pattern: "COMPOSITE",
            className: name,
            line: startLine(arrayGetter),
            severity: "ERROR",
            issue: `${arrayGetter.getName()}() returns \`this.${fieldName}\` directly — callers can push/splice the composite's internal state.`,
            suggestion:
              "Return a snapshot (`return [...this.${fieldName}];`) or type the return as `readonly Component[]`.",
          }),
        );
      }

      // ─── WARNING: composite is unpopulable ─────────────────────
      const hasAddOrRemove = composite
        .getMethods()
        .some((m) => /^(add|remove|append|push)[A-Z]?/.test(m.getName()));
      const ctorAcceptsChildren = composite.getConstructors().some((ctor) =>
        ctor.getParameters().some((p) => {
          const t = p.getTypeNode()?.getText() ?? "";
          return /\[\]|Array\s*</.test(t);
        }),
      );
      if (!hasAddOrRemove && !ctorAcceptsChildren) {
        issues.push(
          validationIssue({
            pattern: "COMPOSITE",
            className: name,
            line,
            severity: "WARNING",
            issue: `${name} has no add/remove method and no ctor accepts an initial children array — the composite is unpopulable.`,
            suggestion:
              "Add `add(child: Component): this` or accept `children: readonly Component[]` in the constructor.",
          }),
        );
      }

      // ─── INFO: children field is not #private ──────────────────
      if (!isHashPrivate) {
        issues.push(
          validationIssue({
            pattern: "COMPOSITE",
            className: name,
            line: startLine(childrenField),
            severity: "INFO",
            issue: `Composite children field '${fieldName}' is not an ES-private \`#field\`.`,
            suggestion:
              "Prefer `#children` for the strongest encapsulation — TS `private` is a compile-time check only.",
          }),
        );
      }
    }
    return issues;
  }
}
