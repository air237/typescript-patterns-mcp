/**
 * Validates Decorator pattern implementations.
 *
 * Rules (all pinned to a concrete decorator class):
 *   - ERROR   — wrapped field is not `readonly`. Swapping the wrapped
 *               component mid-flight defeats the pattern.
 *   - ERROR   — decorator does not implement the same interface as the
 *               wrapped field's type. Callers cannot see the decorator
 *               as the same shape.
 *   - WARNING — a decorated method never calls `super.<method>(...)` or
 *               `this.<wrapped>.<method>(...)`; decorators must
 *               forward, otherwise they replace instead of decorate.
 *   - INFO    — decorator class' name does not follow the *Decorator
 *               naming convention (harder for readers and detectors).
 *
 * Gate: class holds an instance field whose type is an interface
 * declared in the same file AND the class also implements that same
 * interface. This is the Decorator "same-surface + wrap" invariant.
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import { instanceFields, startLine } from "./validatorHelpers.js";

export class DecoratorValidator implements PatternValidator {
  readonly pattern = "DECORATOR" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const interfaceNames = new Set(
      sourceFile.getInterfaces().map((i) => i.getName()),
    );

    for (const decorator of sourceFile.getClasses()) {
      const name = decorator.getName();
      if (name === undefined) continue;

      const line = startLine(decorator);
      const fields = instanceFields(decorator);

      const wrapped = fields.find((f) => {
        const t = f.getTypeNode()?.getText() ?? "";
        return interfaceNames.has(t);
      });
      if (wrapped === undefined) continue;
      const wrappedType = wrapped.getTypeNode()!.getText();

      const impls = decorator.getImplements().map((i) => i.getText());
      const sameSurface = impls.includes(wrappedType);
      if (!sameSurface) {
        // Not a Decorator shape (missing the "same surface" invariant).
        // Do not fire other rules — they'd be noise.
        continue;
      }

      // ─── ERROR: wrapped field not readonly ─────────────────────
      const isReadonly =
        wrapped.hasModifier?.(SyntaxKind.ReadonlyKeyword) === true;
      if (!isReadonly) {
        issues.push(
          validationIssue({
            pattern: "DECORATOR",
            className: name,
            line: startLine(wrapped),
            severity: "ERROR",
            issue: `Wrapped field '${wrapped.getName()}' of ${name} is not \`readonly\` — the wrapped component can be swapped mid-flight.`,
            suggestion:
              "Mark the wrapped field `readonly` (or make it a `readonly` constructor parameter property).",
          }),
        );
      }

      // ─── WARNING: a non-static method never forwards ───────────
      const wrappedName = wrapped.getName();
      const nonStaticMethods = decorator
        .getMethods()
        .filter((m) => !m.isStatic() && !m.hasModifier(SyntaxKind.PrivateKeyword));
      const forward = new RegExp(
        `super\\.\\w+\\s*\\(|this\\.${wrappedName}\\s*\\.\\s*\\w+\\s*\\(`,
      );
      const nonForwarding = nonStaticMethods.find(
        (m) => !forward.test(m.getBodyText() ?? ""),
      );
      if (nonForwarding !== undefined && nonStaticMethods.length > 0) {
        issues.push(
          validationIssue({
            pattern: "DECORATOR",
            className: name,
            line: startLine(nonForwarding),
            severity: "WARNING",
            issue: `Decorator method ${nonForwarding.getName()}() does not call \`super.*(...)\` nor \`this.${wrappedName}.*(...)\`. Decorators must forward, not replace.`,
            suggestion:
              "Start the method with the delegated call, then add your extra behaviour on top.",
          }),
        );
      }

      // ─── INFO: naming convention ───────────────────────────────
      if (!/Decorator$/.test(name)) {
        issues.push(
          validationIssue({
            pattern: "DECORATOR",
            className: name,
            line,
            severity: "INFO",
            issue: `${name} implements the Decorator shape but does not follow the *Decorator naming convention.`,
            suggestion:
              "Rename to `<Behaviour>Decorator` so detectors and reviewers can spot the intent at a glance.",
          }),
        );
      }
    }
    return issues;
  }
}
