/**
 * Validates Adapter pattern implementations.
 *
 * Rules:
 *   - ERROR   — adapter field is NOT `readonly`; the adaptee can be
 *               swapped mid-flight, defeating the wrapping contract.
 *   - ERROR   — adapter class does not `implements` any interface. An
 *               adapter without a target surface adapts nothing.
 *   - WARNING — adapter forwards to the adaptee but does no
 *               translation (identity forwarding). Either the client
 *               doesn't need the adapter, or the adaptee already
 *               satisfies the target interface.
 *   - INFO    — adapter has more than one adaptee field. Multi-way
 *               adapters usually indicate a Facade in disguise.
 *
 * Gate: name ends with `Adapter` AND has at least one instance field.
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import { instanceFields, startLine } from "./validatorHelpers.js";

export class AdapterValidator implements PatternValidator {
  readonly pattern = "ADAPTER" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const adapter of sourceFile.getClasses()) {
      const name = adapter.getName();
      if (name === undefined) continue;
      if (!name.endsWith("Adapter")) continue;

      const line = startLine(adapter);
      const fields = instanceFields(adapter);
      const nonHashFields = fields.filter((f) => !f.getName().startsWith("#"));
      if (nonHashFields.length === 0) continue;

      // Adaptee candidates: instance fields of a class/interface type
      // OTHER than the adapter itself.
      const adapteeFields = nonHashFields.filter((f) => {
        const t = f.getTypeNode()?.getText() ?? "";
        return t !== "" && t !== name;
      });
      if (adapteeFields.length === 0) continue;

      const primaryAdaptee = adapteeFields[0]!;

      // ─── ERROR: adaptee field is not readonly ──────────────────
      const isReadonly =
        primaryAdaptee.hasModifier?.(SyntaxKind.ReadonlyKeyword) === true;
      if (!isReadonly) {
        issues.push(
          validationIssue({
            pattern: "ADAPTER",
            className: name,
            line: startLine(primaryAdaptee),
            severity: "ERROR",
            issue: `Adaptee field '${primaryAdaptee.getName()}' of ${name} is not \`readonly\` — the wrapped instance can be swapped mid-flight.`,
            suggestion:
              "Mark the adaptee field `readonly` (or make it a `readonly` constructor parameter property).",
          }),
        );
      }

      // ─── ERROR: adapter does not implement any interface ───────
      if (adapter.getImplements().length === 0) {
        issues.push(
          validationIssue({
            pattern: "ADAPTER",
            className: name,
            line,
            severity: "ERROR",
            issue: `Adapter ${name} does not \`implements\` any interface — nothing tells clients what surface they get.`,
            suggestion:
              "Declare the target interface via `implements TargetSurface`.",
          }),
        );
      }

      // ─── WARNING: pure identity forwarding ─────────────────────
      // Every method body is exactly `return this.<adaptee>.<method>(<args>);`
      // with no other logic. If so, the adapter is redundant.
      const adapteeName = primaryAdaptee.getName();
      const trivial = new RegExp(
        `^\\s*return\\s+this\\.${adapteeName}\\.\\w+\\s*\\([^)]*\\)\\s*;?\\s*$`,
      );
      const methods = adapter
        .getMethods()
        .filter((m) => !m.isStatic() && !m.hasModifier(SyntaxKind.PrivateKeyword));
      if (methods.length > 0 && methods.every((m) => trivial.test(m.getBodyText() ?? ""))) {
        issues.push(
          validationIssue({
            pattern: "ADAPTER",
            className: name,
            line,
            severity: "WARNING",
            issue: `${name} forwards to \`this.${adapteeName}\` without any translation — the adapter may be redundant.`,
            suggestion:
              "If the adaptee already satisfies the target surface, expose it directly and delete the adapter.",
          }),
        );
      }

      // ─── INFO: multiple adaptee fields ─────────────────────────
      if (adapteeFields.length >= 2) {
        issues.push(
          validationIssue({
            pattern: "ADAPTER",
            className: name,
            line,
            severity: "INFO",
            issue: `${name} holds ${adapteeFields.length} distinct-typed instance fields. Multi-way adapters usually indicate a Facade.`,
            suggestion:
              "If the class combines multiple subsystems into one surface, rename to `<X>Facade`.",
          }),
        );
      }
    }
    return issues;
  }
}
