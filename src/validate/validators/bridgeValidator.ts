/**
 * Validates Bridge pattern implementations.
 *
 * Rules (pinned to an abstract class that takes an interface-typed
 * constructor parameter — the "implementor slot"):
 *   - ERROR   — the implementor field is not `readonly`. Swapping it
 *               mid-flight defeats the composition-over-inheritance
 *               design.
 *   - WARNING — only ONE concrete abstraction OR only ONE concrete
 *               implementor exists in the file. Bridge exists to let
 *               BOTH sides vary independently; with only one on
 *               either axis, inheritance would suffice.
 *   - INFO    — the abstraction directly `new`s a concrete
 *               implementor (bypassing the injected slot). That is
 *               classic Bridge anti-code.
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import {
  instanceFields,
  isAbstractClass,
  startLine,
} from "./validatorHelpers.js";

export class BridgeValidator implements PatternValidator {
  readonly pattern = "BRIDGE" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const classes = sourceFile.getClasses();
    const interfaceNames = new Set(
      sourceFile.getInterfaces().map((i) => i.getName()),
    );

    for (const abstraction of classes) {
      const name = abstraction.getName();
      if (name === undefined || !isAbstractClass(abstraction)) continue;

      // Find the implementor slot — an interface-typed ctor param OR
      // an interface-typed instance field.
      let implementorType: string | null = null;
      let implementorField:
        | { name: string; line: number; readonly: boolean }
        | null = null;

      const ctor = abstraction.getConstructors()[0];
      if (ctor !== undefined) {
        for (const p of ctor.getParameters()) {
          const t = p.getTypeNode()?.getText() ?? "";
          if (interfaceNames.has(t)) {
            implementorType = t;
            const isReadonly =
              p.hasModifier?.(SyntaxKind.ReadonlyKeyword) === true;
            const isField =
              isReadonly ||
              p.hasModifier?.(SyntaxKind.PrivateKeyword) === true ||
              p.hasModifier?.(SyntaxKind.ProtectedKeyword) === true ||
              p.hasModifier?.(SyntaxKind.PublicKeyword) === true;
            if (isField) {
              implementorField = {
                name: p.getName(),
                line: startLine(p),
                readonly: isReadonly,
              };
            }
            break;
          }
        }
      }
      // Also inspect instance fields — parameter properties AND regular
      // fields alike. If we already found an interface-typed field via
      // ctor, this still lets us discover the paired assignment
      // (`this.impl = r`) into a non-readonly field.
      if (implementorField === null) {
        const f = instanceFields(abstraction).find((ff) => {
          const t = ff.getTypeNode()?.getText() ?? "";
          return interfaceNames.has(t);
        });
        if (f !== undefined) {
          if (implementorType === null) {
            implementorType = f.getTypeNode()!.getText();
          }
          implementorField = {
            name: f.getName(),
            line: startLine(f),
            readonly: f.hasModifier?.(SyntaxKind.ReadonlyKeyword) === true,
          };
        }
      }
      if (implementorType === null) continue;

      // ─── ERROR: implementor field not readonly ─────────────────
      if (implementorField !== null && !implementorField.readonly) {
        issues.push(
          validationIssue({
            pattern: "BRIDGE",
            className: name,
            line: implementorField.line,
            severity: "ERROR",
            issue: `Bridge slot '${implementorField.name}' of ${name} is not \`readonly\` — the implementor can be swapped after construction.`,
            suggestion:
              "Mark the constructor parameter `readonly` (parameter property) so the bridge is fixed at construction time.",
          }),
        );
      }

      // ─── WARNING: single-sided variability ────────────────────
      const concreteAbstractions = classes.filter(
        (c) => c.getExtends()?.getText() === name && !isAbstractClass(c),
      );
      const concreteImplementors = classes.filter((c) =>
        c.getImplements().some((i) => i.getText() === implementorType),
      );
      if (
        concreteAbstractions.length < 2 ||
        concreteImplementors.length < 2
      ) {
        issues.push(
          validationIssue({
            pattern: "BRIDGE",
            className: name,
            line: startLine(abstraction),
            severity: "WARNING",
            issue: `Bridge ${name} has ${concreteAbstractions.length} refined abstractions × ${concreteImplementors.length} concrete implementors — Bridge needs ≥2 on BOTH axes.`,
            suggestion:
              "Add a second refined abstraction / concrete implementor, or the pattern is unnecessary; plain inheritance would suffice.",
          }),
        );
      }

      // ─── INFO: abstraction directly `new`s an implementor ─────
      const bodyText = abstraction.getFullText();
      const bypassRe = new RegExp(
        "new\\s+(" +
          concreteImplementors
            .map((c) => c.getName() ?? "")
            .filter((n) => n !== "")
            .join("|") +
          ")\\s*\\(",
      );
      if (
        concreteImplementors.length > 0 &&
        concreteImplementors.some((c) => c.getName() !== undefined) &&
        bypassRe.test(bodyText)
      ) {
        issues.push(
          validationIssue({
            pattern: "BRIDGE",
            className: name,
            line: startLine(abstraction),
            severity: "INFO",
            issue: `${name} directly instantiates a concrete implementor, bypassing the injected slot.`,
            suggestion:
              "Never `new` an implementor inside the abstraction; the whole point of Bridge is that the caller decides.",
          }),
        );
      }
    }
    return issues;
  }
}
